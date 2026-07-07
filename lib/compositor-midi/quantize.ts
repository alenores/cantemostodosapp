import { getCompositorCycleDurationSeconds } from "@/lib/compositor-timeline";
import type { CompositorPiece } from "@/lib/compositor";

export function secondsToStep(
  seconds: number,
  piece: Pick<CompositorPiece, "bpm" | "cycleGolpes" | "cycleBeatDurations" | "subdivisionsPerGolpe">,
): number {
  const cycleSeconds = getCompositorCycleDurationSeconds(piece as CompositorPiece);

  if (cycleSeconds <= 0) {
    return 0;
  }

  const gridSteps = piece.cycleGolpes * piece.subdivisionsPerGolpe;
  const stepSeconds = cycleSeconds / gridSteps;
  return Math.round(seconds / stepSeconds);
}

export function durationSecondsToSteps(
  durationSeconds: number,
  piece: Pick<CompositorPiece, "bpm" | "cycleGolpes" | "cycleBeatDurations" | "subdivisionsPerGolpe">,
): number {
  const cycleSeconds = getCompositorCycleDurationSeconds(piece as CompositorPiece);

  if (cycleSeconds <= 0) {
    return 1;
  }

  const gridSteps = piece.cycleGolpes * piece.subdivisionsPerGolpe;
  const stepSeconds = cycleSeconds / gridSteps;
  return Math.max(1, Math.round(durationSeconds / stepSeconds));
}

export function getGridSteps(
  cycleGolpes: number,
  subdivisionsPerGolpe: number,
): number {
  return cycleGolpes * subdivisionsPerGolpe;
}

export function isStepOutsideCycle(
  startStep: number,
  durationSteps: number,
  gridSteps: number,
): boolean {
  return startStep < 0 || startStep >= gridSteps || startStep + durationSteps > gridSteps;
}
