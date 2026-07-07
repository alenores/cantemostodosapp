"use client";

import { CompositorInstrumentIcon } from "@/components/ui/compositor/CompositorInstrumentIcon";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  getCompositorTrack,
  getInstrumentLabel,
  type CompositorPiece,
} from "@/lib/compositor";

const LAYER_COLOR_VAR: Record<
  (typeof COMPOSITOR_INSTRUMENT_OPTIONS)[number]["id"],
  string
> = {
  bateria: "var(--compositor-block-bateria)",
  piano: "var(--compositor-block-piano)",
  guitarra: "var(--compositor-block-guitarra)",
  viento: "var(--compositor-block-viento)",
};

type CompositorCycleLayerIconsProps = {
  piece: CompositorPiece;
  compact?: boolean;
};

export function CompositorCycleLayerIcons({
  piece,
  compact = false,
}: CompositorCycleLayerIconsProps) {
  const enabledLayers = COMPOSITOR_INSTRUMENT_OPTIONS.filter(
    (option) => getCompositorTrack(piece, option.id).enabled,
  );

  if (enabledLayers.length === 0) {
    return null;
  }

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center ${compact ? "gap-0.5" : "mt-1 gap-1"}`}
      aria-label={`Capas: ${enabledLayers.map((layer) => layer.label).join(", ")}`}
    >
      {enabledLayers.map((layer) => (
        <span
          key={layer.id}
          title={layer.label}
          className={`inline-flex items-center justify-center rounded border border-border/70 bg-bg-card/80 ${
            compact ? "size-4" : "size-6"
          }`}
          style={{ color: LAYER_COLOR_VAR[layer.id] }}
        >
          <CompositorInstrumentIcon
            instrumentId={layer.id}
            className={compact ? "size-2.5" : "size-3.5"}
          />
          <span className="sr-only">{getInstrumentLabel(layer.id)}</span>
        </span>
      ))}
    </div>
  );
}
