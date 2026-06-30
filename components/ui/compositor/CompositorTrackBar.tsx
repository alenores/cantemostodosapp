"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  getCompositorTrack,
  getInstrumentLabel,
  type CompositorInstrumentId,
  type CompositorPiece,
} from "@/lib/compositor";
import {
  COMPOSITOR_HELP_CAPAS,
  RITMO_LABEL_CAPAS,
} from "@/lib/ritmo-terminologia";

type CompositorTrackBarProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  disabled?: boolean;
  onSelectTrack: (instrumentId: CompositorInstrumentId) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
};

export function CompositorTrackBar({
  piece,
  activeTrackId,
  disabled = false,
  onSelectTrack,
  onToggleTrack,
}: CompositorTrackBarProps) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
        {RITMO_LABEL_CAPAS}
      </p>
      <p className="mt-1 text-[11px] text-text-muted">{COMPOSITOR_HELP_CAPAS}</p>

      <div className="mt-3 flex flex-col gap-2">
        {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
          const track = getCompositorTrack(piece, option.id);
          const isActive = activeTrackId === option.id;

          return (
            <div
              key={option.id}
              className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${
                isActive
                  ? "border-compositor-config-border bg-compositor-config-bg"
                  : "border-border bg-bg-dark"
              }`}
            >
              <TapButton
                type="button"
                disabled={disabled}
                onClick={() => onToggleTrack(option.id, !track.enabled)}
                aria-label={`${track.enabled ? "Desactivar" : "Activar"} capa ${option.label}`}
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide disabled:opacity-50 ${
                  track.enabled
                    ? "bg-compositor-config text-white"
                    : "bg-bg-cola-sheet text-text-muted"
                }`}
              >
                {track.enabled ? "On" : "Off"}
              </TapButton>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectTrack(option.id)}
                className="min-w-0 flex-1 text-left disabled:opacity-50"
              >
                <span
                  className={`text-sm font-bold ${
                    isActive ? "text-compositor-config" : "text-text-primary"
                  }`}
                >
                  {getInstrumentLabel(option.id)}
                </span>
                <span className="mt-0.5 block text-[10px] text-text-muted">
                  {isActive ? "Editando esta capa" : "Tocá para editar"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
