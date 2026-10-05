import Link from "next/link";

import { ProductForm } from "@/components/admin/product-form";
import { getCategories } from "@/lib/catalog";

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-ink-muted hover:text-ink">
        ← Products
      </Link>
      <h2 className="display mt-3 text-2xl font-bold tracking-tight">New product</h2>
      <div className="mt-6">
        <ProductForm product={null} categories={categories} />
      </div>
    </div>
  );
}
