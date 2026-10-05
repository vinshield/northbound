"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  saveProduct,
  uploadProductImage,
  type ActionState,
  type UploadState,
} from "@/app/admin/actions";
import { minorToMajorString } from "@/lib/money";
import type { Category, ProductWithVariants } from "@/lib/types";

type VariantRow = {
  key: string;
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: string;
};

const UPLOAD_FORM_ID = "product-image-upload";

function newKey() {
  return Math.random().toString(36).slice(2);
}

function skuSuggestion(productName: string, color: string, size: string) {
  const part = (value: string, length: number) =>
    value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, length);
  return [part(productName, 8), part(color || "STD", 6), part(size, 4)].filter(Boolean).join("-");
}

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
    </button>
  );
}

export function ProductForm({
  product,
  categories,
}: {
  product: ProductWithVariants | null;
  categories: Category[];
}) {
  const isNew = product === null;
  const [state, formAction] = useActionState<ActionState, FormData>(saveProduct, null);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product?.slug));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [urlDraft, setUrlDraft] = useState("");

  const [variants, setVariants] = useState<VariantRow[]>(() =>
    product && product.product_variants.length > 0
      ? product.product_variants.map((v) => ({
          key: newKey(),
          id: v.id,
          size: v.size,
          color: v.color ?? "",
          sku: v.sku,
          stock: String(v.stock),
        }))
      : [{ key: newKey(), size: "", color: "", sku: "", stock: "0" }],
  );

  // Uploading appends to the image list as soon as Supabase returns a URL.
  const [uploadState, uploadAction, uploading] = useActionState<UploadState, FormData>(
    async (previous, formData) => {
      const result = await uploadProductImage(previous, formData);
      if (result?.ok && result.url) {
        const url = result.url;
        setImages((current) => (current.includes(url) ? current : [...current, url]));
      }
      return result;
    },
    null,
  );

  function updateName(value: string) {
    setName(value);
    // Keep the slug in step with the name until the admin edits it by hand.
    if (!slugTouched) {
      setSlug(
        value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      );
    }
  }

  function updateVariant(key: string, patch: Partial<VariantRow>) {
    setVariants((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addVariant() {
    const last = variants[variants.length - 1];
    setVariants((rows) => [
      ...rows,
      { key: newKey(), size: "", color: last?.color ?? "", sku: "", stock: "0" },
    ]);
  }

  function removeVariant(key: string) {
    setVariants((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.key !== key)));
  }

  function addUrl() {
    const trimmed = urlDraft.trim();
    if (!trimmed) return;
    setImages((current) => [...current, trimmed]);
    setUrlDraft("");
  }

  return (
    <>
      <form action={formAction} className="space-y-8">
        {product && <input type="hidden" name="id" value={product.id} />}

        {state && (
          <p
            role="alert"
            className={`rounded-lg px-4 py-3 text-sm ${
              state.ok ? "bg-emerald-50 text-emerald-900" : "bg-sale/10 text-sale"
            }`}
          >
            {state.message}
          </p>
        )}

        <section className="card p-6">
          <h2 className="font-semibold">Basics</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                required
                value={name}
                onChange={(e) => updateName(e.target.value)}
                className="field"
                placeholder="Oxford Button-Down Shirt"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="slug">
                URL slug
              </label>
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className="field font-mono text-sm"
                placeholder="oxford-button-down-shirt"
              />
              <p className="mt-1.5 text-[13px] text-ink-faint">/products/{slug || "…"}</p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={product?.description ?? ""}
                className="field resize-y"
                placeholder="Fabric, fit, construction — the details a customer needs to buy with confidence."
              />
            </div>

            <div>
              <label className="label" htmlFor="price">
                Price
              </label>
              <input
                id="price"
                name="price"
                required
                inputMode="decimal"
                defaultValue={product ? minorToMajorString(product.price) : ""}
                className="field"
                placeholder="45000"
              />
            </div>

            <div>
              <label className="label" htmlFor="compare_at">
                Compare-at price <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="compare_at"
                name="compare_at"
                inputMode="decimal"
                defaultValue={product?.compare_at ? minorToMajorString(product.compare_at) : ""}
                className="field"
                placeholder="52000"
              />
              <p className="mt-1.5 text-[13px] text-ink-faint">
                Shows a struck-through was-price and a Sale badge.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="category_id">
                Category
              </label>
              <select
                id="category_id"
                name="category_id"
                defaultValue={product?.category_id ?? ""}
                className="field"
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={product?.is_active ?? true}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                Visible in the shop
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={product?.is_featured ?? false}
                  className="h-4 w-4 accent-[var(--color-ink)]"
                />
                Feature on the home page
              </label>
            </div>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold">Images</h2>
          <p className="mt-1 text-[13px] text-ink-faint">
            The first image is used on the product card. Upload a file or paste a URL.
          </p>

          {images.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((url, index) => (
                <li key={`${url}-${index}`} className="relative">
                  <input type="hidden" name="images" value={url} />
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-sunken">
                    {/* Unoptimised: a pasted host may not be in next.config remotePatterns. */}
                    <Image src={url} alt="" fill sizes="20vw" unoptimized className="object-cover" />
                  </div>
                  {index === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== index))}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-sm text-ink-muted shadow-sm hover:text-sale"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="url"
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Enter here adds the URL rather than submitting the product.
                  e.preventDefault();
                  addUrl();
                }
              }}
              placeholder="https://…"
              className="field min-w-[16rem] flex-1"
            />
            <button type="button" onClick={addUrl} className="btn btn-secondary py-2 text-sm">
              Add URL
            </button>
          </div>

          {/* These controls post to the sibling upload form via its id, so the
              file upload never submits the product form. */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <input
              type="file"
              name="file"
              accept="image/*"
              form={UPLOAD_FORM_ID}
              className="text-sm file:mr-3 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-ink"
            />
            <button
              type="submit"
              form={UPLOAD_FORM_ID}
              className="btn btn-secondary py-2 text-sm"
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload to Supabase"}
            </button>
          </div>

          {uploadState && !uploadState.ok && (
            <p role="alert" className="mt-3 text-sm text-sale">
              {uploadState.message}
            </p>
          )}
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Sizes and stock</h2>
              <p className="mt-1 text-[13px] text-ink-faint">
                One row per size and colour. Stock drops automatically when an order is paid.
              </p>
            </div>
            <button type="button" onClick={addVariant} className="btn btn-secondary py-2 text-sm">
              Add row
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {variants.map((variant) => (
              <div
                key={variant.key}
                className="grid gap-3 rounded-lg border border-line bg-surface-sunken p-3 sm:grid-cols-[6rem_1fr_1.3fr_5.5rem_auto] sm:items-end"
              >
                <input type="hidden" name="variant_id" value={variant.id ?? ""} />

                <div>
                  <label className="label text-[12px]">Size</label>
                  <input
                    name="variant_size"
                    value={variant.size}
                    onChange={(e) => updateVariant(variant.key, { size: e.target.value })}
                    className="field py-2"
                    placeholder="M"
                  />
                </div>

                <div>
                  <label className="label text-[12px]">Colour</label>
                  <input
                    name="variant_color"
                    value={variant.color}
                    onChange={(e) => updateVariant(variant.key, { color: e.target.value })}
                    className="field py-2"
                    placeholder="White"
                  />
                </div>

                <div>
                  <label className="label text-[12px]">SKU</label>
                  <div className="flex gap-1.5">
                    <input
                      name="variant_sku"
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.key, { sku: e.target.value })}
                      className="field py-2 font-mono text-[13px]"
                      placeholder="OXFORD-WHITE-M"
                    />
                    <button
                      type="button"
                      title="Suggest a SKU from the name, colour and size"
                      onClick={() =>
                        updateVariant(variant.key, {
                          sku: skuSuggestion(name, variant.color, variant.size),
                        })
                      }
                      className="shrink-0 rounded-lg border border-line-strong bg-surface px-2.5 text-[13px] text-ink-muted hover:border-ink hover:text-ink"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label text-[12px]">Stock</label>
                  <input
                    name="variant_stock"
                    value={variant.stock}
                    onChange={(e) => updateVariant(variant.key, { stock: e.target.value })}
                    inputMode="numeric"
                    className="field py-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeVariant(variant.key)}
                  disabled={variants.length === 1}
                  className="h-[38px] rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink-muted hover:border-sale hover:text-sale disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <SubmitButton isNew={isNew} />
          {!isNew && (
            <a href={`/products/${product.slug}`} className="btn btn-ghost" target="_blank">
              View in shop ↗
            </a>
          )}
        </div>
      </form>

      {/* Sibling, not nested: HTML forbids a form inside a form. */}
      <form id={UPLOAD_FORM_ID} action={uploadAction} hidden />
    </>
  );
}
