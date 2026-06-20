export const BROWSER_AUTH_COOKIE = "sb-browser-auth";
export const PWA_AUTH_COOKIE = "sb-pwa-auth";

type CookieLike = { name: string };

/** Elige el prefijo de cookie de auth según lo que venga en la petición. */
export function resolveAuthCookieName(cookies: CookieLike[]): string {
  if (cookies.some((cookie) => cookie.name.startsWith(`${PWA_AUTH_COOKIE}.`))) {
    return PWA_AUTH_COOKIE;
  }

  if (cookies.some((cookie) => cookie.name.startsWith(`${BROWSER_AUTH_COOKIE}.`))) {
    return BROWSER_AUTH_COOKIE;
  }

  return BROWSER_AUTH_COOKIE;
}
