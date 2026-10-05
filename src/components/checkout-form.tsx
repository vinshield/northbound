"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useCart } from "@/components/cart-provider";
import { formatMoney } from "@/lib/money";

type Props = {
  defaultEmail: string;
  defaultName: string;
  shippingFee: number;
  freeShippingThreshold: number;
};

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
];

export function CheckoutForm({
  defaultEmail,
  defaultName,
  shippingFee,
  freeShippingThreshold,
}: Props) {
  const router = useRouter();
  const { lines, ready, subtotal } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipping = subtotal >= freeShippingThreshold ? 0 : shippingFee;
  const total = subtotal + shipping;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (lines.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      address: {
        full_name: String(form.get("full_name") ?? "").trim(),
        phone: String(form.get("phone") ?? "").trim(),
        line1: String(form.get("line1") ?? "").trim(),
        line2: String(form.get("line2") ?? "").trim(),
        city: String(form.get("city") ?? "").trim(),
        state: String(form.get("state") ?? "").trim(),
        postal_code: String(form.get("postal_code") ?? "").trim(),
        country: String(form.get("country") ?? "Nigeria").trim(),
        notes: String(form.get("notes") ?? "").trim(),
      },
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    };

    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        authorizationUrl?: string;
        error?: string;
        stale?: boolean;
      };

      if (!response.ok || !data.authorizationUrl) {
        setError(data.error ?? "We could not start your payment. Please try again.");
        // Stock moved under the customer: refresh so the cart reflects reality.
        if (data.stale) router.refresh();
        setSubmitting(false);
        return;
      }

      // Hand off to Paystack. The cart is cleared on the callback page, only
      // once payment is confirmed, so a cancelled payment keeps the cart.
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Something went wrong reaching the server. Please try again.");
      setSubmitting(false);
    }
  }

  if (ready && lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-ink-muted">There is nothing to check out.</p>
        <Link href="/products" className="btn btn-primary mt-5">
          Browse the shop
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_21rem] lg:items-start">
      <div className="space-y-8">
        <section className="card p-6">
          <h2 className="font-semibold">Contact</h2>
          <div className="mt-4">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={defaultEmail}
              placeholder="you@example.com"
              className="field"
            />
            <p className="mt-1.5 text-[13px] text-ink-faint">
              Your order confirmation goes here.
            </p>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-semibold">Delivery address</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="full_name">
                Full name
              </label>
              <input
                id="full_name"
                name="full_name"
                required
                autoComplete="name"
                defaultValue={defaultName}
                className="field"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                required
                autoComplete="tel"
                inputMode="tel"
                placeholder="+234 801 234 5678"
                className="field"
              />
            </div>

            <div>
              <label className="label" htmlFor="country">
                Country
              </label>
              <input
                id="country"
                name="country"
                required
                autoComplete="country-name"
                defaultValue="Nigeria"
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="line1">
                Street address
              </label>
              <input
                id="line1"
                name="line1"
                required
                autoComplete="address-line1"
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="line2">
                Apartment, suite, landmark{" "}
                <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input id="line2" name="line2" autoComplete="address-line2" className="field" />
            </div>

            <div>
              <label className="label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                name="city"
                required
                autoComplete="address-level2"
                className="field"
              />
            </div>

            <div>
              <label className="label" htmlFor="state">
                State
              </label>
              <input
                id="state"
                name="state"
                required
                list="ng-states"
                autoComplete="address-level1"
                className="field"
              />
              <datalist id="ng-states">
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="label" htmlFor="postal_code">
                Postal code <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="postal_code"
                name="postal_code"
                autoComplete="postal-code"
                className="field"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">
                Delivery notes <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <textarea id="notes" name="notes" rows={2} className="field resize-y" />
            </div>
          </div>
        </section>
      </div>

      <aside className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-semibold">Your order</h2>

        <ul className="mt-4 space-y-4">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-surface-sunken">
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
                ) : null}
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[10px] font-bold text-white">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{line.name}</p>
                <p className="text-[13px] text-ink-faint">{line.variantLabel}</p>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {formatMoney(line.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-5 space-y-2.5 border-t border-line pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-muted">Shipping</dt>
            <dd className="tabular-nums">
              {shipping === 0 ? <span className="text-success">Free</span> : formatMoney(shipping)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(total)}</dd>
          </div>
        </dl>

        {shipping > 0 && (
          <p className="mt-3 text-[13px] text-ink-faint">
            Spend {formatMoney(freeShippingThreshold - subtotal)} more for free delivery.
          </p>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-sale/10 px-3.5 py-3 text-sm text-sale">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={submitting}>
          {submitting ? "Redirecting to Paystack…" : `Pay ${formatMoney(total)}`}
        </button>

        <p className="mt-3 text-center text-[12px] leading-relaxed text-ink-faint">
          You will be taken to Paystack to pay securely. We never see your card details.
        </p>
      </aside>
    </form>
  );
}
