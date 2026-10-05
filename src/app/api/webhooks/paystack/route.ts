import { NextResponse } from "next/server";

import { isValidWebhookSignature } from "@/lib/paystack";
import { getOrderById, getOrderByReference, settlePaidOrder } from "@/lib/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PaystackEvent = {
  event: string;
  data: {
    reference?: string;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: { order_id?: string } | null;
  };
};

/**
 * Paystack webhook receiver.
 *
 * This is the authoritative settlement path - the browser callback is only a
 * convenience, since a customer can close the tab before being redirected.
 * Always returns 200 for anything we have successfully reasoned about, so
 * Paystack does not retry events that are simply not relevant to us.
 */
export async function POST(request: Request) {
  // The signature covers the exact bytes sent, so read the body as raw text
  // and parse only after the HMAC checks out.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!isValidWebhookSignature(rawBody, signature)) {
    console.warn("[paystack] rejected webhook with bad signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  if (event.event !== "charge.success" || event.data?.status !== "success") {
    return NextResponse.json({ received: true, ignored: event.event });
  }

  const reference = event.data.reference;
  const orderId = event.data.metadata?.order_id;

  const order = orderId
    ? await getOrderById(orderId)
    : reference
      ? await getOrderByReference(reference)
      : null;

  if (!order) {
    console.warn(`[paystack] no order for reference ${reference ?? "(none)"}`);
    return NextResponse.json({ received: true, ignored: "unknown order" });
  }

  // Never trust the amount in the payload over our own record. A mismatch
  // means something is wrong; flag it loudly rather than fulfilling silently.
  if (typeof event.data.amount === "number" && event.data.amount !== order.total) {
    console.error(
      `[paystack] amount mismatch on ${order.order_number}: charged ${event.data.amount}, expected ${order.total}`,
    );
    return NextResponse.json({ received: true, ignored: "amount mismatch" });
  }

  try {
    const result = await settlePaidOrder(order.id, reference ?? order.paystack_reference ?? "");
    return NextResponse.json({
      received: true,
      order: order.order_number,
      newlyPaid: result.newlyPaid,
      emailSent: result.emailSent,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[paystack] settlement failed for ${order.order_number}:`, message);
    // 500 asks Paystack to retry, which is what we want for a transient fault.
    return NextResponse.json({ error: "Settlement failed" }, { status: 500 });
  }
}
