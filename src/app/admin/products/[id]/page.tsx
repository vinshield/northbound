import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/components/admin/product-form";
import { getCategories, getProductById } from "@/lib/catalog";
import { deleteProduct } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const [product, categories] = await Promise.all([getProductById(id), getCategories()]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-ink-muted hover:text-ink">
        ← Products
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-2xl font-bold tracking-tight">{product.name}</h2>
        <form action={deleteProduct}>
          <input type="hidden" name="id" value={product.id} />
          <button
            type="submit"
            className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:border-sale hover:text-sale"
          >
            Delete product
          </button>
        </form>
      </div>

      {created && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Product created. It is {product.is_active ? "live in the shop" : "hidden for now"}.
        </p>
      )}

      <div className="mt-6">
        <ProductForm product={product} categories={categories} />
      </div>
    </div>
  );
}
