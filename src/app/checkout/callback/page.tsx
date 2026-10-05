import Link from "next/link";
import type { Metadata } from "next";

import { ClearCartOnMount } from "@/components/clear-cart-on-mount";
import { verifyTransaction } from "@/lib/paystack";
import { getOrderByReference, markOrderFailed, settlePaidOrder } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import type { OrderWithItems } from "@/lib/types";

export const metadata: Metadata = { title: "Order confirmation" };
export const dynamic = "force-dynamic";

type Outcome =
  | { kind: "paid"; order: OrderWithItems; emailSent: boolean }
  | { kind: "pending"; order: OrderWithItems }
  | { kind: "failed"; reason: string };

/**
 * Where Paystack returns the customer after payment.
 *
 * This verifies server-side rather than trusting the redirect, then settles
 * the order. The webhook does the same thing independently, so an order is
 * still fulfilled even if the customer closes the tab here.
 */
async function resolveOutcome(reference: string | undefined): Promise<Outcome> {
  if (!reference) {
    return { kind: "failed", reason: "We did not receive a payment reference." };
  }

  const order = await getOrderByReference(reference);
  if (!order) {
    return { kind: "failed", reason: "We could not find an order for this payment." };
  }

  // Already settled by the webhook - nothing left to do.
  if (order.status === "paid" || order.status === "fulfilled") {
    return { kind: "paid", order, emailSent: Boolean(order.confirmation_sent_at) };
  }

  try {
    const transaction = await verifyTransaction(reference);

    if (transaction.status !== "success") {
      await markOrderFailed(order.id);
      return {
        kind: "failed",
        reason:
          transaction.status === "abandoned"
            ? "The payment was not completed. Your cart is still here if you want to try again."
            : "The payment did not go through. No money has left your account.",
      };
    }

    if (transaction.amount !== order.total) {
      console.error(
        `[callback] amount mismatch on ${order.order_number}: paid ${transaction.amount}, expected ${order.total}`,
      );
      return {
        kind: "pending",
        order,
      };
    }

    const result = await settlePaidOrder(order.id, reference);
    return {
      kind: "paid",
      order: result.order ?? order,
      emailSent: result.newlyPaid ? result.emailSent : Boolean(order.confirmation_sent_at),
    };
  } catch (cause) {
    console.error("[callback] verification failed:", cause);
    // Verification is down, but the webhook will still settle this order.
    return { kind: "pending", order };
  }
}

export default async function CheckoutCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const outcome = await resolveOutcome(reference ?? trxref);

  if (outcome.kind === "failed") {
    return (
      <Shell title="Payment not completed" tone="warn">
        <p className="mt-3 text-ink-muted">{outcome.reason}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/checkout" className="btn btn-primary">
            Try again
          </Link>
          <Link href="/products" className="btn btn-secondary">
            Back to shop
          </Link>
        </div>
      </Shell>
    );
  }

  if (outcome.kind === "pending") {
    return (
      <Shell title="We are confirming your payment" tone="warn">
        <p className="mt-3 text-ink-muted">
          Order <strong className="text-ink">{outcome.order.order_number}</strong> is being
          verified. This usually takes a few seconds — refresh this page, or check your email for
          the confirmation.
        </p>
        <div className="mt-7 flex justify-center">
          <Link href="/orders" className="btn btn-secondary">
            View your orders
          </Link>
        </div>
      </Shell>
    );
  }

  const { order, emailSent } = outcome;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      {/* Payment succeeded, so the cart has served its purpose. */}
      <ClearCartOnMount />

      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m5 13 4.5 4.5L19 7"
              stroke="var(--color-success)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="display mt-5 text-3xl font-bold tracking-tight">Thank you — order placed</h1>
        <p className="mt-3 text-ink-muted">
          Order <strong className="text-ink">{order.order_number}</strong>.{" "}
          {emailSent
            ? `A confirmation is on its way to ${order.email}.`
            : "We could not send the confirmation email, but your order is safe and being prepared."}
        </p>
      </div>

      <div className="card mt-9 overflow-hidden">
        <ul className="divide-y divide-line">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 p-5">
              <div>
                <p className="font-medium">{item.product_name}</p>
                <p className="mt-0.5 text-sm text-ink-faint">
                  {item.variant_label} · Qty {item.quantity}
                </p>
              </div>
              <span className="font-medium tabular-nums">
                {formatMoney(item.unit_price * item.quantity, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2.5 border-t border-line bg-surface-sunken p-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="tabular-nums">
              {order.shipping_fee === 0 ? "Free" : formatMoney(order.shipping_fee, order.currency)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold">
            <dt>Total paid</dt>
            <dd className="tabular-nums">{formatMoney(order.total, order.currency)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="btn btn-primary">
          Keep shopping
        </Link>
        <Link href="/orders" className="btn btn-secondary">
          Your orders
        </Link>
      </div>
    </div>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  tone: "warn";
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="display text-3xl font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}
