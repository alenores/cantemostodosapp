"use client";

import {
  CompositorSlotContenido,
  CompositorSlotTimbre,
  compositorHasContenidoTab,
  compositorHasTimbreTab,
} from "@/components/ui/compositor/CompositorSlotDetail";
import {
  BeatVolumeCarousel,
  CompasNumericCarousel,
} from "@/components/ui/ToolRitmoConfig";
import type {
  CompositorDrumSound,
  CompositorGuitarArticulation,
  CompositorInstrumentId,
  CompositorPiece,
  CompositorSlotNote,
  CompositorTrackEvent,
} from "@/lib/compositor";
import {
  clampEventDurationSteps,
  clampCompositorNoteOctaves,
  getEventMaxDurationSteps,
  getSustentoHelpText,
  isSustentoEditable,
} from "@/lib/compositor-timeline-layout";
import {
  durationStepsToSeconds,
  getCompositorGridSteps,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import { COMPAS_SLOT_CONTROLS_CLASS } from "@/lib/ritmo-compas-ui";
import {
  COMPOSITOR_HELP_EVENTO_POSICION,
  COMPOSITOR_LABEL_SONIDO_SELECCIONADO,
  getRitmoHelpContenido,
  getRitmoHelpDinamica,
  getRitmoHelpTimbre,
  RITMO_LABEL_CONTENIDO,
  RITMO_LABEL_DINAMICA,
  RITMO_LABEL_POSICION,
  RITMO_LABEL_SUSTENTO,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { useEffect, useMemo, useState } from "react";

type EventEditorTab =
  | "posicion"
  | "sustento"
  | "dinamica"
  | "contenido"
  | "timbre";

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
  const maxDuration = getEventMaxDurationSteps(
    instrumentId,
    event,
    gridSteps,
    piece.subdivisionsPerGolpe,
  );
  const showSustento = isSustentoEditable(instrumentId, event);
  const startSeconds = stepToCycleOffsetSeconds(piece, event.startStep);
  const durationSeconds = durationStepsToSeconds(piece, event.durationSteps);

  const showContenido = compositorHasContenidoTab(instrumentId);
  const showTimbre = compositorHasTimbreTab(instrumentId);

  const tabs = useMemo(() => {
    const options: { id: EventEditorTab; label: string }[] = [
      { id: "posicion", label: RITMO_LABEL_POSICION },
    ];
    if (showSustento) {
      options.push({ id: "sustento", label: RITMO_LABEL_SUSTENTO });
    }
    options.push({ id: "dinamica", label: RITMO_LABEL_DINAMICA });
    if (showContenido) {
      options.push({ id: "contenido", label: RITMO_LABEL_CONTENIDO });
    }
    if (showTimbre) {
      options.push({ id: "timbre", label: RITMO_LABEL_TIMBRE });
    }
    return options;
  }, [showContenido, showSustento, showTimbre]);

  const [tab, setTab] = useState<EventEditorTab>("posicion");

  useEffect(() => {
    if (disabled) {
      setTab("posicion");
    }
  }, [disabled]);

  useEffect(() => {
    if (!tabs.some((option) => option.id === tab)) {
      setTab("posicion");
    }
  }, [tab, tabs]);

  const helpText =
    tab === "posicion"
      ? COMPOSITOR_HELP_EVENTO_POSICION
      : tab === "sustento"
        ? getSustentoHelpText(instrumentId, event)
        : tab === "dinamica"
          ? getRitmoHelpDinamica("compositor")
          : tab === "contenido"
            ? getRitmoHelpContenido()
            : showTimbre
              ? getRitmoHelpTimbre(
                  instrumentId === "bateria" ? "bateria" : "guitarra",
                )
              : "";

  return (
    <div className="rounded-[10px] border border-border/70 bg-bg-card/90 px-3 py-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
          {COMPOSITOR_LABEL_SONIDO_SELECCIONADO}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-text-muted">
          Empieza a los {startSeconds.toFixed(1)} s y dura ~{durationSeconds.toFixed(1)} s
          en el ciclo.
        </p>
      </div>

      <div className="mt-3 flex gap-1 rounded-full border border-border bg-bg-darker p-0.5">
        {tabs.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => setTab(option.id)}
            className={`min-w-0 flex-1 rounded-full px-1.5 py-1.5 text-[10px] font-bold disabled:opacity-50 ${
              tab === option.id
                ? "bg-compositor-config text-white"
                : "text-text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className={`mt-3 ${COMPAS_SLOT_CONTROLS_CLASS}`}>
        {tab === "posicion" ? (
          <CompasNumericCarousel
            value={event.startStep + 1}
            disabled={disabled}
            decrementDisabled={event.startStep <= 0}
            incrementDisabled={event.startStep >= maxStart}
            decrementAriaLabel="Retroceder un paso"
            incrementAriaLabel="Avanzar un paso"
            valueAriaLabel={`Posición paso ${event.startStep + 1}`}
            primaryLabel="paso en el ciclo"
            secondaryLabel={`de ${gridSteps} pasos`}
            onDecrement={() =>
              onUpdateEvent({ startStep: Math.max(0, event.startStep - 1) })
            }
            onIncrement={() =>
              onUpdateEvent({
                startStep: Math.min(maxStart, event.startStep + 1),
              })
            }
          />
        ) : null}

        {tab === "sustento" ? (
          <CompasNumericCarousel
            value={event.durationSteps}
            disabled={disabled}
            decrementDisabled={event.durationSteps <= 1}
            incrementDisabled={event.durationSteps >= maxDuration}
            decrementAriaLabel="Reducir duración"
            incrementAriaLabel="Aumentar duración"
            valueAriaLabel={`Duración ${event.durationSteps} pasos`}
            primaryLabel={
              event.durationSteps === 1 ? "paso de duración" : "pasos de duración"
            }
            secondaryLabel={`máx. ${maxDuration}`}
            onDecrement={() =>
              onUpdateEvent({
                durationSteps: Math.max(1, event.durationSteps - 1),
              })
            }
            onIncrement={() =>
              onUpdateEvent({
                durationSteps: clampEventDurationSteps(
                  instrumentId,
                  event,
                  event.durationSteps + 1,
                  gridSteps,
                  piece.subdivisionsPerGolpe,
                ),
              })
            }
          />
        ) : null}

        {tab === "dinamica" ? (
          <BeatVolumeCarousel
            level={event.level}
            beatIndex={0}
            disabled={disabled}
            hideBeatHeader
            onSetLevel={(level: MetronomeBeatLevel) => onUpdateEvent({ level })}
          />
        ) : null}

        {tab === "contenido" && showContenido ? (
          <CompositorSlotContenido
            embedded
            slotIndex={event.startStep}
            note={event.note}
            disabled={disabled}
            onSetNote={(note: CompositorSlotNote) =>
              onUpdateEvent({
                note: clampCompositorNoteOctaves(note, instrumentId),
              })
            }
          />
        ) : null}

        {tab === "timbre" && showTimbre ? (
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
            onSetGuitarArticulation={(articulation: CompositorGuitarArticulation) => {
              const nextEvent = {
                ...event,
                guitarArticulation: articulation,
              };
              onUpdateEvent({
                guitarArticulation: articulation,
                durationSteps: clampEventDurationSteps(
                  instrumentId,
                  nextEvent,
                  event.durationSteps,
                  gridSteps,
                  piece.subdivisionsPerGolpe,
                ),
              });
            }}
          />
        ) : null}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-text-muted">{helpText}</p>
    </div>
  );
}
