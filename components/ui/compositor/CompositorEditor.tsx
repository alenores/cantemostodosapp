"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorDesktopEditorShell } from "@/components/ui/compositor/CompositorDesktopEditorShell";
import { CompositorDrumPatternPicker } from "@/components/ui/compositor/CompositorDrumPatternPicker";
import { CompositorEditorStatusBar } from "@/components/ui/compositor/CompositorEditorStatusBar";
import { CompositorListenView } from "@/components/ui/compositor/CompositorListenView";
import {
  CompositorEditorTabShell,
  type CompositorEditorTab,
} from "@/components/ui/compositor/CompositorEditorTabShell";
import {
  CompositorTrackTimeline,
} from "@/components/ui/compositor/CompositorTrackTimeline";
import {
  ToolRitmoCompasPanel,
  ToolRitmoTempoPanel,
} from "@/components/ui/ToolRitmoConfig";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import { TapButton } from "@/components/ui/TapFeedback";
import { COMPOSITOR_DUMMY_BEAT_PATTERN } from "@/hooks/useCompositor";
import {
  COMPOSITOR_MELODIC_INSTRUMENT_IDS,
  formatTrackCapacityLabel,
  formatTrackOverflowDetails,
  getCompositorTrack,
  getInstrumentLabel,
  isTrackAtCapacity,
  pieceHasCompositorEvents,
  pieceHasTrackOverflow,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
  type CompositorPiece,
  type CompositorTrackEvent,
} from "@/lib/compositor";
import {
  bateriaTrackHasEvents,
  getCompositorDrumPatternById,
  type CompositorDrumPatternId,
} from "@/lib/compositor-drum-patterns";
import type { NotaIndex } from "@/lib/cifrado";
import { NOTAS_ES } from "@/lib/cifrado";
import {
  COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE,
  COMPOSITOR_CONFIRM_APLICAR_RITMO_BATERIA,
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_LABEL_RESET_ZONA,
  COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

type PendingCycleStructureChange =
  | { type: "golpes"; value: number }
  | {
      type: "figura";
      slotIndex: number;
      duration: MetronomeBeatDuration;
    };

export type CompositorEditorProps = {
  piece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  activeDrumPatternId: CompositorDrumPatternId | null;
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
  onPlaceTrackEvent: (
    instrumentId: CompositorInstrumentId,
    partial: Partial<CompositorTrackEvent>,
    options?: { rowId?: string; octaveExact?: boolean },
  ) => string | null;
  onUpdateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
    instrumentId?: CompositorInstrumentId,
  ) => void;
  onRemoveTrackEvent: (
    eventId: string,
    instrumentId?: CompositorInstrumentId,
  ) => void;
  onTapTempo: () => void;
  onStart: () => void;
  onPreviewActiveTrack: () => void;
  onStop: () => void;
  onReset: () => void;
  onApplyDrumPattern: (patternId: CompositorDrumPatternId) => void;
  activeCycle: CompositorCycle | null;
  cyclesBusy: boolean;
  cyclesError: string | null;
  cyclesNotice: string | null;
  editorNotice: string | null;
  suggestCycleName: () => string;
  onSaveCurrentCycle: (nombre: string) => Promise<unknown>;
  onUpdateActiveCycle: (nombre?: string) => Promise<unknown>;
  onDiscardChanges: () => void;
  isLoggedIn: boolean;
  online: boolean;
  onSetCyclePublic?: (cycleId: string, esPublico: boolean) => Promise<unknown>;
  onDeleteCycle?: (cycleId: string) => Promise<unknown>;
  onCycleDeleted?: () => void;
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
  activeDrumPatternId,
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
  onPlaceTrackEvent,
  onUpdateTrackEvent,
  onRemoveTrackEvent,
  onTapTempo,
  onStart,
  onPreviewActiveTrack,
  onStop,
  onReset,
  onApplyDrumPattern,
  activeCycle,
  cyclesBusy,
  cyclesError,
  cyclesNotice,
  editorNotice,
  suggestCycleName,
  onSaveCurrentCycle,
  onUpdateActiveCycle,
  onDiscardChanges,
  isLoggedIn,
  online,
  onSetCyclePublic,
  onDeleteCycle,
  onCycleDeleted,
}: CompositorEditorProps) {
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState<CompositorEditorTab>("ciclo");
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [cycleStructureConfirmOpen, setCycleStructureConfirmOpen] =
    useState(false);
  const [pendingCycleStructureChange, setPendingCycleStructureChange] =
    useState<PendingCycleStructureChange | null>(null);
  const [drumPatternConfirmOpen, setDrumPatternConfirmOpen] = useState(false);
  const [pendingDrumPatternId, setPendingDrumPatternId] =
    useState<CompositorDrumPatternId | null>(null);

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

  const configLocked = isPlaying || isPreviewingTrack;
  const trackOverflowWarning = useMemo(() => {
    if (!pieceHasTrackOverflow(piece)) {
      return null;
    }

    return COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD(
      formatTrackOverflowDetails(piece),
    );
  }, [piece]);
  const pendingDrumPattern = pendingDrumPatternId
    ? getCompositorDrumPatternById(pendingDrumPatternId)
    : null;

  const tabSummary = useMemo(() => {
    switch (activeTab) {
      case "ciclo":
        return "";
      case "bateria": {
        const capacity = formatTrackCapacityLabel(drumTrack.events.length);
        const atCapacity = isTrackAtCapacity(drumTrack);
        return `Batería · ${capacity}${atCapacity ? " · límite alcanzado" : ""}`;
      }
      case "melodias": {
        const capacity = formatTrackCapacityLabel(melodicTrack.events.length);
        const atCapacity = isTrackAtCapacity(melodicTrack);
        return `${getInstrumentLabel(melodicTrackId)} · ${capacity}${atCapacity ? " · límite alcanzado" : ""} · ${NOTAS_ES[tonalidadComposicion]}`;
      }
      case "practicar":
        return "";
    }
  }, [activeTab, drumTrack, melodicTrack, melodicTrackId, tonalidadComposicion]);

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

  function handleDrumPatternClick(patternId: CompositorDrumPatternId) {
    if (configLocked || patternId === activeDrumPatternId) {
      return;
    }

    if (bateriaTrackHasEvents(piece)) {
      setPendingDrumPatternId(patternId);
      setDrumPatternConfirmOpen(true);
      return;
    }

    onApplyDrumPattern(patternId);
  }

  return (
    <div className="space-y-2.5">
      <CompositorEditorStatusBar
        piece={piece}
        disabled={configLocked}
        isLoggedIn={isLoggedIn}
        online={online}
        activeCycle={activeCycle}
        isPieceModifiedFromBaseline={isPieceModifiedFromBaseline}
        cyclesBusy={cyclesBusy}
        cyclesError={cyclesError}
        cyclesNotice={cyclesNotice}
        editorNotice={editorNotice}
        trackOverflowWarning={trackOverflowWarning}
        suggestCycleName={suggestCycleName}
        onSaveCurrentCycle={onSaveCurrentCycle}
        onUpdateActiveCycle={onUpdateActiveCycle}
        onDiscardChanges={onDiscardChanges}
        onSetCyclePublic={onSetCyclePublic}
        onDeleteCycle={onDeleteCycle}
        onCycleDeleted={onCycleDeleted}
      />

      {isDesktop ? (
        <CompositorDesktopEditorShell
          piece={piece}
          activeTrackId={activeTrackId}
          activeDrumPatternId={activeDrumPatternId}
          selectedEventId={selectedEventId}
          cycleGolpes={cycleGolpes}
          cycleBeatDurations={cycleBeatDurations}
          bpm={bpm}
          tonalidadComposicion={tonalidadComposicion}
          isPlaying={isPlaying}
          isPreviewingTrack={isPreviewingTrack}
          cycleProgress={cycleProgress}
          tapTempoTapCount={tapTempoTapCount}
          onSetActiveTrackId={onSetActiveTrackId}
          onSetSelectedEventId={onSetSelectedEventId}
          onToggleTrack={onToggleTrack}
          onSetBpm={onSetBpm}
          onSetCycleGolpes={onSetCycleGolpes}
          onSetCycleBeatDurationAtSlot={onSetCycleBeatDurationAtSlot}
          onSetTonalidadComposicion={onSetTonalidadComposicion}
          onPlaceTrackEvent={onPlaceTrackEvent}
          onUpdateTrackEvent={onUpdateTrackEvent}
          onRemoveTrackEvent={onRemoveTrackEvent}
          onTapTempo={onTapTempo}
          onStart={onStart}
          onPreviewActiveTrack={onPreviewActiveTrack}
          onStop={onStop}
          onReset={onReset}
          onSelectDrumPattern={handleDrumPatternClick}
        />
      ) : (
      <CompositorEditorTabShell
        activeTab={activeTab}
        disabled={configLocked}
        summary={tabSummary}
        onTabChange={handleTabChange}
        onOpenPractice={() => setActiveTab("practicar")}
      >
          {activeTab === "ciclo" ? (
            <div className="space-y-2.5">
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

              <ToolRitmoTempoPanel
                bpm={bpm}
                isPlaying={isPlaying}
                tapTempoTapCount={tapTempoTapCount}
                onSetBpm={onSetBpm}
                onTapTempo={onTapTempo}
              />

              <div className="border-t border-dashed border-border/90 pt-2">
                <TapButton
                  type="button"
                  disabled={configLocked}
                  onClick={() => setResetConfirmOpen(true)}
                  aria-label="Restablecer todo el compositor"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-dark py-2 text-xs font-semibold text-text-muted disabled:opacity-50 lg:mx-auto lg:w-auto lg:px-6"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {COMPOSITOR_LABEL_RESET_ZONA}
                </TapButton>
              </div>
            </div>
          ) : null}

          {activeTab === "bateria" ? (
            <div className="space-y-2.5">
              <CompositorDrumPatternPicker
                activePatternId={activeDrumPatternId}
                disabled={configLocked}
                onSelectPattern={handleDrumPatternClick}
              />
              <CompositorTrackTimeline
              piece={piece}
              instrumentId="bateria"
              events={drumTrack.events}
              selectedEventId={selectedDrumEvent ? selectedEventId : null}
              cycleProgress={isPreviewingTrack ? cycleProgress : null}
              octaveExact={true}
              disabled={configLocked}
              trackAtCapacity={isTrackAtCapacity(drumTrack)}
              isPreviewingTrack={isPreviewingTrack}
              previewDisabled={isPlaying}
              capasMode="none"
              placementMode="drum"
              onSelectEvent={onSetSelectedEventId}
              onUpdateEvent={(eventId, patch) =>
                onUpdateTrackEvent(eventId, patch)
              }
              onPlaceEvent={(partial) =>
                onPlaceTrackEvent("bateria", partial)
              }
              onRemoveEvent={onRemoveTrackEvent}
              onPreviewTrack={() => void onPreviewActiveTrack()}
            />
            </div>
          ) : null}

          {activeTab === "melodias" ? (
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
              trackAtCapacity={isTrackAtCapacity(melodicTrack)}
              isPreviewingTrack={isPreviewingTrack}
              previewDisabled={isPlaying}
              capasMode="melodic"
              placementMode="melodic"
              tonalidadComposicion={tonalidadComposicion}
              onSetTonalidadComposicion={onSetTonalidadComposicion}
              onSelectTrack={onSetActiveTrackId}
              onSelectEvent={onSetSelectedEventId}
              onUpdateEvent={(eventId, patch) =>
                onUpdateTrackEvent(eventId, patch)
              }
              onPlaceEvent={(partial, options) =>
                onPlaceTrackEvent(melodicTrackId, partial, options)
              }
              onRemoveEvent={onRemoveTrackEvent}
              onPreviewTrack={() => void onPreviewActiveTrack()}
            />
          ) : null}

          {activeTab === "practicar" ? (
            <CompositorListenView
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
          ) : null}
      </CompositorEditorTabShell>
      )}

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
        open={drumPatternConfirmOpen}
        message={
          pendingDrumPattern
            ? COMPOSITOR_CONFIRM_APLICAR_RITMO_BATERIA(pendingDrumPattern.label)
            : ""
        }
        confirmLabel="Sí, cargar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          if (pendingDrumPatternId) {
            onApplyDrumPattern(pendingDrumPatternId);
          }

          setDrumPatternConfirmOpen(false);
          setPendingDrumPatternId(null);
        }}
        onCancel={() => {
          setDrumPatternConfirmOpen(false);
          setPendingDrumPatternId(null);
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
