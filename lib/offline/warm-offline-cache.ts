/** Rutas que deben quedar guardadas en el celular para abrir sin internet. */
export const OFFLINE_WARM_ROUTES = [
  "/pwa-boot.html",
  "/salas",
  "/~offline",
  "/auth/login",
  "/manifest.json",
] as const;

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

async function fetchWarmRoutes(urls: readonly string[]): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetch(url, {
          credentials: "include",
          cache: "reload",
        });
      } catch {
        // Sin red o fallo puntual: el SW puede tener copia previa.
      }
    }),
  );
}

/** Guarda en el celular las pantallas clave (con sesión si existe). */
export async function warmOfflineCache(): Promise<void> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  cacheUrlsInServiceWorker(OFFLINE_WARM_ROUTES);
  await fetchWarmRoutes(OFFLINE_WARM_ROUTES);
}
