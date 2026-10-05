import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/status-badge";
import type { Order, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type LowStockRow = {
  id: string;
  size: string;
  color: string | null;
  stock: number;
  products: { name: string; slug: string; id: string } | null;
};

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [ordersResult, productCount, lowStockResult] = await Promise.all([
    admin.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("products").select("id", { count: "exact", head: true }),
    admin
      .from("product_variants")
      .select("id, size, color, stock, products(id, name, slug)")
      .lte("stock", 3)
      .order("stock")
      .limit(8)
      .returns<LowStockRow[]>(),
  ]);

  const orders = (ordersResult.data as Order[] | null) ?? [];
  const settled = orders.filter((o) => o.status === "paid" || o.status === "fulfilled");
  const revenue = settled.reduce((sum, order) => sum + order.total, 0);
  const awaiting = orders.filter((o) => o.status === "paid").length;

  const stats = [
    { label: "Revenue (paid)", value: formatMoney(revenue) },
    { label: "Orders placed", value: String(settled.length) },
    { label: "Awaiting dispatch", value: String(awaiting) },
    { label: "Products", value: String(productCount.count ?? 0) },
  ];

  const lowStock = lowStockResult.data ?? [];

  return (
    <div className="space-y-10">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface p-5">
            <dt className="eyebrow">{stat.label}</dt>
            <dd className="display mt-1.5 text-2xl font-bold tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-ink-muted hover:text-ink">
            All orders →
          </Link>
        </div>

        {orders.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-sm text-ink-muted">No orders yet.</p>
        ) : (
          <ul className="card mt-4 divide-y divide-line">
            {orders.slice(0, 6).map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-surface-sunken"
                >
                  <span className="font-medium">{order.order_number}</span>
                  <StatusBadge status={order.status as OrderStatus} />
                  <span className="text-sm text-ink-faint">{order.email}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatMoney(order.total, order.currency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-semibold">Running low</h2>
        {lowStock.length === 0 ? (
          <p className="card mt-4 p-8 text-center text-sm text-ink-muted">
            Every variant has more than three in stock.
          </p>
        ) : (
          <ul className="card mt-4 divide-y divide-line">
            {lowStock.map((variant) => (
              <li key={variant.id} className="flex items-center gap-3 px-5 py-3.5">
                <Link
                  href={variant.products ? `/admin/products/${variant.products.id}` : "/admin/products"}
                  className="font-medium hover:underline"
                >
                  {variant.products?.name ?? "Unknown product"}
                </Link>
                <span className="text-sm text-ink-faint">
                  {variant.color ? `${variant.color} / ${variant.size}` : variant.size}
                </span>
                <span
                  className={`ml-auto text-sm font-semibold tabular-nums ${
                    variant.stock === 0 ? "text-sale" : "text-ink"
                  }`}
                >
                  {variant.stock === 0 ? "Sold out" : `${variant.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
