import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "No connection" };

/** Shown by the service worker when a page is requested with no network. */
export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-lg px-5 py-28 text-center">
      <p className="eyebrow">Offline</p>
      <h1 className="display mt-2 text-3xl font-bold tracking-tight">You are not connected</h1>
      <p className="mt-3 text-ink-muted">
        We could not reach the shop. Prices and stock change often, so we would rather show you
        nothing than something out of date. Try again once you are back online.
      </p>
      <Link href="/" className="btn btn-primary mt-7">
        Try again
      </Link>
    </div>
  );
}
