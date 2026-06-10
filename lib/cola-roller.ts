import { getColaVariant } from "@/lib/cola-logic";
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
const ACTIVE_CENTER_BOOST = 1.025;
const ACTIVE_CENTER_ZONE = 0.35;

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

/**
 * Rodillo con eje calibrado en la activa (scroll arriba) y distancia por viewport al scrollear:
 * - Activa en el eje: realce sutil
 * - Arriba / abajo del eje: achica, apaga o desvanece según zona
 */
export function getColaRollerStyle(
  items: ColaItem[],
  index: number,
  centerDistance: ColaCenterDistance,
): ColaRollerStyle {
  const item = items[index];
  const variant = getColaVariant(item, items);
  const dist = clamp(centerDistance, -1, 1);
  const absDist = Math.abs(dist);

  let scale = Math.max(MIN_SCALE, 1 - absDist * SCALE_RANGE);
  let opacity = 1;
  const filterParts: string[] = [];
  let transformOrigin = "center center";
  let zIndex: number | undefined;

  if (variant === "activa" && absDist < ACTIVE_CENTER_ZONE) {
    const boost = lerp(ACTIVE_CENTER_BOOST, 1, absDist / ACTIVE_CENTER_ZONE);
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
  return `scale(${style.scale})`;
}

/** Chip "Tocada": solo en la más reciente, casi imperceptible. */
export function shouldShowTocadaChip(items: ColaItem[], index: number): boolean {
  const item = items[index];

  if (item.estado !== "tocada") {
    return false;
  }

  return getTocadaRank(items, index) === 1;
}
