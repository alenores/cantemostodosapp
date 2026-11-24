import type { Anotacion } from "@/lib/anotaciones-practica";
import type { AcordePos, CompasMarker } from "@/lib/cifrado";

export type MeasuredChar = {
  left: number;
  width: number;
};

export type SoftWrapSegment = {
  start: number;
  end: number;
};

export type SoftWrapExtras = {
  /** Ancho de cada casilla vacía después de la letra, donde pueden ir acordes. */
  laneWidths?: readonly number[];
  /** Ancho del nombre de cada acorde. Sale hacia la derecha desde su casilla. */
  chordLabelWidths?: ReadonlyArray<{ offset: number; width: number }>;
};

/**
 * Parte el renglón para que entre en el ancho.
 * Mira la letra y, si hay acordes, también el espacio vacío de la derecha
 * y el nombre del acorde. Corta en un espacio de la letra si puede.
 * En el espacio vacío, corta antes del acorde que no entra.
 * Los espacios de la letra que no entran no se dibujan.
 */
export function computeSoftWrapSegments(
  text: string,
  charWidths: number[],
  maxWidth: number,
  extras?: SoftWrapExtras,
): SoftWrapSegment[] {
  const chars = [...text];
  const laneWidths = extras?.laneWidths ?? [];
  const count = chars.length + laneWidths.length;

  if (maxWidth <= 0 || count === 0) {
    return [{ start: 0, end: chars.length }];
  }

  const labelWidthAt = new Map<number, number>();
  const chordOffsets = new Set<number>();

  for (const chord of extras?.chordLabelWidths ?? []) {
    chordOffsets.add(chord.offset);
    const width = Math.max(0, chord.width);
    const current = labelWidthAt.get(chord.offset) ?? 0;

    if (width > current) {
      labelWidthAt.set(chord.offset, width);
    }
  }

  function nextChordFrom(offset: number): number {
    for (let cursor = offset; cursor < count; cursor += 1) {
      if (chordOffsets.has(cursor)) {
        return cursor;
      }
    }

    return count;
  }

  function widthAt(offset: number): number {
    if (offset < chars.length) {
      return Math.max(0, charWidths[offset] ?? 0);
    }

    return Math.max(0, laneWidths[offset - chars.length] ?? 0);
  }

  function visualRight(start: number, end: number): number {
    let cells = 0;
    let edge = 0;

    for (let offset = start; offset < end; offset += 1) {
      const label = labelWidthAt.get(offset) ?? 0;

      if (label > 0) {
        edge = Math.max(edge, cells + label);
      }

      cells += widthAt(offset);
      edge = Math.max(edge, cells);
    }

    return edge;
  }

  const segments: SoftWrapSegment[] = [];
  let index = 0;

  while (index < count) {
    if (index > 0 && index < chars.length) {
      while (index < chars.length && chars[index] === " ") {
        index += 1;
      }

      if (index >= count) {
        break;
      }
    }

    let breakAfterSpace = -1;
    let cursor = index;

    while (cursor < count) {
      if (cursor > index && visualRight(index, cursor + 1) > maxWidth) {
        break;
      }

      if (cursor < chars.length && chars[cursor] === " ") {
        breakAfterSpace = cursor + 1;
      }

      cursor += 1;
    }

    if (cursor >= count) {
      segments.push({ start: index, end: count });
      break;
    }

    const overflowInText = cursor < chars.length;
    let end = cursor;
    let nextStart = cursor;

    if (overflowInText) {
      if (breakAfterSpace > index) {
        end = breakAfterSpace;
      }

      nextStart = end;

      while (nextStart < chars.length && chars[nextStart] === " ") {
        nextStart += 1;
      }
    } else {
      let lastLaneChord = -1;

      for (
        let offset = Math.max(index, chars.length);
        offset < cursor;
        offset += 1
      ) {
        if (chordOffsets.has(offset)) {
          lastLaneChord = offset;
        }
      }

      if (lastLaneChord >= chars.length) {
        end = lastLaneChord + 1;
      } else if (index < chars.length) {
        end = chars.length;
      } else {
        nextStart = chordOffsets.has(cursor) ? cursor : nextChordFrom(cursor);

        if (nextStart <= index) {
          nextStart = Math.min(count, index + 1);
        }

        if (nextStart >= count) {
          break;
        }

        index = nextStart;
        continue;
      }

      nextStart = chordOffsets.has(cursor) ? cursor : nextChordFrom(cursor);
    }

    if (end <= index) {
      end = Math.min(count, index + 1);
    }

    if (end > count) {
      end = count;
    }

    segments.push({ start: index, end });

    if (nextStart <= index) {
      nextStart = end;
    }

    if (nextStart >= count) {
      break;
    }

    index = nextStart;
  }

  return segments.length > 0 ? segments : [{ start: 0, end: chars.length }];
}

export function localizeCompasMarkers(
  markers: CompasMarker[],
  segmentStartLeftPx: number[],
): CompasMarker[][] {
  const rows = segmentStartLeftPx.map(() => [] as CompasMarker[]);

  for (const marker of markers) {
    let row = 0;

    for (let index = 0; index < segmentStartLeftPx.length; index += 1) {
      if (marker.leftPx + 0.25 >= segmentStartLeftPx[index]!) {
        row = index;
      }
    }

    const origin = segmentStartLeftPx[row] ?? 0;

    rows[row]!.push({
      ...marker,
      wrapRow: row,
      leftPx: marker.leftPx - origin,
    });
  }

  return rows;
}

export function sameWrapSegments(
  current: SoftWrapSegment[] | null,
  next: SoftWrapSegment[] | null,
): boolean {
  if (current === next) {
    return true;
  }

  if (!current || !next || current.length !== next.length) {
    return false;
  }

  return current.every(
    (segment, index) =>
      segment.start === next[index]?.start && segment.end === next[index]?.end,
  );
}

export function sameMarkerRows(
  current: CompasMarker[][] | null,
  next: CompasMarker[][] | null,
): boolean {
  if (current === next) {
    return true;
  }

  if (!current || !next || current.length !== next.length) {
    return false;
  }

  for (let row = 0; row < next.length; row += 1) {
    const left = current[row] ?? [];
    const right = next[row] ?? [];

    if (left.length !== right.length) {
      return false;
    }

    for (let index = 0; index < right.length; index += 1) {
      const a = left[index]!;
      const b = right[index]!;

      if (a.kind !== b.kind || a.wrapRow !== b.wrapRow) {
        return false;
      }

      if (Math.abs(a.leftPx - b.leftPx) > 0.5) {
        return false;
      }

      if (a.intensidad !== b.intensidad || a.compasNumero !== b.compasNumero) {
        return false;
      }
    }
  }

  return true;
}

export function sliceAcordes(
  acordes: AcordePos[],
  start: number,
  end: number,
  isLast: boolean,
): AcordePos[] {
  return acordes
    .filter((acorde) => {
      if (acorde.charOffset < start) {
        return false;
      }

      return isLast || acorde.charOffset < end;
    })
    .map((acorde) => ({
      ...acorde,
      charOffset: acorde.charOffset - start,
    }));
}

export function sliceLineAnotaciones(
  anotaciones: Anotacion[],
  start: number,
  end: number,
  isLast: boolean,
): Anotacion[] {
  const segEnd = isLast ? Number.POSITIVE_INFINITY : end;
  const sliced: Anotacion[] = [];

  for (const anotacion of anotaciones) {
    if (anotacion.tipo === "rasgueo") {
      continue;
    }

    const from = anotacion.charOffset;
    const to = anotacion.charEnd ?? from;

    if (to < start || from >= segEnd) {
      continue;
    }

    if (anotacion.charEnd == null) {
      sliced.push({ ...anotacion, charOffset: from - start });
      continue;
    }

    const clippedFrom = Math.max(from, start);
    const clippedTo = Math.min(to, segEnd - 1);

    if (clippedTo < clippedFrom) {
      continue;
    }

    sliced.push({
      ...anotacion,
      charOffset: clippedFrom - start,
      charEnd: clippedTo - start,
    });
  }

  return sliced;
}
