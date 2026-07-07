"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorDrumPatternPicker } from "@/components/ui/compositor/CompositorDrumPatternPicker";
import { CompositorDesktopCicloBar } from "@/components/ui/compositor/CompositorDesktopCicloBar";
import { CompositorDesktopTrackList } from "@/components/ui/compositor/CompositorDesktopTrackList";
import { CompositorListenView } from "@/components/ui/compositor/CompositorListenView";
import { CompositorTrackTimeline } from "@/components/ui/compositor/CompositorTrackTimeline";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorEditorProps } from "@/components/ui/compositor/CompositorEditor";
import {
  getCompositorTrack,
  getInstrumentLabel,
} from "@/lib/compositor";
import type { CompositorDrumPatternId } from "@/lib/compositor-drum-patterns";
import {
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_RESET_ZONA,
  COMPOSITOR_TAB_PRACTICAR,
} from "@/lib/ritmo-terminologia";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

type CompositorDesktopMode = "editar" | "escuchar";

/**
 * Layout de escritorio (lg+) del editor del Compositor.
 *
 * "editar": un solo instrumento activo a la vez — la lista de pistas
 * selecciona cuál, y a la derecha aparece únicamente el panel grande de esa
 * pista (timeline + timbre/intensidad). Nunca se apilan los 4 paneles de
 * configuración juntos. El bloque "Ciclo" (golpes/figura/tempo) es un paso
 * previo que se colapsa una vez definido, distinto de la config de
 * instrumentos que sí necesita quedar siempre accesible.
 *
 * "escuchar": pantalla propia de mezcla (se abre con el botón play del
 * encabezado). Mute por capa, tempo, tonalidad y play, todo en una columna
 * fija sin scroll. Nada de edición de bloques vive acá.
 */
export function CompositorDesktopEditorShell({
  piece,
  activeTrackId,
  activeDrumPatternId,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  tonalidadComposicion,
  isPlaying,
  isPreviewingTrack,
  cycleProgress,
  tapTempoTapCount,
  onSetActiveTrackId,
  onSetSelectedEventId,
  onToggleTrack,
  onSetBpm,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
  onSetTonalidadComposicion,
  onPlaceTrackEvent,
  onUpdateTrackEvent,
  onRemoveTrackEvent,
  onTapTempo,
  onStart,
  onPreviewActiveTrack,
  onStop,
  onReset,
  onSelectDrumPattern,
}: Pick<
  CompositorEditorProps,
  | "piece"
  | "activeTrackId"
  | "activeDrumPatternId"
  | "selectedEventId"
  | "cycleGolpes"
  | "cycleBeatDurations"
  | "bpm"
  | "tonalidadComposicion"
  | "isPlaying"
  | "isPreviewingTrack"
  | "cycleProgress"
  | "tapTempoTapCount"
  | "onSetActiveTrackId"
  | "onSetSelectedEventId"
  | "onToggleTrack"
  | "onSetBpm"
  | "onSetCycleGolpes"
  | "onSetCycleBeatDurationAtSlot"
  | "onSetTonalidadComposicion"
  | "onPlaceTrackEvent"
  | "onUpdateTrackEvent"
  | "onRemoveTrackEvent"
  | "onTapTempo"
  | "onStart"
  | "onPreviewActiveTrack"
  | "onStop"
  | "onReset"
> & {
  onSelectDrumPattern: (patternId: CompositorDrumPatternId) => void;
}) {
  const configLocked = isPlaying || isPreviewingTrack;

  const [mode, setMode] = useState<CompositorDesktopMode>("editar");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const activeTrack = getCompositorTrack(piece, activeTrackId);
  const selectedInActiveTrack = activeTrack.events.some(
    (event) => event.id === selectedEventId,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div className="flex shrink-0 items-center gap-3 border-b border-border/80 bg-bg-darker px-4 py-2.5">
        <button
          type="button"
          onClick={() => setMode("editar")}
          className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-colors ${
            mode === "editar"
              ? "bg-compositor-config text-white"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          Editar
        </button>

        <div className="ml-auto flex items-center gap-2">
          {mode !== "escuchar" ? (
            <PlayCircleButton
              size="xs"
              playOnly
              onClick={() => setMode("escuchar")}
              playAriaLabel={COMPOSITOR_TAB_PRACTICAR}
              className="border-border text-tool-practice"
            />
          ) : null}
          <TapButton
            type="button"
            disabled={configLocked}
            onClick={() => setResetConfirmOpen(true)}
            aria-label="Restablecer todo el compositor"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-dark px-3 py-1.5 text-xs font-semibold text-text-muted disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {COMPOSITOR_LABEL_RESET_ZONA}
          </TapButton>
        </div>
      </div>

      {mode === "editar" ? (
        <>
          <div className="shrink-0 border-b border-border/80 bg-bg-darker">
            <CompositorDesktopCicloBar
              cycleGolpes={cycleGolpes}
              cycleBeatDurations={cycleBeatDurations}
              bpm={bpm}
              disabled={configLocked}
              onSetCycleGolpes={onSetCycleGolpes}
              onSetCycleBeatDurationAtSlot={onSetCycleBeatDurationAtSlot}
              onSetBpm={onSetBpm}
            />
          </div>

          <div className="flex min-h-0 flex-1">
            <CompositorDesktopTrackList
              piece={piece}
              activeTrackId={activeTrackId}
              disabled={configLocked}
              onSelectTrack={onSetActiveTrackId}
            />

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              <p className="mb-2.5 text-xs font-bold text-text-secondary">
                Editando: {getInstrumentLabel(activeTrackId)}
              </p>

              {activeTrackId === "bateria" ? (
                <div className="mb-3">
                  <CompositorDrumPatternPicker
                    activePatternId={activeDrumPatternId}
                    disabled={configLocked}
                    onSelectPattern={onSelectDrumPattern}
                  />
                </div>
              ) : null}

              <CompositorTrackTimeline
                piece={piece}
                instrumentId={activeTrackId}
                events={activeTrack.events}
                selectedEventId={
                  selectedInActiveTrack ? selectedEventId : null
                }
                cycleProgress={isPreviewingTrack ? cycleProgress : null}
                octaveExact={true}
                disabled={configLocked}
                isPreviewingTrack={isPreviewingTrack}
                previewDisabled={isPlaying}
                capasMode="none"
                placementMode={
                  activeTrackId === "bateria" ? "drum" : "melodic"
                }
                tonalidadComposicion={tonalidadComposicion}
                onSetTonalidadComposicion={onSetTonalidadComposicion}
                onSelectEvent={onSetSelectedEventId}
                onUpdateEvent={(eventId, patch) =>
                  onUpdateTrackEvent(eventId, patch, activeTrackId)
                }
                onPlaceEvent={(partial, placeOptions) =>
                  onPlaceTrackEvent(activeTrackId, partial, placeOptions)
                }
                onRemoveEvent={(eventId) =>
                  onRemoveTrackEvent(eventId, activeTrackId)
                }
                onPreviewTrack={() => void onPreviewActiveTrack()}
              />
            </div>
          </div>
        </>
      ) : (
        <CompositorListenView
          embedded
          piece={piece}
          activeTrackId={activeTrackId}
          selectedEventId={selectedEventId}
          bpm={bpm}
          tonalidadComposicion={tonalidadComposicion}
          isPlaying={isPlaying}
          cycleProgress={cycleProgress}
          onSetBpm={onSetBpm}
          onSetTonalidadComposicion={onSetTonalidadComposicion}
          onToggleTrack={onToggleTrack}
          onStart={onStart}
          onStop={onStop}
        />
      )}

      <ConfirmDialog
        open={resetConfirmOpen}
        message={COMPOSITOR_CONFIRM_RESET_MESSAGE}
        confirmLabel="Sí, restablecer"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          setResetConfirmOpen(false);
          onReset();
        }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  );
}
