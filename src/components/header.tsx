"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { Category } from "@/lib/types";
import type { SessionUser } from "@/lib/auth";

function CartCount() {
  // Rendered only on the client, so the badge never mismatches during hydration.
  const { count, ready } = useCart();
  if (!ready || count === 0) return null;
  return (
    <span
      aria-hidden
      className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function CartLink({ onNavigate }: { onNavigate?: () => void }) {
  const { count, ready } = useCart();
  return (
    <Link
      href="/cart"
      onClick={onNavigate}
      className="relative inline-flex items-center gap-2 text-sm font-medium text-ink hover:opacity-70"
      aria-label={ready && count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 7h12l-1 13H7L6 7Zm3 0V5a3 3 0 0 1 6 0v2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="hidden sm:inline">Cart</span>
      <CartCount />
    </Link>
  );
}

export function Header({
  categories,
  user,
}: {
  categories: Category[];
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: "All" },
    ...categories.map((c) => ({ href: `/products?category=${c.slug}`, label: c.name })),
  ];

  const close = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <button
          type="button"
          className="-ml-2 p-2 md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            {menuOpen ? (
              <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <Link href="/" className="display text-xl font-bold tracking-tight" onClick={close}>
          Northbound
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Catalog">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-5">
          {user ? (
            <div className="hidden items-center gap-5 sm:flex">
              {user.isAdmin && (
                <Link href="/admin" className="text-sm text-ink-muted hover:text-ink">
                  Admin
                </Link>
              )}
              <Link href="/orders" className="text-sm text-ink-muted hover:text-ink">
                Orders
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-sm text-ink-muted hover:text-ink">
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="hidden text-sm text-ink-muted hover:text-ink sm:inline"
            >
              Sign in
            </Link>
          )}
          <CartLink />
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-line bg-surface px-5 py-4 md:hidden" aria-label="Catalog">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="block py-2 text-[15px] text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-line pt-3">
            {user ? (
              <>
                {user.isAdmin && (
                  <Link href="/admin" onClick={close} className="block py-2 text-[15px] text-ink">
                    Admin
                  </Link>
                )}
                <Link href="/orders" onClick={close} className="block py-2 text-[15px] text-ink">
                  Your orders
                </Link>
                <form action="/auth/signout" method="post">
                  <button type="submit" className="block py-2 text-[15px] text-ink">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/login" onClick={close} className="block py-2 text-[15px] text-ink">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
