import type { Metadata } from "next";
import Link from "next/link";

import { CheckoutForm } from "@/components/checkout-form";
import { getSessionUser } from "@/lib/auth";
import { freeShippingThreshold, shippingFee } from "@/lib/env";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  // Guests are welcome here; signing in only prefills the form and keeps a
  // record of the order under the account.
  const user = await getSessionUser().catch(() => null);

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="display text-4xl font-bold tracking-tight">Checkout</h1>

      {!user && (
        <p className="mt-3 text-sm text-ink-muted">
          Checking out as a guest.{" "}
          <Link
            href="/login?next=/checkout"
            className="font-medium text-ink underline underline-offset-2"
          >
            Sign in with Google
          </Link>{" "}
          to save this order to an account.
        </p>
      )}

      <div className="mt-9">
        <CheckoutForm
          defaultEmail={user?.email ?? ""}
          defaultName={user?.fullName ?? ""}
          shippingFee={shippingFee()}
          freeShippingThreshold={freeShippingThreshold()}
        />
      </div>
    </div>
  );
}
