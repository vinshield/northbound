import Image from "next/image";
import Link from "next/link";

import { getProducts, totalStock } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { toggleProductActive } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getProducts({ includeInactive: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">
          {products.length} product{products.length === 1 ? "" : "s"}
        </h2>
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="card mt-5 p-10 text-center text-sm text-ink-muted">
          No products yet. Run the seed file or add your first one.
        </p>
      ) : (
        <ul className="card mt-5 divide-y divide-line">
          {products.map((product) => {
            const stock = totalStock(product);
            return (
              <li key={product.id} className="flex items-center gap-4 p-4">
                <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0]}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-medium hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-ink-faint">
                    {product.categories?.name ?? "Uncategorised"} ·{" "}
                    {product.product_variants.length} variant
                    {product.product_variants.length === 1 ? "" : "s"} ·{" "}
                    <span className={stock === 0 ? "text-sale" : undefined}>
                      {stock} in stock
                    </span>
                  </p>
                </div>

                <span className="hidden font-medium tabular-nums sm:block">
                  {formatMoney(product.price)}
                </span>

                <form action={toggleProductActive}>
                  <input type="hidden" name="id" value={product.id} />
                  <input type="hidden" name="next" value={String(!product.is_active)} />
                  <button
                    type="submit"
                    className={[
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      product.is_active
                        ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                        : "bg-stone-200 text-stone-700 hover:bg-stone-300",
                    ].join(" ")}
                    title={product.is_active ? "Click to hide from the shop" : "Click to publish"}
                  >
                    {product.is_active ? "Live" : "Hidden"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
