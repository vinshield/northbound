"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-5 py-28 text-center">
      <h1 className="display text-3xl font-bold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-ink-muted">
        That is on us. Try again, and if it keeps happening the server logs will have the detail.
      </p>
      <button type="button" onClick={reset} className="btn btn-primary mt-7">
        Try again
      </button>
    </div>
  );
}
