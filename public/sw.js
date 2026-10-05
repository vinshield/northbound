/*
 * Northbound service worker.
 *
 * Deliberately conservative: it caches the shell and static assets so the app
 * opens instantly and degrades gracefully offline, but it NEVER caches pages
 * whose content must be current - prices, stock levels, carts, checkout,
 * orders or anything under /admin. Serving a stale price or a sold-out size
 * from cache would be worse than showing nothing.
 */

const VERSION = "v1";
const SHELL_CACHE = `northbound-shell-${VERSION}`;
const ASSET_CACHE = `northbound-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

// Anything matching these is always fetched fresh from the network.
const NEVER_CACHE = [
  /^\/api\//,
  /^\/auth\//,
  /^\/admin/,
  /^\/checkout/,
  /^\/cart/,
  /^\/orders/,
  /^\/login/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("northbound-") && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle our own origin; Supabase, Paystack and image hosts go direct.
  if (url.origin !== self.location.origin) return;

  if (NEVER_CACHE.some((pattern) => pattern.test(url.pathname))) return;

  // Build output is content-hashed, so it can be cached indefinitely.
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/");

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: always try the network first so prices and stock are current,
  // and only fall back to a cached copy (or the offline page) if it fails.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match(OFFLINE_URL))),
    );
  }
});
