/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache, PAGES_CACHE_NAME } from "@serwist/turbopack/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const APP_SHELL_PATHS =
  /^\/($|salas(\/.*)?|cancionero(\/.*)?|auth\/login|~offline|pwa-boot\.html)$/;

const SHELL_CACHE = "app-shell-offline-v1";
const SHELL_URLS = [
  "/pwa-boot.html",
  "/salas",
  "/~offline",
  "/auth/login",
] as const;

const SHELL_FALLBACK_ORDER = ["/salas", "/pwa-boot.html", "/~offline"] as const;

async function matchShellInCaches(
  requestUrl: string,
  preferredPath?: string,
): Promise<Response | undefined> {
  const paths = preferredPath
    ? [
        preferredPath,
        ...SHELL_FALLBACK_ORDER.filter((path) => path !== preferredPath),
      ]
    : [...SHELL_FALLBACK_ORDER];

  for (const path of paths) {
    const absolute = new URL(path, requestUrl).href;

    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      const match =
        (await cache.match(path)) ||
        (await cache.match(absolute)) ||
        (await cache.match(new Request(absolute)));

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

async function populateShellCache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);

  await Promise.allSettled(
    SHELL_URLS.map(async (url) => {
      try {
        const response = await fetch(url, { credentials: "include" });

        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Sin red durante install: se completa en la próxima visita online.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(populateShellCache());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  const isNavigate =
    event.request.mode === "navigate" || event.request.destination === "document";

  if (!isNavigate || url.origin !== self.location.origin) {
    return;
  }

  const isShellPath =
    url.pathname === "/" ||
    SHELL_URLS.some((path) => url.pathname === path);

  if (!isShellPath) {
    return;
  }

  event.respondWith(
    (async () => {
      const preferredPath = url.pathname;
      const cached = await matchShellInCaches(event.request.url, preferredPath);

      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);

        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(preferredPath, response.clone());
        }

        return response;
      } catch {
        const fallback = await matchShellInCaches(event.request.url);

        if (fallback) {
          return fallback;
        }

        return new Response(
          `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CantemosTodos</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#232323;color:#e8e8e8;font-family:system-ui,sans-serif;text-align:center}</style></head><body><p>Sin conexión. Abrí la app con WiFi al menos una vez para dejarla lista en el celular.</p></body></html>`,
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
            },
          },
        );
      }
    })(),
  );
});

const shellCacheFirst = new CacheFirst({
  cacheName: SHELL_CACHE,
  plugins: [
    new ExpirationPlugin({
      maxEntries: 16,
      maxAgeSeconds: 365 * 24 * 60 * 60,
      maxAgeFrom: "last-used",
    }),
  ],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  precacheOptions: {
    navigateFallback: "/salas",
    navigateFallbackAllowlist: [APP_SHELL_PATHS],
    navigateFallbackDenylist: [/^\/api\//, /^\/serwist\//],
  },
  runtimeCaching: [
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        (pathname === "/salas" ||
          pathname === "/individual" ||
          pathname === "/pwa-boot.html" ||
          pathname === "/~offline" ||
          pathname === "/auth/login" ||
          pathname === "/"),
      handler: shellCacheFirst,
    },
    {
      matcher: ({ request, url: { pathname }, sameOrigin }) =>
        sameOrigin &&
        (request.mode === "navigate" || request.destination === "document") &&
        pathname === "/salas",
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE_NAME.html,
        networkTimeoutSeconds: 4,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 8,
            maxAgeSeconds: 365 * 24 * 60 * 60,
            maxAgeFrom: "last-used",
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/salas",
        matcher({ request }) {
          return (
            request.mode === "navigate" || request.destination === "document"
          );
        },
      },
      {
        url: "/~offline",
        matcher({ request }) {
          return (
            request.mode === "navigate" || request.destination === "document"
          );
        },
      },
    ],
  },
});

serwist.addEventListeners();
