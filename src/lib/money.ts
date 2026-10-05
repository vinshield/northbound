import { publicEnv } from "./env";

/**
 * All money in this app is an integer in the currency's minor unit
 * (kobo for NGN, cents for USD/ZAR/KES). Paystack expects the same, so
 * nothing needs converting at the payment boundary.
 */
export function formatMoney(minor: number, currency = publicEnv.currency): string {
  const major = minor / 100;
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: major % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(2)}`;
  }
}

/** Parse a human-typed major-unit amount ("45000.50") into minor units. */
export function parseMoneyToMinor(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function minorToMajorString(minor: number): string {
  return (minor / 100).toFixed(2);
}
