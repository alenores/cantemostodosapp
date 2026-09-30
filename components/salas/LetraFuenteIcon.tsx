import type { ResultadoIconoTipo } from "@/lib/buscador";
import { FileText, Globe2, MicVocal, Star } from "lucide-react";

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
  /** Reemplaza el icono de fuente por la estrella de cifrado avanzado. */
  premium?: boolean;
  compact?: boolean;
  /** Mismo tamaño (size-5) para hoja y web — p. ej. cards de cola. */
  uniform?: boolean;
};

export default function LetraFuenteIcon({
  tipo,
  premium = false,
  compact = false,
  uniform = false,
}: LetraFuenteIconProps) {
  const base = ICONO_STYLE[tipo];
  const sizeClass = compact ? "size-4" : uniform ? "size-5" : base.sizeClass;
  const className = `${sizeClass} shrink-0`;

  if (premium) {
    return (
      <Star
        className={`${className} fill-[var(--tuner-cerca)] text-[var(--tuner-cerca)]`}
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

  if (tipo === "practica") {
    return <MicVocal className={className} style={{ color: base.color }} aria-label="Entrenador de canciones" />;
  }

  return (
    <FileText
      className={className}
      style={{ color: base.color }}
      aria-hidden="true"
    />
  );
}
