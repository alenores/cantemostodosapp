"use client";

import { CompositorGradoPicker } from "@/components/ui/compositor/CompositorGradoPicker";
import {
  CompositorSlotTimbre,
  compositorHasContenidoTab,
  compositorHasTimbreTab,
} from "@/components/ui/compositor/CompositorSlotDetail";
import { clampMelodicOctaveForInstrument } from "@/lib/compositor-melodic-pitch";
import {
  BeatVolumeCarousel,
  CompasNumericCarousel,
} from "@/components/ui/ToolRitmoConfig";
import {
  isGuitarChordArticulation,
  type CompositorDrumSound,
  type CompositorGuitarArticulation,
  type CompositorInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  clampEventDurationSteps,
  getEventMaxDurationSteps,
  getSustentoHelpText,
  isSustentoEditable,
} from "@/lib/compositor-timeline-layout";
import {
  durationStepsToSeconds,
  getCompositorGridSteps,
  getCompositorStepDurationSeconds,
  stepToCycleOffsetSeconds,
} from "@/lib/compositor-timeline";
import { COMPAS_SLOT_CONTROLS_CLASS } from "@/lib/ritmo-compas-ui";
import {
  COMPOSITOR_HELP_EVENTO_POSICION,
  COMPOSITOR_LABEL_BLOQUE_SELECCIONADO,
  COMPOSITOR_LABEL_SONIDO_SELECCIONADO,
  getRitmoHelpNota,
  getRitmoHelpIntensidad,
  getRitmoHelpTimbre,
  RITMO_LABEL_ACORDE,
  RITMO_LABEL_NOTA,
  RITMO_LABEL_INTENSIDAD,
  RITMO_LABEL_POSICION,
  RITMO_LABEL_SUSTENTO,
  RITMO_LABEL_TIMBRE,
} from "@/lib/ritmo-terminologia";
import type { MetronomeBeatLevel } from "@/lib/metronomo";
import { useEffect, useMemo, useState } from "react";
import { MODIFICADORES, type Modificador } from "@/lib/cifrado";

type EventEditorTab =
  | "posicion"
  | "sustento"
  | "intensidad"
  | "contenido"
  | "acorde"
  | "timbre";

type CompositorEventEditorProps = {
  piece: CompositorPiece;
  instrumentId: CompositorInstrumentId;
  event: CompositorTrackEvent;
  disabled?: boolean;
  embedded?: boolean;
  editorMode?: "default" | "palette";
  onUpdateEvent: (patch: Partial<CompositorTrackEvent>) => void;
};

export function CompositorEventEditor({
  piece,
  instrumentId,
  event,
  disabled = false,
  embedded = false,
  editorMode = "default",
  onUpdateEvent,
}: CompositorEventEditorProps) {
  const gridSteps = getCompositorGridSteps(piece);
  const stepDurationSeconds = getCompositorStepDurationSeconds(piece);
  const maxStart = Math.max(0, gridSteps - event.durationSteps);
  const maxDuration = getEventMaxDurationSteps(
    instrumentId,
    event,
    gridSteps,
    piece.subdivisionsPerGolpe,
    stepDurationSeconds,
  );
  const showSustento =
    editorMode !== "palette" && isSustentoEditable(instrumentId, event);
  const startSeconds = stepToCycleOffsetSeconds(piece, event.startStep);
  const durationSeconds = durationStepsToSeconds(piece, event.durationSteps);

  const showContenido =
    editorMode !== "palette" && compositorHasContenidoTab(instrumentId);
  const showTimbre = compositorHasTimbreTab(instrumentId);
  const showPosicion = editorMode !== "palette";
  const showAcorde =
    editorMode === "palette" &&
    (instrumentId === "piano" ||
      (instrumentId === "guitarra" &&
        isGuitarChordArticulation(event.guitarArticulation)));

  const tabs = useMemo(() => {
    const options: { id: EventEditorTab; label: string }[] = [];

    if (showPosicion) {
      options.push({ id: "posicion", label: RITMO_LABEL_POSICION });
    }
    if (showSustento) {
      options.push({ id: "sustento", label: RITMO_LABEL_SUSTENTO });
    }
    options.push({ id: "intensidad", label: RITMO_LABEL_INTENSIDAD });
    if (showContenido) {
      options.push({ id: "contenido", label: RITMO_LABEL_NOTA });
    }
    if (showAcorde) {
      options.push({ id: "acorde", label: RITMO_LABEL_ACORDE });
    }
    if (showTimbre) {
      options.push({ id: "timbre", label: RITMO_LABEL_TIMBRE });
    }
    return options;
  }, [showAcorde, showContenido, showPosicion, showSustento, showTimbre]);

  const defaultTab = tabs[0]?.id ?? "intensidad";
  const [tab, setTab] = useState<EventEditorTab>(defaultTab);

  useEffect(() => {
    if (disabled) {
      setTab(defaultTab);
    }
  }, [defaultTab, disabled]);

  useEffect(() => {
    if (!tabs.some((option) => option.id === tab)) {
      setTab(defaultTab);
    }
  }, [defaultTab, tab, tabs]);

  const helpText =
    tab === "posicion"
      ? COMPOSITOR_HELP_EVENTO_POSICION
      : tab === "sustento"
        ? getSustentoHelpText(instrumentId, event)
        : tab === "intensidad"
          ? getRitmoHelpIntensidad("compositor")
          : tab === "contenido"
            ? getRitmoHelpNota()
            : tab === "acorde"
              ? "Elegí el tipo de acorde (mayor, menor, 7, etc.)."
            : showTimbre
              ? getRitmoHelpTimbre(
                  instrumentId === "bateria" ? "bateria" : "guitarra",
                )
              : "";

  const titleLabel = embedded
    ? COMPOSITOR_LABEL_BLOQUE_SELECCIONADO
    : COMPOSITOR_LABEL_SONIDO_SELECCIONADO;

  return (
    <div
      className={
        embedded
          ? "pt-3"
          : "rounded-[10px] border border-border/70 bg-bg-card/90 px-3 py-3"
      }
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-compositor-config">
          {titleLabel}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-text-muted">
          Empieza a los {startSeconds.toFixed(1)} s y dura ~{durationSeconds.toFixed(1)} s
          en el ciclo.
        </p>
      </div>

      <div className="tool-segmented-control tool-segmented-control--inline mt-3 flex gap-1">
        {tabs.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => setTab(option.id)}
            className={`min-w-0 flex-1 shrink-0 rounded-full px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-50 lg:flex-none ${
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
                  stepDurationSeconds,
                ),
              })
            }
          />
        ) : null}

        {tab === "intensidad" ? (
          <BeatVolumeCarousel
            level={event.level}
            beatIndex={0}
            disabled={disabled}
            hideBeatHeader
            onSetLevel={(level: MetronomeBeatLevel) => onUpdateEvent({ level })}
          />
        ) : null}

        {tab === "contenido" && showContenido ? (
          <CompositorGradoPicker
            gradoCromatico={event.gradoCromatico}
            octavaRelativa={event.octavaRelativa}
            tonalidadComposicion={piece.tonalidadComposicion}
            instrumentId={instrumentId}
            disabled={disabled}
            onGradoChange={(grado) =>
              onUpdateEvent({ gradoCromatico: grado })
            }
            onOctavaChange={(octava) =>
              onUpdateEvent({
                octavaRelativa: clampMelodicOctaveForInstrument(
                  octava,
                  instrumentId,
                ),
              })
            }
          />
        ) : null}

        {tab === "acorde" && showAcorde ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (instrumentId === "piano") {
                  onUpdateEvent({ pianoHarmonyMode: "nota" });
                }
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                instrumentId === "piano" && event.pianoHarmonyMode !== "acorde"
                  ? "bg-compositor-config text-white"
                  : "bg-bg-dark text-text-secondary"
              }`}
            >
              Nota
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                if (instrumentId === "piano") {
                  onUpdateEvent({ pianoHarmonyMode: "acorde" });
                }
              }}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
                instrumentId === "piano" && event.pianoHarmonyMode === "acorde"
                  ? "bg-compositor-config text-white"
                  : "bg-bg-dark text-text-secondary"
              }`}
            >
              Acorde
            </button>

            {(instrumentId !== "piano" || event.pianoHarmonyMode === "acorde") ? (
              <div className="mt-2 flex w-full flex-wrap gap-1.5">
                {MODIFICADORES.map((mod) => {
                  const isActive = (event.chordModifier ?? "") === mod.id;
                  return (
                    <button
                      key={mod.id || "maj"}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        onUpdateEvent({ chordModifier: mod.id as Modificador })
                      }
                      className={`rounded-full px-2.5 py-1 text-xs disabled:opacity-50 ${
                        isActive
                          ? "bg-compositor-config text-white font-bold"
                          : "bg-bg-dark text-text-secondary"
                      }`}
                    >
                      {mod.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
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
                  stepDurationSeconds,
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
