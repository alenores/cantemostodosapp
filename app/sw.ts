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

const APP_SHELL_PATHS = /^\/($|salas(\/.*)?|cancionero(\/.*)?|auth\/login|~offline|pwa-boot\.html)$/;

const shellCacheFirst = new CacheFirst({
  cacheName: "app-shell-offline",
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
          pathname === "/pwa-boot.html" ||
          pathname === "/~offline" ||
          pathname === "/auth/login"),
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
