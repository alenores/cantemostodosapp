export const COLA_BAR_HEIGHT_PX = 60;
export const COLA_AVISO_SHOW_DELAY_MS = 400;

export function getColaOpenHeight(
  viewportHeight: number,
  expanded: boolean,
): number {
  const topReservePx = expanded ? 48 : 72;

  return viewportHeight - COLA_BAR_HEIGHT_PX - topReservePx;
}
