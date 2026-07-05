import type { CSSProperties } from "react";
import { esAcordesDeCanciones, esCifraClub } from "@/lib/buscador";

export type LetraFuenteSitioBadgeVariant =
  | "cifraclub"
  | "acordesdcanciones"
  | "cancionero"
  | "default";

const BADGE_LABEL: Record<LetraFuenteSitioBadgeVariant, string> = {
  cifraclub: "cifraclub",
  acordesdcanciones: "acordesdcanciones",
  cancionero: "cancionero",
  default: "",
};

const BADGE_CLASS =
  "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide";

const BADGE_STYLE: Record<
  Exclude<LetraFuenteSitioBadgeVariant, "default">,
  CSSProperties
> = {
  cifraclub: {
    color: "var(--voz-config)",
    backgroundColor: "var(--voz-config-dim)",
    border: "1px solid var(--voz-config-border)",
  },
  acordesdcanciones: {
    color: "var(--accent)",
    backgroundColor: "var(--accent-dim)",
  },
  cancionero: {
    color: "var(--tuner-in-tune)",
    backgroundColor: "color-mix(in srgb, var(--tuner-in-tune) 12%, transparent)",
    border: "1px solid color-mix(in srgb, var(--tuner-in-tune) 35%, transparent)",
  },
};

export function getLetraFuenteSitioBadgeVariant(
  sitio: string,
  url = "",
): LetraFuenteSitioBadgeVariant {
  if (esCifraClub(sitio, url)) {
    return "cifraclub";
  }

  if (esAcordesDeCanciones(sitio, url)) {
    return "acordesdcanciones";
  }

  if (sitio === "cancionero") {
    return "cancionero";
  }

  return "default";
}

type LetraFuenteSitioBadgeProps = {
  variant: Exclude<LetraFuenteSitioBadgeVariant, "default">;
  /** Para incrustar en párrafos de texto. */
  inline?: boolean;
};

export default function LetraFuenteSitioBadge({
  variant,
  inline = false,
}: LetraFuenteSitioBadgeProps) {
  return (
    <span
      className={`${BADGE_CLASS} ${inline ? "mx-0.5 inline-flex align-middle" : ""}`}
      style={BADGE_STYLE[variant]}
    >
      {BADGE_LABEL[variant]}
    </span>
  );
}

type SitioLetraBadgeProps = {
  sitio: string;
  url?: string;
  inline?: boolean;
};

export function SitioLetraBadge({ sitio, url = "", inline = false }: SitioLetraBadgeProps) {
  const variant = getLetraFuenteSitioBadgeVariant(sitio, url);

  if (variant === "default") {
    return (
      <span
        className={`${BADGE_CLASS} bg-accent-dim text-accent ${inline ? "mx-0.5 inline-flex align-middle" : ""}`}
      >
        {sitio}
      </span>
    );
  }

  return <LetraFuenteSitioBadge variant={variant} inline={inline} />;
}
