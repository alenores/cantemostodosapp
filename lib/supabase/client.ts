import {
  BROWSER_AUTH_COOKIE,
  PWA_AUTH_COOKIE,
  resolveAuthCookieName,
} from "@/lib/supabase/auth-cookie";
import { avisarFallaDeRed } from "@/lib/conexion";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const PWA_SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * Tope de espera de un pedido a la base (2026-09-27).
 *
 * Sin tope, con una rayita de señal —hay red pero no pasa nada— un pedido podía quedar esperando
 * minutos: la sesión, la cola, el cancionero, todo colgado y la app en un limbo. Con el tope, el
 * pedido falla con su motivo y se le avisa a `lib/conexion.ts`, que confirma si la señal no alcanza
 * y pasa la app al modo sin señal.
 */
const TOPE_PEDIDO_MS = 15_000;

/**
 * Las subidas de archivos (fotos de perfil, avatares) quedan afuera: con señal floja pueden tardar
 * más que el tope y cortarlas sería peor.
 */
function esSubidaDeArchivo(url: string, init?: RequestInit): boolean {
  const metodo = (init?.method ?? "GET").toUpperCase();
  return metodo !== "GET" && metodo !== "HEAD" && url.includes("/storage/v1/object");
}

function urlDe(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

async function fetchConTope(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (esSubidaDeArchivo(urlDe(input), init)) return fetch(input, init);

  const control = new AbortController();
  const original = init?.signal;
  /** Si quien pidió cancela, se cancela igual que antes. */
  if (original) {
    if (original.aborted) control.abort(original.reason);
    else original.addEventListener("abort", () => control.abort(original.reason), { once: true });
  }
  let vencio = false;
  const corte = setTimeout(() => {
    vencio = true;
    control.abort();
  }, TOPE_PEDIDO_MS);

  try {
    return await fetch(input, { ...init, signal: control.signal });
  } catch (error) {
    /** Cancelado a propósito por quien pidió: no es un problema de señal. */
    if (!vencio && original?.aborted) throw error;
    avisarFallaDeRed();
    if (vencio) {
      throw new TypeError("La conexión no respondió a tiempo. Probá de nuevo cuando tengas mejor señal.");
    }
    throw error;
  } finally {
    clearTimeout(corte);
  }
}

let browserClient: SupabaseClient | undefined;
let browserClientCookieName: string | undefined;

function readDocumentCookies(): { name: string }[] {
  if (typeof document === "undefined") {
    return [];
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ name: part.split("=")[0] ?? "" }))
    .filter((cookie) => cookie.name.length > 0);
}

export function createClient() {
  const cookieName = resolveAuthCookieName(readDocumentCookies());

  if (browserClient && browserClientCookieName !== cookieName) {
    browserClient = undefined;
  }

  if (!browserClient) {
    browserClientCookieName = cookieName;

    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: cookieName,
          ...(cookieName === PWA_AUTH_COOKIE
            ? { maxAge: PWA_SESSION_MAX_AGE_SECONDS }
            : {}),
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: { fetch: fetchConTope },
      },
    );
  }

  return browserClient;
}

export async function ensureRealtimeAuth(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn("[realtime] sin sesión activa");
    return false;
  }

  await supabase.realtime.setAuth(session.access_token);
  return true;
}
