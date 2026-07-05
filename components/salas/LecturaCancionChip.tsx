"use client";

import {
  getLetraModoLecturaHorizontalPadding,
  getLecturaTopChipMaxWidthCss,
  getLecturaTopChromeTopCss,
} from "@/lib/sala-layout";

export const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";

type LecturaCancionChipProps = {
  nombre: string;
  artista?: string | null;
  nombreRevealKey: string;
  nombreRevealClass: string;
  reservarColaLateral?: boolean;
};

function LecturaCancionChipContent({
  nombre,
  artista,
  nombreRevealKey,
  nombreRevealClass,
}: Pick<
  LecturaCancionChipProps,
  "nombre" | "artista" | "nombreRevealKey" | "nombreRevealClass"
>) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      <span
        key={nombreRevealKey}
        className={`min-w-0 shrink truncate text-[12px] font-semibold leading-snug text-text-primary ${nombreRevealClass}`}
      >
        {nombre}
      </span>
      {artista ? (
        <>
          <span
            className="shrink-0 text-[10px] leading-snug text-accent/60"
            aria-hidden="true"
          >
            ·
          </span>
          <span className="min-w-0 shrink truncate text-[10px] leading-snug text-accent">
            {artista}
          </span>
        </>
      ) : null}
    </div>
  );
}

export default function LecturaCancionChip({
  nombre,
  artista,
  nombreRevealKey,
  nombreRevealClass,
  reservarColaLateral = false,
}: LecturaCancionChipProps) {
  return (
    <div
      className={`pointer-events-none fixed z-[45] w-max min-w-0 px-2.5 py-1.5 lg:hidden ${LECTURA_TOP_CHIP}`}
      style={{
        top: getLecturaTopChromeTopCss(),
        left: getLetraModoLecturaHorizontalPadding(),
        maxWidth: getLecturaTopChipMaxWidthCss(reservarColaLateral),
      }}
      aria-label={`${nombre}${artista ? ` · ${artista}` : ""}`}
    >
      <LecturaCancionChipContent
        nombre={nombre}
        artista={artista}
        nombreRevealKey={nombreRevealKey}
        nombreRevealClass={nombreRevealClass}
      />
    </div>
  );
}
