import { resolveAuthCookieName } from "@/lib/supabase/auth-cookie";

const BASE64_PREFIX = "base64-";

type CookieLike = { name: string; value: string };

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function leerCookieDeAuth(cookies: CookieLike[], key: string): string | null {
  const directa = cookies.find((cookie) => cookie.name === key)?.value;
  if (directa) return directa;

  const partes: string[] = [];
  for (let i = 0; ; i += 1) {
    const parte = cookies.find((cookie) => cookie.name === `${key}.${i}`)?.value;
    if (!parte) break;
    partes.push(parte);
  }

  return partes.length > 0 ? partes.join("") : null;
}

function leerSesion(cookies: CookieLike[]): { expires_at?: number; user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> } } | null {
  const key = resolveAuthCookieName(cookies);
  const raw = leerCookieDeAuth(cookies, key);
  if (!raw) return null;
  const json = raw.startsWith(BASE64_PREFIX)
    ? fromBase64Url(raw.slice(BASE64_PREFIX.length))
    : raw;
  return JSON.parse(json) as {
    expires_at?: number;
    user?: { id?: string; email?: string; user_metadata?: Record<string, unknown> };
  };
}

function expiraEn(session: { expires_at?: number; access_token?: string } | null): number | null {
  if (!session) return null;
  if (typeof session.expires_at === "number") return session.expires_at;
  return null;
}

/** Hay una sesión guardada y todavía le falta un rato para vencer. */
export function sesionSigueVigente(cookies: CookieLike[], margenSegundos = 120): boolean {
  const key = resolveAuthCookieName(cookies);
  const tieneCookie = cookies.some(
    (cookie) => cookie.name === key || cookie.name.startsWith(`${key}.`),
  );
  if (!tieneCookie) return false;

  try {
    const session = leerSesion(cookies);
    const exp = expiraEn(session);
    if (exp == null) return false;
    return exp - Date.now() / 1000 > margenSegundos;
  } catch {
    return false;
  }
}

/** Usuario ya guardado en la sesión del celular. No consulta al servidor. */
export function leerUserDeLasCookies(cookies: CookieLike[]): {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
} | null {
  try {
    const session = leerSesion(cookies);
    const id = session?.user?.id;
    if (!id) return null;
    const exp = expiraEn(session);
    if (exp != null && exp * 1000 <= Date.now()) return null;
    return {
      id,
      email: session?.user?.email,
      user_metadata: session?.user?.user_metadata,
    };
  } catch {
    return null;
  }
}
export function noHayCookieDeSesion(cookies: CookieLike[]): boolean {
  const key = resolveAuthCookieName(cookies);
  return !cookies.some(
    (cookie) => cookie.name === key || cookie.name.startsWith(`${key}.`),
  );
}
