"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products", exact: false },
  { href: "/admin/orders", label: "Orders", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-7 flex gap-1 border-b border-line" aria-label="Admin sections">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={[
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-ink text-ink"
                : "border-transparent text-ink-faint hover:text-ink",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
