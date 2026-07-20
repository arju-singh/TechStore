/*
 * TechStore service worker — a conservative, commerce-safe caching layer.
 *
 * Design rules (a shopping app must never serve stale prices, stock, or someone
 * else's authed data from cache):
 *   - Only GET requests are ever cached.
 *   - API, admin, auth, cart, checkout, order and payment traffic is NEVER
 *     cached — always straight to network.
 *   - Navigations are network-first (fresh HTML), falling back to cache and then
 *     to a branded offline page when the network is unavailable.
 *   - Immutable build assets (/_next/static, fonts) and images are
 *     cache-first / stale-while-revalidate for instant repeat loads.
 *
 * Bump CACHE_VERSION to invalidate all caches on the next activation.
 */
const CACHE_VERSION = "techstore-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [OFFLINE_URL, "/icon.svg", "/manifest.webmanifest"];

// Path prefixes that must always hit the network (never served from cache).
const NEVER_CACHE = [
  "/api/",
  "/admin",
  "/vendor",
  "/wholesale",
  "/account",
  "/cart",
  "/checkout",
  "/order",
  "/login",
  "/signup",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNeverCache(pathname) {
  return NEVER_CACHE.some((p) => pathname === p || pathname.startsWith(p));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GETs; everything else (POST, cross-origin such as
  // Razorpay/image CDNs) passes through to the network untouched.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCache(url.pathname)) return;

  // HTML navigations: network-first → cache → offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Immutable build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Other static GETs (images, fonts, icon): stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
