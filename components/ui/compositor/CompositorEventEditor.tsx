"use client";

import {
  CompositorSlotContenido,
  CompositorSlotTimbre,
  compositorHasContenidoTab,
  compositorHasTimbreTab,
} from "@/components/ui/compositor/CompositorSlotDetail";
import { TapButton } from "@/components/ui/TapFeedback";
import { BeatVolumeCarousel } from "@/components/ui/ToolRitmoConfig";
import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorPiece,
  CompositorSlotNote,
  CompositorTrackEvent,
} from "@/lib/compositor";
import {
  durationStepsToSeconds,
  getCompositorGridSteps,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import {
  RITMO_LABEL_CONTENIDO,
  RITMO_LABEL_DINAMICA,
  RITMO_LABEL_SUSTENTO,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import type { MetronomeBeatLevel } from "@/lib/metronomo";

type CompositorEventEditorProps = {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  event: CompositorTrackEvent;
  disabled?: boolean;
  onUpdateEvent: (patch: Partial<CompositorTrackEvent>) => void;
};

export function CompositorEventEditor({
  piece,
  instrumentId,
  event,
  disabled = false,
  onUpdateEvent,
}: CompositorEventEditorProps) {
  const gridSteps = getCompositorGridSteps(piece);
  const maxStart = Math.max(0, gridSteps - event.durationSteps);
  const maxDuration = gridSteps - event.startStep;
  const startSeconds = stepToCycleOffsetSeconds(piece, event.startStep);
  const durationSeconds = durationStepsToSeconds(piece, event.durationSteps);

  return (
    <div className="space-y-3 rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
          Sonido seleccionado
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          Empieza a los {startSeconds.toFixed(1)} s y dura ~{durationSeconds.toFixed(1)} s
          en el ciclo.
        </p>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
          Posición en el ciclo
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <TapButton
            type="button"
            disabled={disabled || event.startStep <= 0}
            onClick={() =>
              onUpdateEvent({ startStep: Math.max(0, event.startStep - 1) })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold disabled:opacity-40"
          >
            −
          </TapButton>
          <span className="min-w-16 text-center text-sm font-bold text-text-primary">
            paso {event.startStep + 1}
          </span>
          <TapButton
            type="button"
            disabled={disabled || event.startStep >= maxStart}
            onClick={() =>
              onUpdateEvent({
                startStep: Math.min(maxStart, event.startStep + 1),
              })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold disabled:opacity-40"
          >
            +
          </TapButton>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
          {RITMO_LABEL_SUSTENTO}
        </p>
        <p className="mt-1 text-[10px] text-text-muted">
          Cuántos pasos suena este bloque (piano y guitarra usan toda esta duración).
        </p>
        <div className="mt-2 flex items-center justify-center gap-3">
          <TapButton
            type="button"
            disabled={disabled || event.durationSteps <= 1}
            onClick={() =>
              onUpdateEvent({
                durationSteps: Math.max(1, event.durationSteps - 1),
              })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold disabled:opacity-40"
          >
            −
          </TapButton>
          <span className="min-w-16 text-center text-sm font-bold text-text-primary">
            {event.durationSteps} paso{event.durationSteps === 1 ? "" : "s"}
          </span>
          <TapButton
            type="button"
            disabled={disabled || event.durationSteps >= maxDuration}
            onClick={() =>
              onUpdateEvent({
                durationSteps: Math.min(maxDuration, event.durationSteps + 1),
              })
            }
            className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-dark text-lg font-bold disabled:opacity-40"
          >
            +
          </TapButton>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
          {RITMO_LABEL_DINAMICA}
        </p>
        <BeatVolumeCarousel
          level={event.level}
          beatIndex={0}
          disabled={disabled}
          hideBeatHeader
          onSetLevel={(level: MetronomeBeatLevel) => onUpdateEvent({ level })}
        />
      </div>

      {compositorHasContenidoTab(instrumentId) ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {RITMO_LABEL_CONTENIDO}
          </p>
          <CompositorSlotContenido
            embedded
            slotIndex={event.startStep}
            note={event.note}
            disabled={disabled}
            onSetNote={(note: CompositorSlotNote) => onUpdateEvent({ note })}
          />
        </div>
      ) : null}

      {compositorHasTimbreTab(instrumentId) ? (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {RITMO_LABEL_TIMBRE}
          </p>
          <CompositorSlotTimbre
            embedded
            instrumentId={instrumentId === "bateria" ? "bateria" : "guitarra"}
            slotIndex={event.startStep}
            drumSound={event.drumSound}
            guitarArticulation={event.guitarArticulation}
            disabled={disabled}
            onSetDrumSound={(sound: CompositorDrumSound) =>
              onUpdateEvent({ drumSound: sound })
            }
            onSetGuitarArticulation={(articulation: CompositorGuitarArticulation) =>
              onUpdateEvent({ guitarArticulation: articulation })
            }
          />
        </div>
      ) : null}
    </div>
  );
}
