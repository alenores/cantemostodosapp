"use client";

import Image from "next/image";
import {
  PWA_HOME_ICON_LABEL,
  PWA_HOME_ICON_SRC,
} from "@/lib/pwa-home-label";

export default function AndroidOpenFromHomeHelp() {
  return (
    <div
      className="rounded-2xl border border-emerald-500/40 bg-bg-card px-4 py-5 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3.5 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path
              d="M6 14l5.5 5.5L22 8"
              stroke="#34d399"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <p className="m-0 mb-1 text-[17px] font-semibold text-text-primary">App instalada</p>
      <p className="m-0 mb-1 text-[13px] leading-relaxed text-emerald-400">
        <strong>Salí</strong> de este navegador
      </p>
      <p className="m-0 mb-5 text-[13px] leading-relaxed text-emerald-400">
        Buscá el <strong>ícono</strong> de la app:
      </p>

      <div className="mb-5 flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-16 w-16 overflow-hidden rounded-[14px] border border-border shadow-sm">
            <Image
              src={PWA_HOME_ICON_SRC}
              alt="Ícono de la app"
              fill
              className="object-cover"
              sizes="64px"
            />
          </div>
          <p className="m-0 text-[11px] font-semibold text-emerald-300">
            {PWA_HOME_ICON_LABEL}
          </p>
        </div>
      </div>

      <p className="m-0 text-[11px] italic leading-relaxed text-text-muted">
        La app ya está en tu celular. No hace falta entrar desde el link ni desde el navegador —
        usá siempre el ícono de inicio.
      </p>
    </div>
  );
}
