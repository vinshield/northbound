import Image from "next/image";
import Link from "next/link";

import { formatMoney } from "@/lib/money";
import { totalStock } from "@/lib/catalog";
import type { ProductWithVariants } from "@/lib/types";

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const image = product.images?.[0];
  const stock = totalStock(product);
  const onSale = product.compare_at != null && product.compare_at > product.price;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-4/5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-sunken">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            No image
          </div>
        )}

        {stock === 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-semibold text-white">
            Sold out
          </span>
        )}
        {stock > 0 && onSale && (
          <span className="absolute left-3 top-3 rounded-full bg-sale px-2.5 py-1 text-[11px] font-semibold text-white">
            Sale
          </span>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-medium leading-snug text-ink">{product.name}</h3>
        <div className="shrink-0 text-right">
          <span className="text-[15px] font-semibold tabular-nums">
            {formatMoney(product.price)}
          </span>
          {onSale && (
            <span className="ml-2 text-[13px] text-ink-faint line-through tabular-nums">
              {formatMoney(product.compare_at!)}
            </span>
          )}
        </div>
      </div>
      {product.categories && (
        <p className="mt-0.5 text-[13px] text-ink-faint">{product.categories.name}</p>
      )}
    </Link>
  );
}
