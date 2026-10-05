import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import type { Order, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "paid", label: "To dispatch" },
  { value: "fulfilled", label: "Shipped" },
  { value: "pending", label: "Unpaid" },
  { value: "failed", label: "Failed" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = FILTERS.some((f) => f.value === status) ? status! : "all";

  const admin = createAdminClient();
  let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(100);
  if (activeFilter !== "all") query = query.eq("status", activeFilter);

  const { data } = await query;
  const orders = (data as Order[] | null) ?? [];

  return (
    <div>
      <nav className="flex flex-wrap gap-2" aria-label="Filter orders">
        {FILTERS.map((filter) => {
          const active = filter.value === activeFilter;
          return (
            <Link
              key={filter.value}
              href={filter.value === "all" ? "/admin/orders" : `/admin/orders?status=${filter.value}`}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full bg-ink px-3.5 py-1.5 text-sm font-medium text-white"
                  : "rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-sm text-ink-muted hover:border-ink hover:text-ink"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="card mt-5 p-10 text-center text-sm text-ink-muted">
          No orders match this filter.
        </p>
      ) : (
        <ul className="card mt-5 divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 hover:bg-surface-sunken"
              >
                <span className="font-medium">{order.order_number}</span>
                <StatusBadge status={order.status as OrderStatus} />
                <span className="text-sm text-ink-faint">{order.email}</span>
                <span className="text-sm text-ink-faint">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="ml-auto font-medium tabular-nums">
                  {formatMoney(order.total, order.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
