export function triggerHaptic(durationMs = 12): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(durationMs);
  }
}
