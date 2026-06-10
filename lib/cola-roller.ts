import type { ColaItem } from "@/types";

export type ColaRollerStyle = {
  scale: number;
  opacity: number;
  filter?: string;
  transformOrigin: string;
  zIndex?: number;
  /** Compensa el espacio visual al escalar (px negativos en margen inferior). */
  marginBottom: number;
};

/** -1 = borde superior visible, 0 = centro, +1 = borde inferior visible. */
export type ColaCenterDistance = number;

const ROLLER_CARD_EST_HEIGHT_PX = 56;
const MIN_SCALE = 0.86;
const SCALE_RANGE = 0.14;
const CENTER_ROW_BOOST = 1.025;
const CENTER_ROW_ZONE = 0.35;
/** Paso entre filas para simetría 1=5, 2=4 respecto de la activa (fila 3). */
const ROW_INDEX_STEP = 0.24;
/** Extra de ancho uniforme (todas iguales; 1.03 evita roce lateral en filas 2–4). */
const ROLLER_WIDTH_SCALE = 1.03;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1);
}

function scaleMargin(scale: number): number {
  return Math.round((scale - 1) * ROLLER_CARD_EST_HEIGHT_PX);
}

function getTocadaRank(items: ColaItem[], index: number): number {
  const tocadaIndices = items
    .map((colaItem, itemIndex) =>
      colaItem.estado === "tocada" ? itemIndex : -1,
    )
    .filter((itemIndex) => itemIndex >= 0);

  return tocadaIndices.indexOf(index);
}

/** Estimación inicial antes del primer layout (centro ≈ canción activa). */
export function estimateColaCenterDistance(
  items: ColaItem[],
  index: number,
): ColaCenterDistance {
  const activeIndex = items.findIndex((item) => item.estado === "activa");

  if (activeIndex < 0) {
    return 0;
  }

  return clamp((index - activeIndex) * 0.24, -1, 1);
}

/** Fila más cercana al eje focal (única que recibe el boost de tamaño al scrollear). */
export function getColaFocalRowIndex(
  distances: Record<number, ColaCenterDistance>,
  itemCount: number,
  fallbackIndex = -1,
): number {
  let focalIndex = fallbackIndex;
  let bestAbs = Infinity;

  for (let rowIndex = 0; rowIndex < itemCount; rowIndex += 1) {
    const dist = distances[rowIndex];

    if (dist === undefined) {
      continue;
    }

    const abs = Math.abs(dist);

    if (abs < bestAbs) {
      bestAbs = abs;
      focalIndex = rowIndex;
    }
  }

  return focalIndex;
}

/**
 * Rodillo con eje calibrado en la activa (scroll arriba) y distancia por viewport al scrollear.
 * Escala simétrica 1=5, 2=4; el realce de tamaño solo en la fila más cercana al eje.
 */
export function getColaRollerStyle(
  items: ColaItem[],
  index: number,
  centerDistance: ColaCenterDistance,
  isFocalRow = false,
): ColaRollerStyle {
  const item = items[index];
  const dist = clamp(centerDistance, -1, 1);
  const viewportAbs = Math.abs(dist);

  const activeIndex = items.findIndex((colaItem) => colaItem.estado === "activa");
  let absDistForScale = viewportAbs;

  if (activeIndex >= 0) {
    const indexAbs = Math.abs(
      clamp((index - activeIndex) * ROW_INDEX_STEP, -1, 1),
    );
    // Evita que arriba se midan más cerca del eje que su par abajo (1>5, 2>4).
    absDistForScale = Math.max(viewportAbs, indexAbs);
  }

  let scale = Math.max(MIN_SCALE, 1 - absDistForScale * SCALE_RANGE);
  let opacity = 1;
  const filterParts: string[] = [];
  let transformOrigin = "center center";
  let zIndex: number | undefined;

  if (isFocalRow && viewportAbs < CENTER_ROW_ZONE) {
    const boost = lerp(CENTER_ROW_BOOST, 1, viewportAbs / CENTER_ROW_ZONE);
    scale = Math.min(boost, Math.max(scale, 1));
    zIndex = 2;
  }

  if (dist < 0) {
    const t = clamp(-dist, 0, 1);
    transformOrigin = "center top";

    opacity = lerp(1, 0.16, t);
    filterParts.push(
      `saturate(${lerp(1, 0.18, t)}) brightness(${lerp(1, 0.8, t)})`,
    );

    if (item.estado === "tocada") {
      const rank = getTocadaRank(items, index);
      const rankFade = rank === 0 ? 0.12 : 0.06;
      opacity = Math.min(opacity, lerp(0.42, 0.14, t) - rankFade * t);
    }
  } else if (dist > 0) {
    const t = clamp(dist, 0, 1);
    transformOrigin = "center bottom";

    opacity = lerp(1, 0.76, t);

    if (t > 0.5) {
      const blurT = (t - 0.5) / 0.5;
      filterParts.push(`blur(${lerp(0, 0.55, blurT)}px)`);
    }
  }

  return {
    scale,
    opacity,
    filter: filterParts.length > 0 ? filterParts.join(" ") : undefined,
    transformOrigin,
    zIndex,
    marginBottom: scaleMargin(scale),
  };
}

export function getColaRollerTransform(style: ColaRollerStyle): string {
  const widthScale = style.scale * ROLLER_WIDTH_SCALE;
  return `scale(${widthScale}, ${style.scale})`;
}

/** Chip "Tocada": solo en la más reciente, casi imperceptible. */
export function shouldShowTocadaChip(items: ColaItem[], index: number): boolean {
  const item = items[index];

  if (item.estado !== "tocada") {
    return false;
  }

  return getTocadaRank(items, index) === 1;
}
