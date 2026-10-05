"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only - in development it would
 * cache the dev build and cause confusing stale pages between edits.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[sw] registration failed:", error);
      });
    };

    // Wait for load so the worker never competes with the first render.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
