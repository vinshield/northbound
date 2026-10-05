import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation } from "@/lib/mailgun";
import type { OrderWithItems } from "@/lib/types";

const ORDER_SELECT = "*, order_items(*)";

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle();
  return (data as OrderWithItems | null) ?? null;
}

export async function getOrderByReference(reference: string): Promise<OrderWithItems | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select(ORDER_SELECT)
    .eq("paystack_reference", reference)
    .maybeSingle();
  return (data as OrderWithItems | null) ?? null;
}

export type SettleOutcome = {
  order: OrderWithItems | null;
  /** True only on the call that actually flipped pending -> paid. */
  newlyPaid: boolean;
  emailSent: boolean;
  emailError?: string;
};

/**
 * Marks an order paid, draws down stock, and emails the customer.
 *
 * Both the Paystack webhook and the browser callback call this, and either
 * may arrive first. mark_order_paid() is an atomic conditional update that
 * returns true for exactly one caller, so the confirmation email is sent
 * once and only once even if both fire simultaneously.
 */
export async function settlePaidOrder(orderId: string, reference: string): Promise<SettleOutcome> {
  const admin = createAdminClient();

  const { data: didTransition, error } = await admin.rpc("mark_order_paid", {
    p_order_id: orderId,
    p_reference: reference,
  });

  if (error) throw new Error(`Could not settle order: ${error.message}`);

  const order = await getOrderById(orderId);
  if (!didTransition || !order) {
    return { order, newlyPaid: false, emailSent: false };
  }

  try {
    await sendOrderConfirmation(order);
    await admin
      .from("orders")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", orderId);
    return { order, newlyPaid: true, emailSent: true };
  } catch (cause) {
    // A failed email must never fail the payment: the money has moved and the
    // order is real. Log it and let the admin resend from the order page.
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error(`[orders] confirmation email failed for ${order.order_number}:`, message);
    return { order, newlyPaid: true, emailSent: false, emailError: message };
  }
}

/** Marks a pending order as failed (abandoned or declined at Paystack). */
export async function markOrderFailed(orderId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
}
