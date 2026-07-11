const ACORDES_EMBED_HINT_KEY = "acordes-embed-primera-vez-v1";

/** true si el usuario ya cerró el cartel de primera visita a Acordes de Canciones. */
export function hasSeenAcordesEmbedHint(): boolean {
  try {
    return window.localStorage.getItem(ACORDES_EMBED_HINT_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAcordesEmbedHintSeen(): void {
  try {
    window.localStorage.setItem(ACORDES_EMBED_HINT_KEY, "1");
  } catch {
    // ignore
  }
}
