import type { LecturaFabItem } from "@/components/home/LecturaFabOption";
import { ListMusic, Search, SkipBack, SkipForward } from "lucide-react";

export function buildColaLecturaNavItems({
  pendientesCount,
  onBuscar,
  onSiguiente,
  onCola,
}: {
  pendientesCount: number;
  onBuscar: () => void;
  onSiguiente: () => void;
  onCola: () => void;
}): LecturaFabItem[] {
  return [
    {
      key: "buscar",
      icon: Search,
      label: "Buscar",
      onClick: onBuscar,
    },
    {
      key: "siguiente",
      icon: SkipForward,
      label: "Siguiente",
      iconAfter: true,
      disabled: pendientesCount === 0,
      onClick: onSiguiente,
    },
    {
      key: "cola",
      icon: ListMusic,
      label: `Fila · ${pendientesCount}`,
      onClick: onCola,
    },
  ];
}

export function buildCancioneroLecturaNavItems({
  tieneAnterior,
  tieneSiguiente,
  onAnterior,
  onSiguiente,
}: {
  tieneAnterior: boolean;
  tieneSiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
}): LecturaFabItem[] {
  return [
    {
      key: "anterior",
      icon: SkipBack,
      label: "Anterior",
      disabled: !tieneAnterior,
      className: "lg:hidden",
      onClick: onAnterior,
    },
    {
      key: "siguiente",
      icon: SkipForward,
      label: "Siguiente",
      iconAfter: true,
      disabled: !tieneSiguiente,
      className: "lg:hidden",
      onClick: onSiguiente,
    },
  ];
}
