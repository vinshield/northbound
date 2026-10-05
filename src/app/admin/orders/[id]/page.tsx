import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderById } from "@/lib/orders";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import { OrderActions } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const address = order.shipping_address;

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-ink-muted hover:text-ink">
        ← Orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="display text-2xl font-bold tracking-tight">{order.order_number}</h2>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-ink-faint">
        Placed {new Date(order.created_at).toLocaleString()}
        {order.paid_at && ` · paid ${new Date(order.paid_at).toLocaleString()}`}
      </p>

      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-6">
          <section className="card overflow-hidden">
            <h3 className="border-b border-line bg-surface-sunken px-5 py-3 text-sm font-semibold">
              Items
            </h3>
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <p className="mt-0.5 text-sm text-ink-faint">
                      {item.variant_label} · Qty {item.quantity} ·{" "}
                      {formatMoney(item.unit_price, order.currency)} each
                    </p>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatMoney(item.unit_price * item.quantity, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line bg-surface-sunken px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="tabular-nums">
                  {order.shipping_fee === 0
                    ? "Free"
                    : formatMoney(order.shipping_fee, order.currency)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(order.total, order.currency)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h3 className="text-sm font-semibold">Deliver to</h3>
            <address className="mt-3 text-sm not-italic leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">{address.full_name}</span>
              <br />
              {address.line1}
              <br />
              {address.line2 && (
                <>
                  {address.line2}
                  <br />
                </>
              )}
              {address.city}, {address.state} {address.postal_code}
              <br />
              {address.country}
              <br />
              {address.phone}
            </address>
            {address.notes && (
              <p className="mt-4 rounded-lg bg-surface-sunken p-3 text-sm text-ink-muted">
                <span className="font-medium text-ink">Note:</span> {address.notes}
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h3 className="text-sm font-semibold">Customer</h3>
            <p className="mt-2 text-sm text-ink-muted">{order.email}</p>
            <p className="mt-1 text-[13px] text-ink-faint">
              {order.user_id ? "Signed-in account" : "Guest checkout"}
            </p>
            <p className="mt-3 break-all text-[12px] text-ink-faint">
              Paystack ref: {order.paystack_reference ?? "—"}
            </p>
            <p className="mt-1 text-[12px] text-ink-faint">
              Confirmation email:{" "}
              {order.confirmation_sent_at
                ? new Date(order.confirmation_sent_at).toLocaleString()
                : "not sent"}
            </p>
          </section>

          <OrderActions orderId={order.id} status={order.status} />
        </aside>
      </div>
    </div>
  );
}
