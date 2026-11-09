
const CACHE_NAME = "bot-breakers-v2";

const LOCAL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

const THREE_JS =
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// Install and cache the game files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await cache.addAll(LOCAL_FILES);

      try {
        await cache.add(THREE_JS);
      } catch (error) {
        console.log("Three.js could not be cached yet.");
      }
    })
  );

  self.skipWaiting();
});

// Activate and remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );

  self.clients.claim();
});

// Serve cached files when available
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache-first for the Three.js library
  if (url.href === THREE_JS) {
    event.respondWith(
      caches.match(request).then(async cached => {
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          return new Response("Three.js is unavailable offline.", {
            status: 503
          });
        }
      })
    );
    return;
  }

  // Cache-first for local game files
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(async cached => {
        if (cached) return cached;

        try {
          return await fetch(request);
        } catch {
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", { status: 503 });
        }
      })
    );
  }
});
