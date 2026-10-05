import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import { RegisterServiceWorker } from "@/components/register-sw";
import { getCategories } from "@/lib/catalog";
import { getSessionUser } from "@/lib/auth";
import { publicEnv, siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${publicEnv.storeName} — Menswear built to last`,
    template: `%s · ${publicEnv.storeName}`,
  },
  description:
    "Considered menswear in natural fibres: oxford shirts, merino knitwear, waxed cotton outerwear and selvedge denim.",
  openGraph: {
    title: `${publicEnv.storeName} — Menswear built to last`,
    description: "Considered menswear in natural fibres.",
    type: "website",
  },
  // Installed-app presentation (home screen icon, iOS standalone mode).
  appleWebApp: {
    capable: true,
    title: publicEnv.storeName,
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1814",
  width: "device-width",
  initialScale: 1,
  // Lets the layout run under the Android status bar in the installed app.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both of these tolerate an unconfigured Supabase so the app still renders
  // its setup notice on a fresh clone.
  const [categories, user] = await Promise.all([getCategories(), getSessionUser().catch(() => null)]);

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <CartProvider>
          <RegisterServiceWorker />
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
          >
            Skip to content
          </a>

          <Header categories={categories} user={user} />

          <main id="main" className="min-h-[70vh]">
            {children}
          </main>

          <footer className="mt-24 border-t border-line bg-surface">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="display text-lg font-bold">{publicEnv.storeName}</div>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
                  Menswear in natural fibres, made in small runs and meant to outlast the season.
                </p>
              </div>
              <div>
                <h2 className="eyebrow">Shop</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                  {categories.slice(0, 5).map((category) => (
                    <li key={category.id}>
                      <Link href={`/products?category=${category.slug}`} className="hover:text-ink">
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="eyebrow">Account</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                  <li>
                    <Link href="/orders" className="hover:text-ink">
                      Your orders
                    </Link>
                  </li>
                  <li>
                    <Link href="/cart" className="hover:text-ink">
                      Cart
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="eyebrow">Help</h2>
                <ul className="mt-3 space-y-2 text-sm text-ink-muted">
                  <li>Free delivery over the threshold</li>
                  <li>30-day returns, unworn</li>
                  <li>Secure payment via Paystack</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-line">
              <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-ink-faint">
                © {new Date().getFullYear()} {publicEnv.storeName}. All rights reserved.
              </div>
            </div>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
