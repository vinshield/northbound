import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { getProductBySlug, getProducts, isConfigured } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { freeShippingThreshold } from "@/lib/env";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description.slice(0, 160),
      images: product.images?.[0] ? [product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  if (!isConfigured()) notFound();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = (
    await getProducts({ category: product.categories?.slug, limit: 5 })
  ).filter((p) => p.id !== product.id).slice(0, 4);

  const onSale = product.compare_at != null && product.compare_at > product.price;

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <nav className="text-sm text-ink-faint" aria-label="Breadcrumb">
        <Link href="/products" className="hover:text-ink">
          Shop
        </Link>
        {product.categories && (
          <>
            <span className="mx-2">/</span>
            <Link href={`/products?category=${product.categories.slug}`} className="hover:text-ink">
              {product.categories.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-ink-muted">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-sunken">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-faint">
                No image
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((src) => (
                <div
                  key={src}
                  className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-sunken"
                >
                  <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:pt-2">
          {product.categories && <p className="eyebrow">{product.categories.name}</p>}
          <h1 className="display mt-2 text-4xl font-bold leading-tight tracking-tight">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold tabular-nums">
              {formatMoney(product.price)}
            </span>
            {onSale && (
              <>
                <span className="text-lg text-ink-faint line-through tabular-nums">
                  {formatMoney(product.compare_at!)}
                </span>
                <span className="rounded-full bg-sale/10 px-2.5 py-1 text-xs font-semibold text-sale">
                  Save {formatMoney(product.compare_at! - product.price)}
                </span>
              </>
            )}
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-ink-muted">{product.description}</p>

          <div className="mt-8">
            <AddToCart product={product} />
          </div>

          <ul className="mt-8 space-y-2.5 border-t border-line pt-6 text-sm text-ink-muted">
            <li className="flex gap-2.5">
              <span aria-hidden>◦</span>
              Free delivery on orders over {formatMoney(freeShippingThreshold())}
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden>◦</span>
              30-day returns on unworn pieces with tags attached
            </li>
            <li className="flex gap-2.5">
              <span aria-hidden>◦</span>
              Secure card payment handled by Paystack
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20 border-t border-line pt-14">
          <h2 className="display text-2xl font-bold tracking-tight">You might also like</h2>
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
