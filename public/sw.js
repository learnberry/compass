/*
 * Compass service worker — hand-rolled, no build step.
 * iOS 16.4+ safe: uses only widely-supported SW APIs.
 */

const CACHE_VERSION = "compass-v1";

/** App shell precached on install. */
const APP_SHELL = [
  "/",
  "/habits",
  "/schedule",
  "/goals",
  "/review",
  "/settings",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
];

/** Path prefixes / extensions treated as cache-first static assets. */
const STATIC_PREFIXES = ["/_next/static", "/icons/"];
const STATIC_EXTENSIONS = [
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
];

// ─── install ───────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Cache each URL independently so a single failure doesn't abort install.
      await Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (err) {
            console.warn("[sw] precache failed for", url, err);
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

// ─── activate ──────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

// ─── fetch ─────────────────────────────────────────────────────────────

function isStaticAsset(url) {
  if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }
  return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

/** Network-first: try the network, fall back to cache. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

/** Cache-first: serve cache, otherwise fetch and populate. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

/** Navigation: network-first, fall back to cached page, then offline shell. */
async function handleNavigate(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** API: network-only. On failure return a JSON 503. */
async function handleApi(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ error: "offline", message: "Network unavailable." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle same-origin requests.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApi(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ─── push ──────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  let payload = null;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = null;
    }
  }

  if (!payload || !payload.title) {
    // Guard against missing/blank payloads — show a generic nudge.
    event.waitUntil(
      self.registration.showNotification("Compass", {
        body: "You have a new reminder.",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: "/" },
      }),
    );
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: payload.url || "/",
        reminderId: payload.reminderId,
      },
      actions: Array.isArray(payload.actions) ? payload.actions : [],
    }),
  );
});

// ─── notificationclick ─────────────────────────────────────────────────

async function focusOrOpen(targetUrl) {
  const url = targetUrl || "/";
  const allClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of allClients) {
    if ("focus" in client) {
      try {
        await client.navigate(url);
      } catch {
        // navigate can reject cross-origin or when not allowed — ignore.
      }
      return client.focus();
    }
  }
  return self.clients.openWindow(url);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const reminderId = data.reminderId;

  event.waitUntil(
    (async () => {
      if (event.action === "complete" && reminderId) {
        try {
          await fetch("/api/reminders/" + reminderId + "/ack", { method: "POST" });
        } catch {
          /* best-effort */
        }
        return;
      }

      if (event.action === "snooze" && reminderId) {
        try {
          await fetch("/api/reminders/" + reminderId + "/snooze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minutes: 10 }),
          });
        } catch {
          /* best-effort */
        }
        return;
      }

      await focusOrOpen(data.url || "/");
    })(),
  );
});

// ─── periodicsync ──────────────────────────────────────────────────────

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "compass-reminders") {
    event.waitUntil(
      fetch("/api/dispatch", { method: "POST" }).catch(() => {
        /* best-effort */
      }),
    );
  }
});
