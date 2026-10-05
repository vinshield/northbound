"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/money";
import { variantLabel, type ProductWithVariants } from "@/lib/types";

export function AddToCart({ product }: { product: ProductWithVariants }) {
  const { add } = useCart();
  const variants = product.product_variants ?? [];

  const colors = useMemo(() => {
    const seen = new Set<string>();
    for (const v of variants) if (v.color) seen.add(v.color);
    return [...seen];
  }, [variants]);

  // Start on the first colour that actually has stock, so the default
  // selection is usually buyable.
  const [color, setColor] = useState<string | null>(() => {
    if (colors.length === 0) return null;
    const inStock = variants.find((v) => v.color && v.stock > 0);
    return inStock?.color ?? colors[0];
  });

  const sizesForColor = useMemo(
    () => variants.filter((v) => (colors.length === 0 ? true : v.color === color)),
    [variants, colors.length, color],
  );

  const [variantId, setVariantId] = useState<string | null>(
    () => sizesForColor.find((v) => v.stock > 0)?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === variantId) ?? null;
  const soldOut = variants.every((v) => v.stock === 0);

  function chooseColor(next: string) {
    setColor(next);
    setAdded(false);
    // Carry the chosen size across to the new colour when it exists there.
    const currentSize = selected?.size;
    const candidates = variants.filter((v) => v.color === next);
    const sameSize = candidates.find((v) => v.size === currentSize && v.stock > 0);
    const firstAvailable = candidates.find((v) => v.stock > 0);
    setVariantId((sameSize ?? firstAvailable ?? candidates[0])?.id ?? null);
    setQuantity(1);
  }

  function chooseSize(id: string) {
    setVariantId(id);
    setAdded(false);
    setQuantity(1);
  }

  function handleAdd() {
    if (!selected || selected.stock === 0) return;
    add(
      {
        variantId: selected.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variantLabel(selected),
        image: product.images?.[0] ?? null,
        price: product.price,
        maxStock: selected.stock,
      },
      quantity,
    );
    setAdded(true);
  }

  if (soldOut) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-surface-sunken p-5">
        <p className="font-medium text-ink">Sold out</p>
        <p className="mt-1 text-sm text-ink-muted">
          Every size of this piece has gone. More may be cut next season.
        </p>
      </div>
    );
  }

  const maxForSelected = selected ? Math.min(selected.stock, 10) : 1;

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <fieldset>
          <legend className="label">
            Colour{selected?.color ? <span className="font-normal text-ink-faint"> — {selected.color}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((option) => {
              const available = variants.some((v) => v.color === option && v.stock > 0);
              const isActive = option === color;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => chooseColor(option)}
                  aria-pressed={isActive}
                  className={[
                    "rounded-lg border px-3.5 py-2 text-sm transition-colors",
                    isActive
                      ? "border-ink bg-ink text-white"
                      : "border-line-strong bg-surface text-ink hover:border-ink",
                    available ? "" : "opacity-50",
                  ].join(" ")}
                >
                  {option}
                  {!available && <span className="ml-1.5 text-[11px]">(out)</span>}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="label">Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizesForColor.map((variant) => {
            const isActive = variant.id === variantId;
            const out = variant.stock === 0;
            return (
              <button
                key={variant.id}
                type="button"
                disabled={out}
                onClick={() => chooseSize(variant.id)}
                aria-pressed={isActive}
                title={out ? "Out of stock" : `${variant.stock} in stock`}
                className={[
                  "min-w-[3.25rem] rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-ink bg-ink text-white"
                    : "border-line-strong bg-surface text-ink hover:border-ink",
                  out ? "cursor-not-allowed text-ink-faint line-through opacity-50 hover:border-line-strong" : "",
                ].join(" ")}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
        {selected && selected.stock > 0 && selected.stock <= 3 && (
          <p className="mt-2 text-[13px] text-sale">
            Only {selected.stock} left in {variantLabel(selected)}.
          </p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="quantity" className="label">
            Qty
          </label>
          <select
            id="quantity"
            className="field w-20"
            value={quantity}
            onChange={(event) => {
              setQuantity(Number(event.target.value));
              setAdded(false);
            }}
            disabled={!selected}
          >
            {Array.from({ length: Math.max(maxForSelected, 1) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary flex-1 sm:flex-none sm:min-w-[14rem]"
          onClick={handleAdd}
          disabled={!selected || selected.stock === 0}
        >
          {added ? "Added to cart ✓" : `Add to cart — ${formatMoney(product.price * quantity)}`}
        </button>
      </div>

      {added && (
        <p className="text-sm text-ink-muted" role="status">
          <Link href="/cart" className="font-medium text-ink underline underline-offset-2">
            Go to cart
          </Link>{" "}
          or keep browsing.
        </p>
      )}
    </div>
  );
}
