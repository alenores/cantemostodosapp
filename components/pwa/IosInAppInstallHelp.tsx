"use client";

import type { ReactNode } from "react";
import { OfflineIcon } from "@/components/pwa/OfflineIcon";

function HeaderShareIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center overflow-hidden p-1"
      style={{
        width: "36px",
        height: "36px",
        background: "var(--chalk)",
        border: "1px solid var(--chalk-dark)",
        borderRadius: "9px",
      }}
    >
      <span className="inline-flex h-full w-full items-center justify-center text-[var(--chapa)]">
        <OfflineIcon className="h-[30px] w-[30px]" />
      </span>
    </span>
  );
}

function SafariInstallStepCard({
  number,
  visual,
  title,
  detail,
}: {
  number: number;
  visual: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div
      className="relative flex flex-col items-center gap-2 px-3 pb-3 pt-4"
      style={{
        background: "color-mix(in srgb, var(--chalk) 65%, transparent)",
        border: "0.5px solid var(--chalk-dark)",
        borderRadius: "10px",
      }}
    >
      <span
        aria-hidden
        className="absolute left-2.5 top-2 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        style={{
          background: "var(--chapa)",
          color: "white",
        }}
      >
        {number}
      </span>
      <div className="flex min-h-[56px] items-center justify-center pt-1">{visual}</div>
      <p className="m-0 text-center text-[12px] font-semibold leading-snug" style={{ color: "var(--rock)" }}>
        {title}
      </p>
      {detail ? (
        <p className="m-0 text-center text-[10px] italic leading-snug" style={{ color: "var(--rock-light)" }}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function InAppBrowserMenuLargeIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex h-14 w-14 items-center justify-center rounded-xl"
      style={{ background: "var(--chalk)", border: "1px solid var(--chalk-dark)" }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="1.8" fill="#378ADD" />
        <circle cx="12" cy="12" r="1.8" fill="#378ADD" />
        <circle cx="12" cy="19" r="1.8" fill="#378ADD" />
      </svg>
    </span>
  );
}

/** iPhone abierto desde WhatsApp o Instagram: primero hay que salir a Safari. */
export function IosInAppInstallHelp() {
  return (
    <div
      className="w-full overflow-hidden shadow-sm"
      style={{
        background: "var(--chalk-mid)",
        border: "1.5px solid var(--chalk-dark)",
        borderRadius: "16px",
      }}
    >
      <div className="flex w-full items-center gap-2 px-3 py-2.5 text-left" style={{ background: "var(--chalk-mid)" }}>
        <HeaderShareIcon />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold leading-snug" style={{ color: "var(--rock)" }}>
            Instalá la App para uso SIN Conexión
          </p>
          <p className="m-0 text-[10px] leading-snug" style={{ color: "var(--rock-mid)" }}>
            Seguí estos 3 pasos:
          </p>
        </div>
      </div>
      <div className="space-y-2 p-3" style={{ borderTop: "1px solid var(--chalk-dark)" }}>
        <SafariInstallStepCard
          number={1}
          visual={<InAppBrowserMenuLargeIcon />}
          title={
            <>
              Tocá los <span className="font-bold">tres puntitos ⋮</span> o el ícono de Safari
            </>
          }
          detail={
            <>
              y elegí <span className="font-semibold not-italic">&apos;Abrir en Safari&apos;</span> o{" "}
              <span className="font-semibold not-italic">&apos;Abrir en navegador externo&apos;</span>.
              <br />
              Desde ahí se completa la instalación
            </>
          }
        />
        <p className="m-0 px-1 text-center text-[10px] italic leading-snug" style={{ color: "var(--rock-mid)" }}>
          Instagram, WhatsApp y otras apps abren los links en su propio navegador. Para instalar la app se
          necesita estar en un navegador tradicional.
        </p>
      </div>
    </div>
  );
}
