/** Tiempo de espera tras intentar abrir Chrome, antes de mostrar los pasos a mano. */
export const ANDROID_IN_APP_CHROME_INTENT_WAIT_MS = 750;

export function buildChromeIntentUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl);
  const scheme = parsed.protocol.replace(":", "");
  const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  return `intent://${intentPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

/** Abre esta página en Chrome. Si el intento falla al asignar, prueba el enlace alternativo. */
export function openPageInChrome(): void {
  if (typeof window === "undefined") return;

  const pageUrl = window.location.href;

  try {
    window.location.href = buildChromeIntentUrl(pageUrl);
    return;
  } catch {
    // Sigue con el enlace alternativo de Chrome.
  }

  window.location.href = `googlechrome://navigate?url=${encodeURIComponent(pageUrl)}`;
}
