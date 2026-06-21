"use client";

import AppLogoMark from "@/components/pwa/AppLogoMark";
import InstallPwaButton from "@/components/pwa/InstallPwaButton";
import { PWA_HOME_ICON_LABEL } from "@/lib/pwa-home-label";

const ANDROID_INSTALL_BENEFITS = [
  "Funciona sin internet en la reunión",
  "Canciones guardadas en el celular",
  "Letras en tiempo real con amigos",
] as const;

export default function AndroidInstallHero() {
  return (
    <div className="rounded-2xl border border-accent/40 bg-bg-card px-4 py-5 text-center shadow-sm">
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

      <p className="m-0 mb-1.5 text-[15px] font-semibold text-text-primary">
        Instalá la app en tu celular
      </p>
      <p className="m-0 mb-4 text-xs leading-relaxed text-text-secondary">
        Para usarla sin conexión y tener el ícono de {PWA_HOME_ICON_LABEL} en tu pantalla de
        inicio, instalá la app desde acá.
      </p>

      <div className="mb-4 flex flex-col items-center gap-1.5">
        {ANDROID_INSTALL_BENEFITS.map((text) => (
          <div
            key={text}
            className="flex items-center gap-2 text-xs text-text-secondary"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="shrink-0 text-accent"
            >
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
              <path
                d="M5 8l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {text}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-6 w-full items-start justify-center text-accent" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3v11M10 14l-4-4M10 14l4-4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <InstallPwaButton fullWidth />
        <p className="m-0 text-[11px] text-text-muted">
          Si el botón no se activa, abrí el menú ⋮ y buscá «Instalar app» o «Agregar a inicio».
        </p>
      </div>
    </div>
  );
}
