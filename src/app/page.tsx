import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { SetupNotice } from "@/components/setup-notice";
import { getProducts, isConfigured } from "@/lib/catalog";

export default async function HomePage() {
  if (!isConfigured()) return <SetupNotice />;

  const featured = await getProducts({ featuredOnly: true, limit: 4 });
  const latest = await getProducts({ limit: 8 });

  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div>
            <p className="eyebrow">Autumn / Winter</p>
            <h1 className="display mt-4 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
              Clothes that get
              <br />
              better with wear.
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-muted">
              Oxford cloth that softens. Waxed cotton that takes on your creases. Merino that holds
              its shape. Made in small runs, in natural fibres, without the markup.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn btn-primary">
                Shop everything
              </Link>
              <Link href="/products?category=outerwear" className="btn btn-secondary">
                New outerwear
              </Link>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line">
            {[
              { k: "Natural fibres", v: "100%" },
              { k: "Returns window", v: "30 days" },
              { k: "Small-run pieces", v: "Limited" },
              { k: "Secure checkout", v: "Paystack" },
            ].map((stat) => (
              <div key={stat.k} className="bg-surface p-6">
                <dt className="eyebrow">{stat.k}</dt>
                <dd className="display mt-1.5 text-2xl font-bold">{stat.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Featured</p>
              <h2 className="display mt-1.5 text-3xl font-bold tracking-tight">This season</h2>
            </div>
            <Link href="/products" className="text-sm font-medium text-ink-muted hover:text-ink">
              View all →
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-8">
          <div className="border-t border-line pt-16">
            <p className="eyebrow">The full range</p>
            <h2 className="display mt-1.5 text-3xl font-bold tracking-tight">Everything in stock</h2>
            <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
              {latest.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {featured.length === 0 && latest.length === 0 && (
        <section className="mx-auto max-w-2xl px-5 py-24 text-center">
          <h2 className="display text-2xl font-bold">No products yet</h2>
          <p className="mt-3 text-ink-muted">
            Run <code className="rounded bg-surface px-1.5 py-0.5 text-sm">supabase/seed.sql</code>{" "}
            to load the demo catalog, or add your first product in the admin area.
          </p>
          <Link href="/admin/products/new" className="btn btn-primary mt-6">
            Add a product
          </Link>
        </section>
      )}
    </>
  );
}
