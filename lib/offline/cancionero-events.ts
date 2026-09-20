export const CANCIONERO_SYNC_EVENT = "cancionero-sync-finished";
export const CANCIONERO_CHECK_EVENT = "cancionero-check-updates";

export function requestCancioneroUpdateCheck(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CANCIONERO_CHECK_EVENT));
  }
}

export function dispatchCancioneroSyncFinished(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CANCIONERO_SYNC_EVENT));
}
