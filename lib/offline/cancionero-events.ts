export const CANCIONERO_SYNC_EVENT = "cancionero-sync-finished";

export function dispatchCancioneroSyncFinished(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CANCIONERO_SYNC_EVENT));
}
