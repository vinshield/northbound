import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  pending:   { label: "Awaiting payment", className: "bg-amber-100 text-amber-900" },
  paid:      { label: "Paid",             className: "bg-emerald-100 text-emerald-900" },
  fulfilled: { label: "Shipped",          className: "bg-sky-100 text-sky-900" },
  cancelled: { label: "Cancelled",        className: "bg-stone-200 text-stone-700" },
  failed:    { label: "Payment failed",   className: "bg-red-100 text-red-900" },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const style = STYLES[status] ?? STYLES.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
