import {
  OFFLINE_SHELL_CACHE,
  OFFLINE_SHELL_URLS,
} from "@/lib/offline/shell-urls";

/** Rutas que deben quedar guardadas en el celular para abrir sin internet. */
export const OFFLINE_WARM_ROUTES = [...OFFLINE_SHELL_URLS, "/manifest.json"] as const;

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

/**
 * Cada cuánto, como mucho, se vuelven a guardar las pantallas por pedido de fondo (abrir la app,
 * volver a ella, recuperar la señal). Antes se guardaban unas seis veces seguidas al abrir la app y
 * otra vez en cada vuelta: con señal floja eso hacía lento justo el arranque (2026-10-02).
 */
const PAUSA_ENTRE_GUARDADOS_MS = 10 * 60_000;

let guardadoEnCurso: Promise<boolean> | null = null;
let ultimoGuardadoOk = 0;

function guardarPantallas(): Promise<boolean> {
  guardadoEnCurso = fetchWarmRoutes(OFFLINE_WARM_ROUTES)
    .then((ok) => {
      if (ok) ultimoGuardadoOk = Date.now();
      return ok;
    })
    .finally(() => {
      guardadoEnCurso = null;
    });
  return guardadoEnCurso;
}

/**
 * Guarda en el celular las pantallas clave (con sesión si existe).
 *
 * Una sola a la vez, y no más de una cada `PAUSA_ENTRE_GUARDADOS_MS`. Con `force` (después de
 * iniciar sesión o de la descarga del Cancionero) se guarda igual: si había una en curso, se
 * espera a que termine y se hace otra, porque la sesión o el contenido pudieron cambiar.
 *
 * Mira solo si el teléfono tiene red, no el detector de señal débil: la llama también el final de
 * la descarga que pidió la persona, que no se frena por el detector. Los llamados de fondo
 * preguntan `hayConexion()` antes de llamarla.
 */
export async function warmOfflineCache(
  { force = false }: { force?: boolean } = {},
): Promise<boolean> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return false;
  }

  if (guardadoEnCurso) {
    if (!force) return guardadoEnCurso;
    await guardadoEnCurso.catch(() => false);
    if (guardadoEnCurso) return guardadoEnCurso;
  } else if (!force && Date.now() - ultimoGuardadoOk < PAUSA_ENTRE_GUARDADOS_MS) {
    return true;
  }

  return guardarPantallas();
}
