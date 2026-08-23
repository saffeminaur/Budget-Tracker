// Bumped so already-installed clients pick up the new app icon set —
// changing this file's bytes is what triggers the browser's
// service-worker update check; the version bump then forces a fresh
// cache (see activate below, which deletes any cache key that isn't
// this one) instead of continuing to serve the old cached icon bytes
// forever under the old cache name.
const CACHE_NAME = "budget-tracker-v2";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon.ico",
  "/icons/femina_icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// Static assets: cache-first. Everything else (pages, data, actions):
// network-only, so app code and Supabase data are always fresh — this app
// isn't designed to work fully offline, just to install cleanly.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isStaticAsset = STATIC_ASSETS.includes(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
