/** Estado compartido de scroll de lectura entre dispositivos en una sala. */
export type LecturaScrollSyncState = {
  level: number;
  /** Posición normalizada (0–1) sobre el rango de scroll disponible. */
  offsetRatio: number;
  /** Marca de tiempo (Date.now()) en la que se ancló offsetRatio. */
  anchorMs: number;
};

export type LecturaScrollSyncMessage = LecturaScrollSyncState & {
  contentKey: string;
  senderId: string;
};

export const LECTURA_SCROLL_SYNC_EVENT = "lectura_scroll";

export function clampOffsetRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}
