import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-5 py-28 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-2 text-3xl font-bold tracking-tight">We cannot find that page</h1>
      <p className="mt-3 text-ink-muted">
        The piece may have sold out and been retired, or the link might be mistyped.
      </p>
      <div className="mt-7 flex justify-center gap-3">
        <Link href="/products" className="btn btn-primary">
          Browse the shop
        </Link>
        <Link href="/" className="btn btn-secondary">
          Home
        </Link>
      </div>
    </div>
  );
}
