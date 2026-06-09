import type { ResultadoIconoTipo } from "@/lib/buscador";
import { ExternalLink, FileText } from "lucide-react";

const ICONO_STYLE: Record<
  ResultadoIconoTipo,
  { sizeClass: string; color: string }
> = {
  cancionero: { sizeClass: "size-6", color: "#9AE0C8" },
  acordes: { sizeClass: "size-5", color: "#4A9388" },
  cifra: { sizeClass: "size-5", color: "var(--accent)" },
};

type LetraFuenteIconProps = {
  tipo: ResultadoIconoTipo;
  compact?: boolean;
};

export default function LetraFuenteIcon({
  tipo,
  compact = false,
}: LetraFuenteIconProps) {
  const base = ICONO_STYLE[tipo];
  const sizeClass = compact ? "size-4" : base.sizeClass;
  const className = `${sizeClass} shrink-0`;

  if (tipo === "cifra") {
    return (
      <ExternalLink
        className={className}
        style={{ color: base.color }}
        aria-hidden="true"
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
