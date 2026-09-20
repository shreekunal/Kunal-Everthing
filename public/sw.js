// KunalOS Production Service Worker - Linear/Slack Remote Shell Architecture
// Supports instant offline boot (<50ms), static asset caching, and network-first navigation.

const CACHE_VERSION = "v1.2.0";
const STATIC_CACHE = `kunal-os-static-${CACHE_VERSION}`;
const SHELL_CACHE = `kunal-os-shell-${CACHE_VERSION}`;

// Precache essential App Shell routes and assets for offline access
const PRECACHE_ASSETS = [
  "/",
  "/tasks",
  "/routines",
  "/money",
  "/settings",
  "/login",
  "/manifest.json",
  "/BrandLogo.png",
  "/BrandLogo.svg",
  "/female-avatar.png",
  "/male-avatar.png",
  "/favicon.ico",
  "/favicon.png",
];

// Routes that should NEVER be cached in CacheStorage for security
const SENSITIVE_ROUTES = [
  "/api/vault",
  "/api/auth/pin",
  "/api/auth/biometrics",
  "/api/auth/switch",
  "/api/auth/logout",
  "/api/backup",
];

// Install: Precache App Shell assets immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then(async (cache) => {
        // Cache assets gracefully so a single failure doesn't block install
        await Promise.allSettled(
          PRECACHE_ASSETS.map((url) =>
            fetch(url, { cache: "reload" })
              .then((res) => {
                if (res.ok) return cache.put(url, res);
              })
              .catch((err) => {
                console.warn(`[ServiceWorker] Precache failed for ${url}:`, err);
              })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete caches and claim active clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName.startsWith("kunal-os-") &&
              cacheName !== STATIC_CACHE &&
              cacheName !== SHELL_CACHE
            ) {
              console.log(`[ServiceWorker] Removing legacy cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Smart caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only intercept HTTP/HTTPS GET requests from our origin
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // 2. Bypass security-critical vault/auth APIs
  if (SENSITIVE_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return;
  }

  // 3. Navigation Requests (HTML documents: /, /tasks, /routines, etc.)
  // Strategy: Network-First with a 2500ms timeout, falling back to cached shell
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkPromise = fetch(request);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout")), 2500)
          );

          const response = await Promise.race([networkPromise, timeoutPromise]);
          if (response && response.ok) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, response.clone());
            return response;
          }
        } catch (err) {
          // Network offline, timeout, or DNS failure
        }

        // Return exact cached route if available
        const exactMatch = await caches.match(request);
        if (exactMatch) return exactMatch;

        // Fallback to cached root shell
        const rootShell = await caches.match("/");
        if (rootShell) return rootShell;

        // Fallback to login if present
        const loginShell = await caches.match("/login");
        if (loginShell) return loginShell;

        return new Response(
          "<!DOCTYPE html><html><body style='background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif'><h2>Offline • Please connect to network</h2></body></html>",
          { headers: { "Content-Type": "text/html" }, status: 503 }
        );
      })()
    );
    return;
  }

  // 4. Next.js Static Chunks & Fonts (Immutable hashed assets)
  // Strategy: Cache-First (Instant 0ms retrieval)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408, statusText: "Asset Unavailable Offline" });
          });
      })
    );
    return;
  }

  // 5. Dynamic API GET requests (Tasks, Routines, Money)
  // Strategy: Network-First with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "Offline: Network unavailable", offline: true }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }
});

// Background client communication
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
