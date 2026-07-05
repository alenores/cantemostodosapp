/** Renglón fijo en pantalla durante reproducción (0 = primero, 2 = tercero). */
export const CIFRADO_PLAYBACK_ANCHOR_SLOT = 2;

export function computeCifradoPlaybackScrollTop(
  activeLineIndex: number,
  lineOffsets: number[],
): number {
  if (lineOffsets.length === 0 || activeLineIndex < 0) {
    return 0;
  }

  const anchorSlot = Math.min(
    CIFRADO_PLAYBACK_ANCHOR_SLOT,
    lineOffsets.length - 1,
  );

  if (activeLineIndex <= anchorSlot) {
    return 0;
  }

  const anchorOffset = lineOffsets[anchorSlot] ?? 0;
  const activeOffset = lineOffsets[activeLineIndex] ?? anchorOffset;

  return Math.max(0, activeOffset - anchorOffset);
}

export function getActivePlaybackLineIndex(
  anchors: { lineIndex: number }[],
): number | null {
  if (anchors.length === 0) {
    return null;
  }

  return Math.max(...anchors.map((anchor) => anchor.lineIndex));
}
