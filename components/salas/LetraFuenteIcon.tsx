import type { ResultadoIconoTipo } from "@/lib/buscador";
import { Bookmark, FileText, Globe2, Star } from "lucide-react";

const ICONO_STYLE: Record<
  ResultadoIconoTipo,
  { sizeClass: string; color: string }
> = {
  cancionero: { sizeClass: "size-6", color: "var(--cancionero-icon)" },
  practica: { sizeClass: "size-6", color: "var(--accent-vocal)" },
  acordes: { sizeClass: "size-5", color: "#4A9388" },
  cifra: { sizeClass: "size-5", color: "var(--voz-config)" },
};

type LetraFuenteIconProps = {
  tipo: ResultadoIconoTipo;
  /** Marca una canción con edición avanzada. */
  premium?: boolean;
  /** Marca una canción guardada en Favoritas. */
  favorita?: boolean;
  compact?: boolean;
  /** Mismo tamaño (size-5) para hoja y web — p. ej. cards de cola. */
  uniform?: boolean;
  /** size-3: etiqueta de origen bajo el artista (vista control). */
  tiny?: boolean;
};

export default function LetraFuenteIcon({
  tipo,
  premium = false,
  favorita = false,
  compact = false,
  uniform = false,
  tiny = false,
}: LetraFuenteIconProps) {
  const base = ICONO_STYLE[tipo];
  const sizeClass = tiny
    ? "size-3"
    : compact
      ? "size-4"
      : uniform
        ? "size-5"
        : base.sizeClass;
  const className = `${sizeClass} shrink-0`;

  if (favorita) {
    return (
      <Bookmark
        className={`${className} fill-current`}
        style={{ color: "var(--tuner-in-tune)" }}
        aria-label="En Favoritas"
      />
    );
  }

  if (tipo === "practica") {
    return (
      <Star
        className={`${className} fill-current`}
        style={{ color: "var(--accent-vocal)" }}
        aria-label="Entrenador de canciones"
      />
    );
  }

  if (premium) {
    return (
      <FileText
        className={className}
        style={{ color: "var(--tuner-cerca)" }}
        aria-label="Canción con cifrado avanzado"
      />
    );
  }

  if (tipo === "cifra") {
    return (
      <Globe2
        className={className}
        style={{ color: base.color }}
        aria-hidden="true"
      />
    );
  }

  if (tipo === "cancionero") {
    return (
      <FileText
        className={className}
        style={{ color: "var(--text-faint)" }}
        aria-label="Canción simple"
      />
    );
  }

  return (
    <FileText
      className={className}
      style={{ color: base.color }}
      aria-hidden="true"
    />
  );
}
