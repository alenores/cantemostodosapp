"use client";

import AppLogoMark from "@/components/pwa/AppLogoMark";

const ANDROID_IN_APP_STEPS = [
  "Tocá los tres puntitos (⋮) arriba a la derecha",
  'Elegí "Abrir en Chrome"',
  'Instalá la app desde ahí con el botón "Instalar app"',
] as const;

function buildChromeIntentUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl);
  const scheme = parsed.protocol.replace(":", "");
  const intentPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  return `intent://${intentPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

function openPageInChrome() {
  const pageUrl = window.location.href;

  try {
    window.location.href = buildChromeIntentUrl(pageUrl);
    return;
  } catch {
    // Fall through to alternate Chrome deep link below.
  }

  window.location.href = `googlechrome://navigate?url=${encodeURIComponent(pageUrl)}`;
}

export default function AndroidInAppBrowserInstallHelp() {
  const copyAppLink = async () => {
    const url = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        alert("¡Link copiado! Pegalo en Chrome para abrir la app.");
        return;
      }
    } catch {
      // Fall through to manual fallback below.
    }

    window.prompt("Copiá este link y abrilo en Chrome:", url);
  };

  return (
    <div className="rounded-2xl border border-accent/50 bg-bg-card px-4 py-5">
      <div className="mb-3.5 flex justify-center">
        <div className="inline-flex items-center gap-2.5 rounded-[14px] border border-border bg-bg-dark px-4 py-2.5">
          <AppLogoMark size={44} />
          <div className="text-left">
            <p className="m-0 text-[13px] font-medium leading-snug text-text-primary">
              CantemosTodos
            </p>
            <p className="m-0 text-[11px] text-text-muted">Letras en tiempo real</p>
          </div>
        </div>
      </div>

      <p className="m-0 mb-1.5 text-center text-[15px] font-semibold text-text-primary">
        Abrí la app en Chrome
      </p>
      <p className="m-0 mb-4 text-left text-xs leading-relaxed text-text-secondary">
        Estás en un navegador embebido (Instagram, WhatsApp u otra app). Para instalar la app y
        usarla sin conexión, necesitás abrirla en{" "}
        <button
          type="button"
          onClick={openPageInChrome}
          aria-label="Abrir esta página en Chrome"
          className="font-semibold text-accent underline underline-offset-2"
        >
          Chrome
        </button>
        .
      </p>

      <div className="mb-4 rounded-[10px] border border-border bg-bg-dark px-3.5 py-2.5 text-left">
        <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
          Cómo hacerlo:
        </p>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {ANDROID_IN_APP_STEPS.map((text, index) => (
            <li key={text} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold leading-none text-white"
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 text-xs leading-snug text-text-secondary">
                {text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        className="w-full rounded-xl bg-accent py-3 text-[13px] font-semibold text-white"
        onClick={() => {
          void copyAppLink();
        }}
      >
        Copiar link de la app
      </button>
    </div>
  );
}
