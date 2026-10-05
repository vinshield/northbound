export type OrderStatus = "pending" | "paid" | "fulfilled" | "cancelled" | "failed";

export type Category = {
  id: string;
  slug: string;
  name: string;
  position: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string;
  stock: number;
  position: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compare_at: number | null;
  category_id: string | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductWithVariants = Product & {
  categories: Pick<Category, "id" | "slug" | "name"> | null;
  product_variants: ProductVariant[];
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code?: string;
  country: string;
  notes?: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string | null;
  product_id: string | null;
  product_name: string;
  variant_label: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  shipping_address: ShippingAddress;
  paystack_reference: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
  confirmation_sent_at: string | null;
  created_at: string;
};

export type OrderWithItems = Order & { order_items: OrderItem[] };

/** What the browser keeps in localStorage. Prices here are display-only -
 *  the server always recomputes totals from the database at checkout. */
export type CartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image: string | null;
  price: number;
  quantity: number;
  maxStock: number;
};

export function variantLabel(variant: Pick<ProductVariant, "size" | "color">): string {
  return variant.color ? `${variant.color} / ${variant.size}` : variant.size;
}
