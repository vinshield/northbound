import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { paystackSecretKey } from "@/lib/env";

const API = "https://api.paystack.co";

export type InitializeResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type VerifyResult = {
  status: "success" | "failed" | "abandoned" | string;
  reference: string;
  amount: number;
  currency: string;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
};

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as PaystackEnvelope<T> | null;

  if (!response.ok || !body?.status) {
    throw new Error(body?.message ?? `Paystack request failed (${response.status})`);
  }
  return body.data;
}

/**
 * Starts a transaction. `amount` is in the currency's minor unit, which is
 * exactly how we store money, so there is no conversion here.
 */
export function initializeTransaction(params: {
  email: string;
  amount: number;
  reference: string;
  currency: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeResult> {
  return paystackFetch<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      currency: params.currency,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  });
}

export function verifyTransaction(reference: string): Promise<VerifyResult> {
  return paystackFetch<VerifyResult>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/**
 * Paystack signs webhooks with HMAC-SHA512 of the raw body, keyed by the
 * secret key. Compared in constant time so the check can't be timed.
 */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", paystackSecretKey()).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
