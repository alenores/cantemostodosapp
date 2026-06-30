"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  getCompositorTrack,
  type CompositorInstrumentId,
  type CompositorPiece,
} from "@/lib/compositor";
import {
  COMPOSITOR_HELP_CAPA_EDITAR,
  COMPOSITOR_HELP_CAPAS_REPRODUCIR,
  RITMO_LABEL_CAPAS,
} from "@/lib/ritmo-terminologia";

export type CompositorEditCapasConfig = {
  activeTrackId: CompositorInstrumentId;
  onSelectTrack: (instrumentId: CompositorInstrumentId) => void;
};

export function CompositorCapasStrip({
  activeTrackId,
  disabled = false,
  onSelectTrack,
}: CompositorEditCapasConfig & { disabled?: boolean }) {
  return (
    <div className="mt-2 rounded-[10px] border border-compositor-config-border bg-compositor-config-bg px-2.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
        {RITMO_LABEL_CAPAS} · editar
      </p>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
          const isActive = activeTrackId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTrack(option.id)}
              className={`min-w-0 rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-50 ${
                isActive
                  ? "border-compositor-config bg-compositor-config text-white shadow-[0_0_0_1px_color-mix(in_srgb,var(--compositor-config)_35%,transparent)]"
                  : "border-border/80 bg-bg-dark/80 text-text-primary"
              }`}
            >
              <span className="block truncate text-[11px] font-bold leading-tight">
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_CAPA_EDITAR}
      </p>
    </div>
  );
}

export type CompositorPlaybackCapasConfig = {
  piece: CompositorPiece;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
};

export function CompositorPlaybackCapasStrip({
  piece,
  disabled = false,
  onToggleTrack,
}: CompositorPlaybackCapasConfig & { disabled?: boolean }) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-2.5 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-tool-practice">
        {RITMO_LABEL_CAPAS} · reproducir
      </p>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
          const track = getCompositorTrack(piece, option.id);
          const isOn = track.enabled;

          return (
            <TapButton
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onToggleTrack(option.id, !isOn)}
              aria-label={`${isOn ? "Silenciar" : "Activar"} ${option.label} en la reproducción`}
              aria-pressed={isOn}
              className={`rounded-lg border px-2 py-2.5 text-center transition-colors disabled:opacity-50 ${
                isOn
                  ? "border-tool-practice/50 bg-tool-practice/15 text-text-primary"
                  : "border-border/80 bg-bg-dark/80 text-text-muted"
              }`}
            >
              <span className="block truncate text-[11px] font-bold leading-tight">
                {option.label}
              </span>
              <span
                className={`mt-1 block text-[9px] font-bold uppercase tracking-wide ${
                  isOn ? "text-tool-practice" : "text-text-muted"
                }`}
              >
                {isOn ? "Suena" : "Muda"}
              </span>
            </TapButton>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_CAPAS_REPRODUCIR}
      </p>
    </div>
  );
}
