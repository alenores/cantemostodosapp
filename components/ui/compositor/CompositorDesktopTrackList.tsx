"use client";

import { CompositorInstrumentIcon } from "@/components/ui/compositor/CompositorInstrumentIcon";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  getCompositorTrack,
  type CompositorInstrumentId,
  type CompositorPiece,
} from "@/lib/compositor";
import { getCompositorGridSteps } from "@/lib/compositor-timeline";
import { RITMO_LABEL_CAPAS } from "@/lib/ritmo-terminologia";

const TRACK_COLOR_VAR: Record<CompositorInstrumentId, string> = {
  bateria: "var(--compositor-block-bateria)",
  piano: "var(--compositor-block-piano)",
  guitarra: "var(--compositor-block-guitarra)",
  viento: "var(--compositor-block-viento)",
};

type CompositorDesktopTrackListProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  disabled?: boolean;
  onSelectTrack: (instrumentId: CompositorInstrumentId) => void;
};

function CompositorTrackRowPreview({
  piece,
  instrumentId,
}: {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
}) {
  const track = getCompositorTrack(piece, instrumentId);
  const gridSteps = getCompositorGridSteps(piece);
  const color = TRACK_COLOR_VAR[instrumentId];

  return (
    <div className="relative h-4 overflow-hidden rounded bg-bg-darker">
      {track.events.map((event) => (
        <div
          key={event.id}
          className="absolute inset-y-0 rounded-sm opacity-70"
          style={{
            left: `${(event.startStep / gridSteps) * 100}%`,
            width: `${Math.max(
              (event.durationSteps / gridSteps) * 100,
              3,
            )}%`,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Lista fija de pistas para el editor del Compositor en escritorio (lg+).
 *
 * Es un selector — no un mezclador. Acá se elige qué instrumento se está
 * configurando (un solo panel de edición grande a la derecha, el de la
 * pista activa). El mute/on-off de reproducción vive únicamente en el modo
 * "Escuchar" (CompositorMultiTrackTimeline), no acá — mezclar ambos
 * conceptos en un mismo control fue el error de la versión anterior.
 */
export function CompositorDesktopTrackList({
  piece,
  activeTrackId,
  disabled = false,
  onSelectTrack,
}: CompositorDesktopTrackListProps) {
  return (
    <div
      className="flex w-[200px] shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border px-2.5 py-3"
      role="tablist"
      aria-label={RITMO_LABEL_CAPAS}
    >
      {COMPOSITOR_INSTRUMENT_OPTIONS.map((option) => {
        const isActive = activeTrackId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={disabled}
            onClick={() => onSelectTrack(option.id)}
            className={`flex flex-col gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors disabled:opacity-50 ${
              isActive
                ? "border-compositor-config bg-compositor-config-bg"
                : "border-border bg-bg-card hover:border-border-strong"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={
                  isActive ? "text-compositor-config" : "text-text-primary"
                }
              >
                <CompositorInstrumentIcon instrumentId={option.id} />
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm font-bold ${
                  isActive ? "text-compositor-config" : "text-text-primary"
                }`}
              >
                {option.label}
              </span>
            </span>

            <CompositorTrackRowPreview piece={piece} instrumentId={option.id} />
          </button>
        );
      })}
    </div>
  );
}
