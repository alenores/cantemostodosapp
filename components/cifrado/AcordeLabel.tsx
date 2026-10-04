import {
  formatAcordeNotacion,
  getAcordeVisible,
  getNotaLabel,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import type { Modificador, NotaAgregada, NotaIndex } from "@/lib/cifrado";

type AcordeLabelProps = {
  noteIndex: NotaIndex;
  modifier: Modificador;
  bassNoteIndex?: NotaIndex;
  agregada?: NotaAgregada;
  notacion?: NotacionAcordes;
  className?: string;
  bassClassName?: string;
  agregadaClassName?: string;
};

/**
 * Acorde principal + opcional nota sumada (número chico abajo y pegado, en <sub>)
 * + opcional bajo tras "/" (nota chica arriba, en <sup>).
 * Izquierda del / = acorde completo; derecha = solo nota del bajo.
 */
export function AcordeLabel({
  noteIndex,
  modifier,
  bassNoteIndex,
  agregada,
  notacion = "es",
  className,
  bassClassName = "text-[0.55em] font-bold leading-none",
  agregadaClassName = "text-[0.55em] font-bold leading-none",
}: AcordeLabelProps) {
  const visible = getAcordeVisible(modifier, agregada);
  const root = formatAcordeNotacion(noteIndex, visible.modifier, notacion);

  if (bassNoteIndex === undefined && visible.agregada === undefined) {
    return <span className={className}>{root}</span>;
  }

  return (
    <span className={`whitespace-nowrap leading-none ${className ?? ""}`}>
      <span>{root}</span>
      {visible.agregada !== undefined ? (
        <sub className={agregadaClassName}>{visible.agregada}</sub>
      ) : null}
      {bassNoteIndex !== undefined ? (
        <>
          <span>/</span>
          <sup className={bassClassName}>{getNotaLabel(bassNoteIndex, notacion)}</sup>
        </>
      ) : null}
    </span>
  );
}

export function formatAcordeAriaLabel(
  noteIndex: NotaIndex,
  modifier: Modificador,
  notacion: NotacionAcordes = "es",
  bassNoteIndex?: NotaIndex,
  agregada?: NotaAgregada,
): string {
  const visible = getAcordeVisible(modifier, agregada);
  const root = formatAcordeNotacion(noteIndex, visible.modifier, notacion);
  const sumada =
    visible.agregada !== undefined ? ` con ${visible.agregada} sumada` : "";

  if (bassNoteIndex === undefined) {
    return `${root}${sumada}`;
  }

  const bass = getNotaLabel(bassNoteIndex, notacion);
  return `${root}${sumada} con bajo en ${bass}`;
}
