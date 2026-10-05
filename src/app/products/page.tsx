import Link from "next/link";
import type { Metadata } from "next";

import { ProductCard } from "@/components/product-card";
import { SetupNotice } from "@/components/setup-notice";
import { getCategories, getProducts, isConfigured } from "@/lib/catalog";

export const metadata: Metadata = { title: "Shop" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  if (!isConfigured()) return <SetupNotice />;

  const { category } = await searchParams;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProducts({ category }),
  ]);

  const active = categories.find((c) => c.slug === category);

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <header>
        <p className="eyebrow">{products.length} piece{products.length === 1 ? "" : "s"}</p>
        <h1 className="display mt-1.5 text-4xl font-bold tracking-tight">
          {active ? active.name : "Everything"}
        </h1>
      </header>

      <nav className="mt-7 flex flex-wrap gap-2" aria-label="Filter by category">
        <FilterPill href="/products" label="All" active={!category} />
        {categories.map((c) => (
          <FilterPill
            key={c.id}
            href={`/products?category=${c.slug}`}
            label={c.name}
            active={category === c.slug}
          />
        ))}
      </nav>

      {products.length === 0 ? (
        <p className="mt-16 text-center text-ink-muted">
          Nothing here yet.{" "}
          <Link href="/products" className="underline hover:text-ink">
            Browse everything
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
          : "rounded-full border border-line-strong bg-surface px-4 py-2 text-sm text-ink-muted transition-colors hover:border-ink hover:text-ink"
      }
    >
      {label}
    </Link>
  );
}
