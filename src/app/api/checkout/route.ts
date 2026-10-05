import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
import { freeShippingThreshold, publicEnv, shippingFee, siteUrl } from "@/lib/env";
import { variantLabel } from "@/lib/types";

export const runtime = "nodejs";

const addressSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the recipient's full name").max(120),
  phone: z.string().trim().min(7, "Enter a reachable phone number").max(30),
  line1: z.string().trim().min(3, "Enter a street address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter a city").max(100),
  state: z.string().trim().min(2, "Enter a state or region").max(100),
  postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(100),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const checkoutSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(200),
  address: addressSchema,
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1, "Your cart is empty")
    .max(50),
});

type VariantRow = {
  id: string;
  size: string;
  color: string | null;
  stock: number;
  product_id: string;
  products: {
    id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    is_active: boolean;
  } | null;
};

function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Malformed request body.");
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Check the details you entered.");
  }
  const { email, address, items } = parsed.data;

  // Collapse duplicate lines so a doubled-up cart can't bypass the stock check.
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);
  }

  const admin = createAdminClient();
  const { data: variants, error: variantError } = await admin
    .from("product_variants")
    .select("id, size, color, stock, product_id, products(id, name, slug, price, images, is_active)")
    .in("id", [...quantities.keys()])
    .returns<VariantRow[]>();

  if (variantError) {
    console.error("[checkout] variant lookup failed:", variantError.message);
    return fail("We could not price your cart. Please try again.", 500);
  }

  // ---------------------------------------------------------------------
  // Price and stock are taken from the database, never from the client.
  // ---------------------------------------------------------------------
  const orderLines: {
    variant_id: string;
    product_id: string;
    product_name: string;
    variant_label: string;
    image_url: string | null;
    unit_price: number;
    quantity: number;
  }[] = [];

  const problems: string[] = [];

  for (const [variantId, quantity] of quantities) {
    const variant = variants?.find((v) => v.id === variantId);
    const product = variant?.products;

    if (!variant || !product || !product.is_active) {
      problems.push("An item in your cart is no longer available.");
      continue;
    }
    if (variant.stock < quantity) {
      const label = variantLabel(variant);
      problems.push(
        variant.stock === 0
          ? `${product.name} (${label}) just sold out.`
          : `Only ${variant.stock} left of ${product.name} (${label}).`,
      );
      continue;
    }

    orderLines.push({
      variant_id: variant.id,
      product_id: product.id,
      product_name: product.name,
      variant_label: variantLabel(variant),
      image_url: product.images?.[0] ?? null,
      unit_price: product.price,
      quantity,
    });
  }

  if (problems.length > 0) {
    return fail(problems[0], 409, { problems, stale: true });
  }
  if (orderLines.length === 0) {
    return fail("Your cart is empty.");
  }

  const subtotal = orderLines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const shipping = subtotal >= freeShippingThreshold() ? 0 : shippingFee();
  const total = subtotal + shipping;

  // Attach the order to the signed-in user when there is one; guests get an
  // order keyed only by email and the Paystack reference.
  const user = await getSessionUser();

  const { data: orderNumberData, error: numberError } = await admin.rpc("generate_order_number");
  if (numberError || !orderNumberData) {
    console.error("[checkout] order number generation failed:", numberError?.message);
    return fail("We could not start your order. Please try again.", 500);
  }

  const reference = `nb_${randomUUID().replace(/-/g, "")}`;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumberData as string,
      user_id: user?.id ?? null,
      email: email.toLowerCase(),
      status: "pending",
      currency: publicEnv.currency,
      subtotal,
      shipping_fee: shipping,
      total,
      shipping_address: address,
      paystack_reference: reference,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[checkout] order insert failed:", orderError?.message);
    return fail("We could not start your order. Please try again.", 500);
  }

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderLines.map((line) => ({ ...line, order_id: order.id })));

  if (itemsError) {
    console.error("[checkout] order items insert failed:", itemsError.message);
    await admin.from("orders").delete().eq("id", order.id);
    return fail("We could not start your order. Please try again.", 500);
  }

  try {
    const transaction = await initializeTransaction({
      email: email.toLowerCase(),
      amount: total,
      reference,
      currency: publicEnv.currency,
      callbackUrl: `${siteUrl()}/checkout/callback`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        custom_fields: [
          {
            display_name: "Order",
            variable_name: "order_number",
            value: order.order_number,
          },
        ],
      },
    });

    return NextResponse.json({
      authorizationUrl: transaction.authorization_url,
      reference,
      orderNumber: order.order_number,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    console.error("[checkout] paystack initialize failed:", message);
    await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return fail("We could not reach the payment provider. Please try again.", 502);
  }
}
