import type { CompositorPiece } from "@/lib/compositor";
import {
  getCompasCycleGolpes,
  type BarraCompas,
  type CompasConfig,
} from "@/lib/cifrado";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

export function getBarraBeatCount(
  barra: BarraCompas,
  config: CompasConfig,
  cyclePiecesById?: ReadonlyMap<string, CompositorPiece>,
): number {
  if (barra.cycleId && cyclePiecesById?.has(barra.cycleId)) {
    const piece = cyclePiecesById.get(barra.cycleId)!;
    return Math.max(1, piece.cycleGolpes);
  }

  if (barra.intensidad?.length) {
    return barra.intensidad.length;
  }

  return getCompasCycleGolpes(config);
}

export function buildIntensidadForGolpes(
  golpes: number,
  template: MetronomeBeatLevel[],
): MetronomeBeatLevel[] {
  return Array.from({ length: golpes }, (_, index) =>
    template[index] ?? (index === 0 ? "fuerte" : "medio"),
  );
}
