"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderById } from "@/lib/orders";
import { sendOrderConfirmation } from "@/lib/mailgun";
import { parseMoneyToMinor } from "@/lib/money";

export type ActionState = { ok: boolean; message: string } | null;
export type UploadState = { ok: boolean; message: string; url?: string } | null;

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  size: z.string().trim().min(1, "Every variant needs a size").max(40),
  color: z.string().trim().max(60).optional(),
  sku: z.string().trim().min(1, "Every variant needs a SKU").max(60),
  stock: z.number().int().min(0).max(100000),
});

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Give the product a name").max(160),
  slug: z
    .string()
    .trim()
    .min(2, "Give the product a URL slug")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers and hyphens"),
  description: z.string().trim().max(5000),
  price: z.number().int().min(0, "Price cannot be negative"),
  compare_at: z.number().int().min(0).nullable(),
  category_id: z.string().uuid().nullable(),
  images: z.array(z.string().url("Each image must be a valid URL")).max(8),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  variants: z.array(variantSchema).min(1, "Add at least one size"),
});

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function readProductForm(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const compareAtRaw = String(formData.get("compare_at") ?? "").trim();

  // Variants arrive as parallel arrays from the repeating form rows.
  const sizes = formData.getAll("variant_size").map(String);
  const colors = formData.getAll("variant_color").map(String);
  const skus = formData.getAll("variant_sku").map(String);
  const stocks = formData.getAll("variant_stock").map(String);
  const ids = formData.getAll("variant_id").map(String);

  const variants = sizes
    .map((size, index) => ({
      id: ids[index] && ids[index] !== "" ? ids[index] : undefined,
      size: size.trim(),
      color: colors[index]?.trim() || undefined,
      sku: skus[index]?.trim() ?? "",
      stock: Number.parseInt(stocks[index] ?? "0", 10) || 0,
    }))
    // Rows the admin left blank are simply dropped rather than erroring.
    .filter((variant) => variant.size !== "");

  return {
    id: String(formData.get("id") ?? "") || undefined,
    name,
    slug: rawSlug || slugify(name),
    description: String(formData.get("description") ?? ""),
    price: parseMoneyToMinor(String(formData.get("price") ?? "")) ?? -1,
    compare_at: compareAtRaw ? parseMoneyToMinor(compareAtRaw) : null,
    category_id: categoryId || null,
    images: formData
      .getAll("images")
      .map(String)
      .map((url) => url.trim())
      .filter(Boolean),
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    variants,
  };
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Not authorised." };
  }

  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const input = parsed.data;

  // Duplicate SKUs would fail on the unique index with an opaque error.
  const skuSet = new Set(input.variants.map((v) => v.sku.toUpperCase()));
  if (skuSet.size !== input.variants.length) {
    return { ok: false, message: "Each variant needs its own SKU." };
  }

  const admin = createAdminClient();
  const productFields = {
    name: input.name,
    slug: input.slug,
    description: input.description,
    price: input.price,
    compare_at: input.compare_at,
    category_id: input.category_id,
    images: input.images,
    is_active: input.is_active,
    is_featured: input.is_featured,
  };

  let productId = input.id;

  if (productId) {
    const { error } = await admin.from("products").update(productFields).eq("id", productId);
    if (error) return { ok: false, message: friendlyDbError(error.message) };
  } else {
    const { data, error } = await admin
      .from("products")
      .insert(productFields)
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: friendlyDbError(error?.message ?? "") };
    productId = data.id;
  }

  // Replace the variant set: upsert what was submitted, delete what was removed.
  const submittedIds = input.variants.map((v) => v.id).filter(Boolean) as string[];
  let removeQuery = admin.from("product_variants").delete().eq("product_id", productId);
  if (submittedIds.length > 0) {
    removeQuery = removeQuery.not("id", "in", `(${submittedIds.join(",")})`);
  }
  const { error: deleteError } = await removeQuery;
  if (deleteError) return { ok: false, message: friendlyDbError(deleteError.message) };

  const { error: variantError } = await admin.from("product_variants").upsert(
    input.variants.map((variant, index) => ({
      ...(variant.id ? { id: variant.id } : {}),
      product_id: productId!,
      size: variant.size,
      color: variant.color ?? null,
      sku: variant.sku,
      stock: variant.stock,
      position: index,
    })),
  );
  if (variantError) return { ok: false, message: friendlyDbError(variantError.message) };

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath(`/products/${input.slug}`);
  revalidatePath("/");

  if (!input.id) redirect(`/admin/products/${productId}?created=1`);
  return { ok: true, message: "Saved." };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const admin = createAdminClient();
  // order_items keep their denormalised copy, so past receipts stay intact.
  await admin.from("products").delete().eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  redirect("/admin/products");
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const admin = createAdminClient();
  await admin.from("products").update({ is_active: next }).eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products");
}

const STATUS_VALUES = ["pending", "paid", "fulfilled", "cancelled", "failed"] as const;

export async function updateOrderStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Not authorised." };
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id || !STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    return { ok: false, message: "Unknown order status." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("orders")
    .update({
      status,
      fulfilled_at: status === "fulfilled" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/orders");
  return { ok: true, message: `Order marked ${status}.` };
}

export async function resendConfirmation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Not authorised." };
  }

  const id = String(formData.get("id") ?? "");
  const order = id ? await getOrderById(id) : null;
  if (!order) return { ok: false, message: "Order not found." };

  try {
    await sendOrderConfirmation(order);
    const admin = createAdminClient();
    await admin
      .from("orders")
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq("id", id);
    revalidatePath(`/admin/orders/${id}`);
    return { ok: true, message: `Confirmation resent to ${order.email}.` };
  } catch (cause) {
    return {
      ok: false,
      message: cause instanceof Error ? cause.message : "Could not send the email.",
    };
  }
}

export async function uploadProductImage(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  try {
    await requireAdmin();
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : "Not authorised." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image first." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "That file is not an image." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Images must be under 5MB." };
  }

  const admin = createAdminClient();
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await admin.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) return { ok: false, message: `Upload failed: ${error.message}` };

  const {
    data: { publicUrl },
  } = admin.storage.from("product-images").getPublicUrl(path);

  return { ok: true, message: "Uploaded.", url: publicUrl };
}

function friendlyDbError(message: string): string {
  if (message.includes("products_slug_key")) {
    return "Another product already uses that URL slug.";
  }
  if (message.includes("product_variants_sku_key")) {
    return "That SKU is already in use by another product.";
  }
  if (message.includes("product_variants_product_id_size_color_key")) {
    return "You have two variants with the same size and colour.";
  }
  return message || "Something went wrong saving the product.";
}
