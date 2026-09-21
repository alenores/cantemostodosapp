import {
  OFFLINE_SHELL_CACHE,
  OFFLINE_SHELL_URLS,
} from "@/lib/offline/shell-urls";

/** Rutas que deben quedar guardadas en el celular para abrir sin internet. */
export const OFFLINE_WARM_ROUTES = [...OFFLINE_SHELL_URLS, "/manifest.json"] as const;

function cacheUrlsInServiceWorker(urls: readonly string[]): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({
      type: "CACHE_URLS",
      payload: {
        urlsToCache: urls.map((url) => [
          url,
          { credentials: "include" as RequestCredentials },
        ]),
      },
    });
  });
}

async function fetchWarmRoutes(urls: readonly string[]): Promise<boolean> {
  const cache =
    typeof caches !== "undefined"
      ? await caches.open(OFFLINE_SHELL_CACHE)
      : null;

  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          credentials: "include",
          cache: "reload",
        });

        if (cache && response.ok) {
          await cache.put(url, response.clone());
        }
        return response.ok;
      } catch {
        return false;
      }
    }),
  );

  if (!cache || results.some((ok) => !ok)) return false;

  const saved = await Promise.all(urls.map((url) => cache.match(url)));
  return saved.every(Boolean);
}

/** Guarda en el celular las pantallas clave (con sesión si existe). */
export async function warmOfflineCache(): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return false;
  }

  cacheUrlsInServiceWorker(OFFLINE_WARM_ROUTES);
  return fetchWarmRoutes(OFFLINE_WARM_ROUTES);
}
