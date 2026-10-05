import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getSessionUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import type { OrderWithItems } from "@/lib/types";

export const metadata: Metadata = { title: "Your orders" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/orders");

  const admin = createAdminClient();

  let query = admin.from("orders").select("*, order_items(*)");

  // Guests who later sign in with the same address still see their history.
  // PostgREST's `or` filter is comma-delimited, so only use the email branch
  // when the address is present and cannot corrupt the expression.
  const emailIsSafe = user.email.length > 0 && !/[,()]/.test(user.email);
  query = emailIsSafe
    ? query.or(`user_id.eq.${user.id},email.eq.${user.email}`)
    : query.eq("user_id", user.id);

  const { data } = await query.order("created_at", { ascending: false });

  const orders = (data as OrderWithItems[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="display text-4xl font-bold tracking-tight">Your orders</h1>

      {orders.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-ink-muted">You have not placed an order yet.</p>
          <Link href="/products" className="btn btn-primary mt-5">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-sunken px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{order.order_number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-sm text-ink-faint">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <ul className="divide-y divide-line">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-[15px] font-medium">{item.product_name}</p>
                      <p className="mt-0.5 text-sm text-ink-faint">
                        {item.variant_label} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {formatMoney(item.unit_price * item.quantity, order.currency)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-line px-5 py-3.5">
                <span className="text-sm text-ink-muted">
                  {order.shipping_fee === 0
                    ? "Free delivery"
                    : `Includes ${formatMoney(order.shipping_fee, order.currency)} delivery`}
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(order.total, order.currency)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
