"use client";

import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { lines, ready, subtotal, setQuantity, remove } = useCart();

  if (!ready) {
    return <div className="mx-auto max-w-5xl px-5 py-20 text-ink-faint">Loading your cart…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="display text-3xl font-bold tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-ink-muted">
          Nothing in here yet. Have a look at what is in stock this season.
        </p>
        <Link href="/products" className="btn btn-primary mt-7">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="display text-4xl font-bold tracking-tight">Cart</h1>

      <div className="mt-9 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 py-5">
              <Link
                href={`/products/${line.slug}`}
                className="relative h-28 w-22 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-sunken"
                style={{ width: "5.5rem" }}
              >
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="88px" className="object-cover" />
                ) : null}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <Link
                    href={`/products/${line.slug}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {line.name}
                  </Link>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(line.price * line.quantity)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-ink-faint">{line.variantLabel}</p>

                <div className="mt-3 flex items-center gap-4">
                  <label className="sr-only" htmlFor={`qty-${line.variantId}`}>
                    Quantity for {line.name}
                  </label>
                  <select
                    id={`qty-${line.variantId}`}
                    className="field w-20 py-1.5"
                    value={line.quantity}
                    onChange={(event) => setQuantity(line.variantId, Number(event.target.value))}
                  >
                    {Array.from(
                      { length: Math.max(Math.min(line.maxStock, 10), line.quantity) },
                      (_, i) => i + 1,
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    className="text-sm text-ink-faint underline-offset-2 hover:text-ink hover:underline"
                  >
                    Remove
                  </button>
                </div>

                {line.quantity >= line.maxStock && (
                  <p className="mt-2 text-[13px] text-sale">
                    That is all we have of this size right now.
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="card p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="font-medium tabular-nums">{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Shipping</dt>
              <dd className="text-ink-faint">Calculated at checkout</dd>
            </div>
          </dl>
          <Link href="/checkout" className="btn btn-primary mt-6 w-full">
            Checkout
          </Link>
          <Link href="/products" className="btn btn-ghost mt-1.5 w-full">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
