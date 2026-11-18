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

/**
 * Parte el texto para que entre en el ancho. Corta en un espacio si puede.
 * Los espacios que no entran no se dibujan, para no volver a pasar el borde.
 */
export function computeSoftWrapSegments(
  text: string,
  charWidths: number[],
  maxWidth: number,
): SoftWrapSegment[] {
  if (text.length === 0 || maxWidth <= 0) {
    return [{ start: 0, end: text.length }];
  }

  const segments: SoftWrapSegment[] = [];
  let index = 0;

  while (index < text.length) {
    if (index > 0) {
      while (index < text.length && text[index] === " ") {
        index += 1;
      }

      if (index >= text.length) {
        break;
      }
    }

    let width = 0;
    let breakAfterSpace = -1;
    let cursor = index;

    while (cursor < text.length) {
      const charWidth = Math.max(0, charWidths[cursor] ?? 0);

      if (cursor > index && width + charWidth > maxWidth) {
        break;
      }

      width += charWidth;

      if (text[cursor] === " ") {
        breakAfterSpace = cursor + 1;
      }

      cursor += 1;
    }

    if (cursor >= text.length) {
      segments.push({ start: index, end: text.length });
      break;
    }

    let end = breakAfterSpace > index ? breakAfterSpace : cursor;

    if (end <= index) {
      end = index + 1;
    }

    let nextStart = end;

    if (breakAfterSpace > index) {
      while (nextStart < text.length && text[nextStart] === " ") {
        nextStart += 1;
      }
    }

    segments.push({ start: index, end });

    if (nextStart <= index) {
      nextStart = end;
    }

    if (nextStart >= text.length) {
      break;
    }

    index = nextStart;
  }

  return segments.length > 0 ? segments : [{ start: 0, end: text.length }];
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
