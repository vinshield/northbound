import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv } from "@/lib/env";
import type { Category, ProductWithVariants } from "@/lib/types";

const PRODUCT_SELECT =
  "*, categories(id, slug, name), product_variants(id, product_id, size, color, sku, stock, position)";

/** True once Supabase env vars are present. Lets pages show setup help instead of crashing. */
export function isConfigured(): boolean {
  return Boolean(
    publicEnv.supabaseUrl && publicEnv.supabaseAnonKey && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function sortVariants(product: ProductWithVariants): ProductWithVariants {
  return {
    ...product,
    product_variants: [...(product.product_variants ?? [])].sort(
      (a, b) => a.position - b.position || a.size.localeCompare(b.size),
    ),
  };
}

export async function getCategories(): Promise<Category[]> {
  if (!isConfigured()) return [];
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("categories").select("*").order("position");
    return (data as Category[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getProducts(options?: {
  category?: string;
  featuredOnly?: boolean;
  limit?: number;
  includeInactive?: boolean;
}): Promise<ProductWithVariants[]> {
  if (!isConfigured()) return [];

  const admin = createAdminClient();
  let query = admin.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });

  if (!options?.includeInactive) query = query.eq("is_active", true);
  if (options?.featuredOnly) query = query.eq("is_featured", true);
  if (options?.limit) query = query.limit(options.limit);

  if (options?.category) {
    const { data: category } = await admin
      .from("categories")
      .select("id")
      .eq("slug", options.category)
      .maybeSingle();
    // An unknown category slug should show nothing, not the whole catalog.
    if (!category) return [];
    query = query.eq("category_id", category.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[catalog] product query failed:", error.message);
    return [];
  }
  return ((data as ProductWithVariants[] | null) ?? []).map(sortVariants);
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  if (!isConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? sortVariants(data as ProductWithVariants) : null;
}

export async function getProductById(id: string): Promise<ProductWithVariants | null> {
  if (!isConfigured()) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  return data ? sortVariants(data as ProductWithVariants) : null;
}

export function totalStock(product: ProductWithVariants): number {
  return (product.product_variants ?? []).reduce((sum, v) => sum + v.stock, 0);
}
