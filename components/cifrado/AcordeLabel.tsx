import {
  formatAcordeNotacion,
  getNotaLabel,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import type { Modificador, NotaIndex } from "@/lib/cifrado";

type AcordeLabelProps = {
  noteIndex: NotaIndex;
  modifier: Modificador;
  bassNoteIndex?: NotaIndex;
  notacion?: NotacionAcordes;
  className?: string;
  bassClassName?: string;
};

/**
 * Acorde principal + opcional bajo tras "/" (nota chica en <sup>).
 * Izquierda del / = acorde completo; derecha = solo nota del bajo.
 */
export function AcordeLabel({
  noteIndex,
  modifier,
  bassNoteIndex,
  notacion = "es",
  className,
  bassClassName = "text-[0.55em] font-bold leading-none",
}: AcordeLabelProps) {
  const root = formatAcordeNotacion(noteIndex, modifier, notacion);

  if (bassNoteIndex === undefined) {
    return <span className={className}>{root}</span>;
  }

  const bass = getNotaLabel(bassNoteIndex, notacion);

  return (
    <span className={`whitespace-nowrap leading-none ${className ?? ""}`}>
      <span>{root}</span>
      <span>/</span>
      <sup className={bassClassName}>{bass}</sup>
    </span>
  );
}

export function formatAcordeAriaLabel(
  noteIndex: NotaIndex,
  modifier: Modificador,
  notacion: NotacionAcordes = "es",
  bassNoteIndex?: NotaIndex,
): string {
  const root = formatAcordeNotacion(noteIndex, modifier, notacion);

  if (bassNoteIndex === undefined) {
    return root;
  }

  const bass = getNotaLabel(bassNoteIndex, notacion);
  return `${root} con bajo en ${bass}`;
}
