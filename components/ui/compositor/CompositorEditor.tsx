"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorEditorStatusBar } from "@/components/ui/compositor/CompositorEditorStatusBar";
import {
  CompositorEditorTabShell,
  type CompositorEditorTab,
} from "@/components/ui/compositor/CompositorEditorTabShell";
import { CompositorEventEditor } from "@/components/ui/compositor/CompositorEventEditor";
import { CompositorSharedCycleSummary } from "@/components/ui/compositor/CompositorSharedCycleSummary";
import { CompositorTonalidadPanel } from "@/components/ui/compositor/CompositorTonalidadPanel";
import {
  CompositorMultiTrackTimeline,
  CompositorTrackTimeline,
} from "@/components/ui/compositor/CompositorTrackTimeline";
import {
  ToolRitmoCompasPanel,
  ToolRitmoTempoPanel,
} from "@/components/ui/ToolRitmoConfig";
import { ToolPracticeSection } from "@/components/ui/ToolModalSections";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { COMPOSITOR_DUMMY_BEAT_PATTERN } from "@/hooks/useCompositor";
import {
  COMPOSITOR_MELODIC_INSTRUMENT_IDS,
  COMPOSITOR_PRESETS,
  formatCompositorCycleSummary,
  getCompositorTrack,
  getInstrumentLabel,
  pieceHasCompositorEvents,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
  type CompositorPiece,
  type CompositorPresetId,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import { getCompositorCycleDurationSeconds } from "@/lib/compositor-timeline";
import type { NotaIndex } from "@/lib/cifrado";
import { NOTAS_ES } from "@/lib/cifrado";
import {
  COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE,
  COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE,
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS,
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_LABEL_PLANTILLAS,
  COMPOSITOR_LABEL_RESET_ZONA,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type PendingCycleStructureChange =
  | { type: "golpes"; value: number }
  | {
      type: "figura";
      slotIndex: number;
      duration: MetronomeBeatDuration;
    };

type CompositorEditorProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  activePresetId: CompositorPresetId | null;
  isPieceModifiedFromBaseline: boolean;
  selectedEventId: string | null;
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  tonalidadComposicion: NotaIndex;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  cycleProgress: number | null;
  tapTempoTapCount: number;
  samplesLoading: boolean;
  onSetActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  onSetSelectedEventId: (eventId: string | null) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onSetBpm: (value: number) => void;
  onSetCycleGolpes: (value: number) => void;
  onSetCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onAddTrackEvent: (instrumentId?: CompositorInstrumentId) => void;
  onUpdateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
  ) => void;
  onRemoveTrackEvent: (eventId: string) => void;
  onTapTempo: () => void;
  onStart: () => void;
  onPreviewActiveTrack: () => void;
  onStop: () => void;
  onReset: () => void;
  onApplyPreset: (presetId: CompositorPresetId) => void;
  activeCycle: CompositorCycle | null;
  cyclesBusy: boolean;
  cyclesError: string | null;
  suggestCycleName: () => string;
  onSaveCurrentCycle: (nombre: string) => Promise<unknown>;
  onUpdateActiveCycle: () => Promise<unknown>;
  onDiscardChanges: () => void;
};

function isMelodicInstrumentId(
  instrumentId: CompositorInstrumentId,
): instrumentId is CompositorMelodicInstrumentId {
  return COMPOSITOR_MELODIC_INSTRUMENT_IDS.includes(
    instrumentId as CompositorMelodicInstrumentId,
  );
}

export function CompositorEditor({
  piece,
  activeTrackId,
  activePresetId,
  isPieceModifiedFromBaseline,
  selectedEventId,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  tonalidadComposicion,
  isPlaying,
  isPreviewingTrack,
  cycleProgress,
  tapTempoTapCount,
  samplesLoading,
  onSetActiveTrackId,
  onSetSelectedEventId,
  onToggleTrack,
  onSetBpm,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
  onSetTonalidadComposicion,
  onAddTrackEvent,
  onUpdateTrackEvent,
  onRemoveTrackEvent,
  onTapTempo,
  onStart,
  onPreviewActiveTrack,
  onStop,
  onReset,
  onApplyPreset,
  activeCycle,
  cyclesBusy,
  cyclesError,
  suggestCycleName,
  onSaveCurrentCycle,
  onUpdateActiveCycle,
  onDiscardChanges,
}: CompositorEditorProps) {
  const [activeTab, setActiveTab] = useState<CompositorEditorTab>("ciclo");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [presetConfirmOpen, setPresetConfirmOpen] = useState(false);
  const [cycleStructureConfirmOpen, setCycleStructureConfirmOpen] =
    useState(false);
  const [pendingPresetId, setPendingPresetId] = useState<CompositorPresetId | null>(
    null,
  );
  const [pendingCycleStructureChange, setPendingCycleStructureChange] =
    useState<PendingCycleStructureChange | null>(null);
  const [hoveredPresetId, setHoveredPresetId] = useState<CompositorPresetId | null>(
    null,
  );

  const drumTrack = getCompositorTrack(piece, "bateria");
  const melodicTrackId = isMelodicInstrumentId(activeTrackId)
    ? activeTrackId
    : "piano";
  const melodicTrack = getCompositorTrack(piece, melodicTrackId);
  const selectedDrumEvent =
    selectedEventId == null
      ? null
      : drumTrack.events.find((event) => event.id === selectedEventId) ?? null;
  const selectedMelodicEvent =
    selectedEventId == null
      ? null
      : melodicTrack.events.find((event) => event.id === selectedEventId) ?? null;

  const enabledLayerCount = piece.tracks.filter((track) => track.enabled).length;
  const cycleSeconds = getCompositorCycleDurationSeconds(piece);
  const practiceSummary = samplesLoading
    ? "Preparando sonidos de las capas activas…"
    : isPlaying
      ? `Reproduciendo · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`
      : `Escuchá tu pieza · ${cycleSeconds.toFixed(1)} s · ${enabledLayerCount} capa${enabledLayerCount === 1 ? "" : "s"}`;

  const configLocked = isPlaying || isPreviewingTrack;
  const pendingPreset = pendingPresetId
    ? COMPOSITOR_PRESETS.find((preset) => preset.id === pendingPresetId)
    : null;
  const hoveredPreset = hoveredPresetId
    ? COMPOSITOR_PRESETS.find((preset) => preset.id === hoveredPresetId)
    : null;

  const tabSummary = useMemo(() => {
    switch (activeTab) {
      case "ciclo":
        return formatCompositorCycleSummary(piece);
      case "tempo":
        return `${bpm} BPM`;
      case "bateria":
        return `Batería · ${drumTrack.events.length} bloque${drumTrack.events.length === 1 ? "" : "s"}`;
      case "tonalidad":
        return `Tonalidad · ${NOTAS_ES[tonalidadComposicion]}`;
      case "melodias":
        return `${getInstrumentLabel(melodicTrackId)} · ${melodicTrack.events.length} bloque${melodicTrack.events.length === 1 ? "" : "s"}`;
    }
  }, [activeTab, bpm, drumTrack.events.length, melodicTrack.events.length, melodicTrackId, piece, tonalidadComposicion]);

  function handleTabChange(tab: CompositorEditorTab) {
    setActiveTab(tab);

    if (tab === "bateria") {
      onSetActiveTrackId("bateria");
      onSetSelectedEventId(null);
      return;
    }

    if (tab === "melodias" && !isMelodicInstrumentId(activeTrackId)) {
      onSetActiveTrackId("piano");
      onSetSelectedEventId(null);
    }
  }

  function applyPendingCycleStructureChange() {
    if (!pendingCycleStructureChange) {
      return;
    }

    if (pendingCycleStructureChange.type === "golpes") {
      onSetCycleGolpes(pendingCycleStructureChange.value);
    } else {
      onSetCycleBeatDurationAtSlot(
        pendingCycleStructureChange.slotIndex,
        pendingCycleStructureChange.duration,
      );
    }

    setPendingCycleStructureChange(null);
    setCycleStructureConfirmOpen(false);
  }

  function requestCycleGolpesChange(value: number) {
    if (value === cycleGolpes) {
      return;
    }

    if (pieceHasCompositorEvents(piece)) {
      setPendingCycleStructureChange({ type: "golpes", value });
      setCycleStructureConfirmOpen(true);
      return;
    }

    onSetCycleGolpes(value);
  }

  function requestCycleBeatDurationChange(
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) {
    if (cycleBeatDurations[slotIndex] === duration) {
      return;
    }

    if (pieceHasCompositorEvents(piece)) {
      setPendingCycleStructureChange({
        type: "figura",
        slotIndex,
        duration,
      });
      setCycleStructureConfirmOpen(true);
      return;
    }

    onSetCycleBeatDurationAtSlot(slotIndex, duration);
  }

  function handlePresetClick(presetId: CompositorPresetId) {
    if (configLocked) {
      return;
    }

    if (isPieceModifiedFromBaseline) {
      setPendingPresetId(presetId);
      setPresetConfirmOpen(true);
      return;
    }

    onApplyPreset(presetId);
  }

  return (
    <div className="space-y-2.5">
      <CompositorEditorStatusBar
        disabled={configLocked}
        activeCycle={activeCycle}
        isPieceModifiedFromBaseline={isPieceModifiedFromBaseline}
        cyclesBusy={cyclesBusy}
        cyclesError={cyclesError}
        suggestCycleName={suggestCycleName}
        onSaveCurrentCycle={onSaveCurrentCycle}
        onUpdateActiveCycle={onUpdateActiveCycle}
        onDiscardChanges={onDiscardChanges}
      />

      <CompositorEditorTabShell
        activeTab={activeTab}
        disabled={configLocked}
        summary={tabSummary}
        onTabChange={handleTabChange}
      >
          {activeTab === "ciclo" ? (
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="w-[4.75rem] shrink-0 text-[10px] font-bold uppercase leading-none tracking-wide text-compositor-config">
                    {COMPOSITOR_LABEL_PLANTILLAS}
                  </p>
                  <div
                    className="flex min-w-0 flex-1 gap-0.5 rounded-full border border-border bg-bg-darker p-0.5"
                    role="group"
                    aria-label={COMPOSITOR_LABEL_PLANTILLAS}
                  >
                    {COMPOSITOR_PRESETS.map((preset) => {
                      const isActive = activePresetId === preset.id;

                      return (
                        <button
                          key={preset.id}
                          type="button"
                          disabled={configLocked}
                          aria-pressed={isActive}
                          title={preset.descripcion}
                          onClick={() => handlePresetClick(preset.id)}
                          onMouseEnter={() => setHoveredPresetId(preset.id)}
                          onMouseLeave={() =>
                            setHoveredPresetId((current) =>
                              current === preset.id ? null : current,
                            )
                          }
                          onFocus={() => setHoveredPresetId(preset.id)}
                          onBlur={() =>
                            setHoveredPresetId((current) =>
                              current === preset.id ? null : current,
                            )
                          }
                          className={`min-w-0 flex-1 rounded-full px-1 py-1 text-[10px] font-bold leading-none transition-colors disabled:opacity-50 ${
                            isActive
                              ? "bg-[#454545] text-white"
                              : "text-text-muted hover:text-text-primary"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {hoveredPreset?.descripcion ? (
                  <p className="mt-1 truncate pl-[5.25rem] text-[10px] leading-tight text-text-muted">
                    {hoveredPreset.descripcion}
                  </p>
                ) : null}
              </div>

              <ToolRitmoCompasPanel
                beatPattern={COMPOSITOR_DUMMY_BEAT_PATTERN}
                patternLength={cycleGolpes}
                beatDurations={cycleBeatDurations}
                disabled={configLocked}
                variant="compositor"
                scope="cycle"
                layout="flat"
                sectionLabel={COMPOSITOR_LABEL_CICLO_COMPARTIDO}
                sectionLabelNormalCase
                patternLengthInputId="compositor-cycle-golpes"
                onSetPatternLength={requestCycleGolpesChange}
                onSetBeatDurationAtSlot={requestCycleBeatDurationChange}
                onSetBeatLevelAtSlot={() => {}}
              />

              <CompositorSharedCycleSummary piece={piece} />

              <div className="border-t border-dashed border-border/90 pt-2">
                <TapButton
                  type="button"
                  disabled={configLocked}
                  onClick={() => setResetConfirmOpen(true)}
                  aria-label="Restablecer todo el compositor"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-dark py-2 text-xs font-semibold text-text-muted disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {COMPOSITOR_LABEL_RESET_ZONA}
                </TapButton>
              </div>
            </div>
          ) : null}

          {activeTab === "tempo" ? (
            <ToolRitmoTempoPanel
              bpm={bpm}
              isPlaying={isPlaying}
              tapTempoTapCount={tapTempoTapCount}
              onSetBpm={onSetBpm}
              onTapTempo={onTapTempo}
            />
          ) : null}

          {activeTab === "bateria" ? (
            <div className="space-y-2">
              <CompositorTrackTimeline
                piece={piece}
                instrumentId="bateria"
                events={drumTrack.events}
                selectedEventId={selectedDrumEvent ? selectedEventId : null}
                cycleProgress={isPreviewingTrack ? cycleProgress : null}
                octaveExact={true}
                disabled={configLocked}
                isPreviewingTrack={isPreviewingTrack}
                previewDisabled={isPlaying}
                capasMode="none"
                onSelectEvent={onSetSelectedEventId}
                onUpdateEvent={(eventId, patch) =>
                  onUpdateTrackEvent(eventId, patch)
                }
                onAddEvent={() => onAddTrackEvent("bateria")}
                onRemoveEvent={onRemoveTrackEvent}
                onPreviewTrack={() => void onPreviewActiveTrack()}
              />

              {selectedDrumEvent ? (
                <CompositorEventEditor
                  piece={piece}
                  instrumentId="bateria"
                  event={selectedDrumEvent}
                  disabled={configLocked}
                  onUpdateEvent={(patch) =>
                    onUpdateTrackEvent(selectedDrumEvent.id, patch)
                  }
                />
              ) : null}
            </div>
          ) : null}

          {activeTab === "tonalidad" ? (
            <CompositorTonalidadPanel
              tonalidadComposicion={tonalidadComposicion}
              disabled={configLocked}
              onTonalidadChange={onSetTonalidadComposicion}
            />
          ) : null}

          {activeTab === "melodias" ? (
            <div className="space-y-2">
              <CompositorTrackTimeline
                piece={piece}
                instrumentId={melodicTrackId}
                events={melodicTrack.events}
                selectedEventId={
                  selectedMelodicEvent ? selectedEventId : null
                }
                cycleProgress={isPreviewingTrack ? cycleProgress : null}
                octaveExact={true}
                disabled={configLocked}
                isPreviewingTrack={isPreviewingTrack}
                previewDisabled={isPlaying}
                capasMode="melodic"
                onSelectTrack={onSetActiveTrackId}
                onSelectEvent={onSetSelectedEventId}
                onUpdateEvent={(eventId, patch) =>
                  onUpdateTrackEvent(eventId, patch)
                }
                onAddEvent={() => onAddTrackEvent(melodicTrackId)}
                onRemoveEvent={onRemoveTrackEvent}
                onPreviewTrack={() => void onPreviewActiveTrack()}
              />

              {selectedMelodicEvent ? (
                <CompositorEventEditor
                  piece={piece}
                  instrumentId={melodicTrackId}
                  event={selectedMelodicEvent}
                  disabled={configLocked}
                  onUpdateEvent={(patch) =>
                    onUpdateTrackEvent(selectedMelodicEvent.id, patch)
                  }
                />
              ) : null}
            </div>
          ) : null}
      </CompositorEditorTabShell>

      <ToolPracticeSection collapsible collapsedSummary={practiceSummary}>
        <div
          className={`rounded-[10px] border bg-bg-card px-3 py-3 transition-[box-shadow,opacity] ${
            isPlaying ? "border-border/80 ring-1 ring-inset ring-border/25" : "border-border"
          }`}
        >
          <p
            className={`mb-2 text-xs font-bold tracking-wide normal-case transition-opacity ${
              isPlaying ? "text-tool-practice/50" : "text-tool-practice"
            }`}
          >
            {COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS}
          </p>
          <CompositorMultiTrackTimeline
            piece={piece}
            selectedEventId={selectedEventId}
            activeTrackId={activeTrackId}
            cycleProgress={isPlaying ? cycleProgress : null}
            octaveExact={true}
            togglesDisabled={isPlaying}
            onToggleTrack={onToggleTrack}
          />
        </div>

        <div className="flex justify-center">
          <PlayCircleButton
            isPlaying={isPlaying}
            onClick={isPlaying ? onStop : onStart}
            playAriaLabel="Reproducir composición"
            stopAriaLabel="Detener reproducción"
          />
        </div>
      </ToolPracticeSection>

      <ConfirmDialog
        open={cycleStructureConfirmOpen}
        message={COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE}
        confirmLabel="Sí, cambiar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={applyPendingCycleStructureChange}
        onCancel={() => {
          setCycleStructureConfirmOpen(false);
          setPendingCycleStructureChange(null);
        }}
      />

      <ConfirmDialog
        open={presetConfirmOpen}
        message={
          pendingPreset
            ? COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE(pendingPreset.label)
            : ""
        }
        confirmLabel="Sí, cargar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          if (pendingPresetId) {
            onApplyPreset(pendingPresetId);
          }

          setPresetConfirmOpen(false);
          setPendingPresetId(null);
        }}
        onCancel={() => {
          setPresetConfirmOpen(false);
          setPendingPresetId(null);
        }}
      />

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
