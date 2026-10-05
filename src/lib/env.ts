/**
 * Centralised environment access.
 *
 * Server-only secrets are read lazily through functions so that importing this
 * module from a client component never trips a "missing env var" error at
 * build time - only the code paths that actually need a secret will throw.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "NGN",
  storeName: process.env.NEXT_PUBLIC_STORE_NAME ?? "Northbound",
};

export function requirePublicEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey),
  };
}

export function serviceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function paystackSecretKey() {
  return required("PAYSTACK_SECRET_KEY", process.env.PAYSTACK_SECRET_KEY);
}

export function mailgunConfig() {
  return {
    apiKey: required("MAILGUN_API_KEY", process.env.MAILGUN_API_KEY),
    domain: required("MAILGUN_DOMAIN", process.env.MAILGUN_DOMAIN),
    from: process.env.MAILGUN_FROM ?? `${publicEnv.storeName} <orders@${process.env.MAILGUN_DOMAIN}>`,
    // EU-hosted Mailgun accounts need https://api.eu.mailgun.net
    baseUrl: process.env.MAILGUN_BASE_URL ?? "https://api.mailgun.net",
  };
}

/** Absolute origin of this deployment, used for Paystack + OAuth redirects. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Flat shipping fee in minor units. Defaults to NGN 2,500. */
export function shippingFee(): number {
  const raw = process.env.SHIPPING_FEE_MINOR;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 250000;
}

/** Free shipping above this subtotal. Defaults to NGN 100,000. */
export function freeShippingThreshold(): number {
  const raw = process.env.FREE_SHIPPING_THRESHOLD_MINOR;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10000000;
}

/**
 * Emails allowed into /admin before anyone has is_admin set in the database.
 * Comma separated. Once you flip is_admin on a profile you can drop this.
 */
export function bootstrapAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
