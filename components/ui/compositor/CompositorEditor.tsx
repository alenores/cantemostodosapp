"use client";

import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { CompositorPcEditorShell } from "@/components/ui/compositor/CompositorPcEditorShell";
import { CompositorDrumPatternPicker } from "@/components/ui/compositor/CompositorDrumPatternPicker";
import { CompositorMelodicPatternPicker } from "@/components/ui/compositor/CompositorMelodicPatternPicker";
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
import { ToolModalMobileBleed } from "@/components/ui/ToolModalSections";
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
import {
  getCompositorMelodicPatternById,
  melodicTrackHasEvents,
  type CompositorMelodicPatternId,
} from "@/lib/compositor-melodic-patterns";
import type { NotaIndex } from "@/lib/cifrado";
import { formatCompositorTonalidadLabel } from "@/lib/compositor";
import type { ModoTonal } from "@/lib/cifrado-escala";
import {
  COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE,
  COMPOSITOR_CONFIRM_APLICAR_RITMO_BATERIA,
  COMPOSITOR_CONFIRM_APLICAR_MELODIA,
  COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE,
  COMPOSITOR_CONFIRM_RESET_MESSAGE,
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_LABEL_ELIMINAR_CICLO,
  COMPOSITOR_LABEL_RESET_ZONA,
  COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD,
} from "@/lib/ritmo-terminologia";
import type {
  MetronomeBeatDuration,
  MetronomeBeatDurationPattern,
} from "@/lib/metronomo";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { RotateCcw, Trash2 } from "lucide-react";
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
  activeMelodicPatternId: CompositorMelodicPatternId | null;
  activeMelodicPatternInstrumentId: CompositorMelodicInstrumentId | null;
  isPieceModifiedFromBaseline: boolean;
  selectedEventIds: string[];
  cycleGolpes: number;
  cycleBeatDurations: MetronomeBeatDurationPattern;
  bpm: number;
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  isPlaying: boolean;
  isPreviewingTrack: boolean;
  previewingDrumPatternId: CompositorDrumPatternId | null;
  drumPatternPreviewProgress: number | null;
  previewingMelodicPatternId: CompositorMelodicPatternId | null;
  melodicPatternPreviewProgress: number | null;
  cycleProgress: number | null;
  tapTempoTapCount: number;
  samplesLoading: boolean;
  onSetActiveTrackId: (instrumentId: CompositorInstrumentId) => void;
  onSetSelectedEventIds: (eventIds: string[]) => void;
  onToggleTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onToggleListenTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onEnterListen: () => void;
  listenMutedTrackIds: CompositorInstrumentId[];
  onSetBpm: (value: number) => void;
  onSetCycleGolpes: (value: number) => void;
  onSetCycleBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onSetModoTonalComposicion: (value: ModoTonal) => void;
  onPlaceTrackEvent: (
    instrumentId: CompositorInstrumentId,
    partial: Partial<CompositorTrackEvent>,
    options?: {
      rowId?: string;
      octaveExact?: boolean;
      selectOnPlace?: boolean;
    },
  ) => string | null;
  onUpdateTrackEvent: (
    eventId: string,
    patch: Partial<CompositorTrackEvent>,
    instrumentId?: CompositorInstrumentId,
  ) => void;
  onUpdateTrackEvents: (
    updates: { eventId: string; patch: Partial<CompositorTrackEvent> }[],
    instrumentId?: CompositorInstrumentId,
  ) => void;
  onRemoveTrackEvents: (
    eventIds: string[],
    instrumentId?: CompositorInstrumentId,
  ) => void;
  onTapTempo: () => void;
  onStart: () => void;
  onPreviewActiveTrack: () => void;
  onPreviewDrumPattern: (patternId: CompositorDrumPatternId) => void;
  onStopDrumPatternPreview: () => void;
  onPreviewMelodicPattern: (
    patternId: CompositorMelodicPatternId,
    instrumentId: CompositorMelodicInstrumentId,
  ) => void;
  onStopMelodicPatternPreview: () => void;
  onStop: () => void;
  onReset: () => void;
  onApplyDrumPattern: (patternId: CompositorDrumPatternId) => void;
  onApplyMelodicPattern: (
    patternId: CompositorMelodicPatternId,
    instrumentId: CompositorMelodicInstrumentId,
  ) => void;
  activeCycle: CompositorCycle | null;
  cyclesBusy: boolean;
  cyclesError: string | null;
  cyclesNotice: string | null;
  editorNotice: string | null;
  cycleName: string;
  onCycleNameChange: (value: string) => void;
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
  activeMelodicPatternId,
  activeMelodicPatternInstrumentId,
  isPieceModifiedFromBaseline,
  selectedEventIds,
  cycleGolpes,
  cycleBeatDurations,
  bpm,
  tonalidadComposicion,
  modoTonalComposicion,
  isPlaying,
  isPreviewingTrack,
  previewingDrumPatternId,
  drumPatternPreviewProgress,
  previewingMelodicPatternId,
  melodicPatternPreviewProgress,
  cycleProgress,
  tapTempoTapCount,
  samplesLoading,
  onSetActiveTrackId,
  onSetSelectedEventIds,
  onToggleTrack,
  onToggleListenTrack,
  onEnterListen,
  listenMutedTrackIds,
  onSetBpm,
  onSetCycleGolpes,
  onSetCycleBeatDurationAtSlot,
  onSetTonalidadComposicion,
  onSetModoTonalComposicion,
  onPlaceTrackEvent,
  onUpdateTrackEvent,
  onUpdateTrackEvents,
  onRemoveTrackEvents,
  onTapTempo,
  onStart,
  onPreviewActiveTrack,
  onPreviewDrumPattern,
  onStopDrumPatternPreview,
  onPreviewMelodicPattern,
  onStopMelodicPatternPreview,
  onStop,
  onReset,
  onApplyDrumPattern,
  onApplyMelodicPattern,
  activeCycle,
  cyclesBusy,
  cyclesError,
  cyclesNotice,
  editorNotice,
  cycleName,
  onCycleNameChange,
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
  const [deleteCycleConfirmOpen, setDeleteCycleConfirmOpen] = useState(false);
  const [cycleStructureConfirmOpen, setCycleStructureConfirmOpen] =
    useState(false);
  const [pendingCycleStructureChange, setPendingCycleStructureChange] =
    useState<PendingCycleStructureChange | null>(null);
  const [drumPatternConfirmOpen, setDrumPatternConfirmOpen] = useState(false);
  const [pendingDrumPatternId, setPendingDrumPatternId] =
    useState<CompositorDrumPatternId | null>(null);
  const [melodicPatternConfirmOpen, setMelodicPatternConfirmOpen] =
    useState(false);
  const [pendingMelodicPatternId, setPendingMelodicPatternId] =
    useState<CompositorMelodicPatternId | null>(null);

  const drumTrack = getCompositorTrack(piece, "bateria");
  const melodicTrackId = isMelodicInstrumentId(activeTrackId)
    ? activeTrackId
    : "piano";
  const melodicTrack = getCompositorTrack(piece, melodicTrackId);
  const selectedDrumEvent =
    selectedEventIds.length === 1
      ? drumTrack.events.find((event) => event.id === selectedEventIds[0]) ??
        null
      : null;
  const selectedMelodicEvent =
    selectedEventIds.length === 1
      ? melodicTrack.events.find((event) => event.id === selectedEventIds[0]) ??
        null
      : null;

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
  const pendingMelodicPattern = pendingMelodicPatternId
    ? getCompositorMelodicPatternById(pendingMelodicPatternId)
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
        return `${getInstrumentLabel(melodicTrackId)} · ${capacity}${atCapacity ? " · límite alcanzado" : ""} · ${formatCompositorTonalidadLabel(tonalidadComposicion, modoTonalComposicion)}`;
      }
      case "practicar":
        return "";
    }
  }, [activeTab, drumTrack, melodicTrack, melodicTrackId, tonalidadComposicion, modoTonalComposicion]);

  function handleTabChange(tab: CompositorEditorTab) {
    setActiveTab(tab);

    if (tab === "bateria") {
      onSetActiveTrackId("bateria");
      onSetSelectedEventIds([]);
      return;
    }

    if (tab === "melodias" && !isMelodicInstrumentId(activeTrackId)) {
      onSetActiveTrackId("piano");
      onSetSelectedEventIds([]);
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

  function handleMelodicPatternClick(patternId: CompositorMelodicPatternId) {
    if (
      configLocked ||
      (patternId === activeMelodicPatternId &&
        activeMelodicPatternInstrumentId === melodicTrackId)
    ) {
      return;
    }

    if (melodicTrackHasEvents(piece, melodicTrackId)) {
      setPendingMelodicPatternId(patternId);
      setMelodicPatternConfirmOpen(true);
      return;
    }

    onApplyMelodicPattern(patternId, melodicTrackId);
  }

  return (
    <div
      className={
        isDesktop
          ? "flex min-h-0 flex-1 flex-col"
          : undefined
      }
    >
      {!isDesktop ? (
        <ToolModalMobileBleed className="space-y-2.5">
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
            cycleName={cycleName}
            onCycleNameChange={onCycleNameChange}
            onSaveCurrentCycle={onSaveCurrentCycle}
            onUpdateActiveCycle={onUpdateActiveCycle}
            onDiscardChanges={onDiscardChanges}
            onSetCyclePublic={onSetCyclePublic}
            onDeleteCycle={onDeleteCycle}
            onCycleDeleted={onCycleDeleted}
          />

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
                  accent="compositor"
                  onSetBpm={onSetBpm}
                  onTapTempo={onTapTempo}
                />

                <div className="border-t border-dashed border-border/90 pt-2">
                  {activeCycle && onDeleteCycle ? (
                    <TapButton
                      type="button"
                      disabled={configLocked || cyclesBusy}
                      onClick={() => setDeleteCycleConfirmOpen(true)}
                      aria-label={`Eliminar ${activeCycle.nombre}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--tuner-lejos)]/35 bg-[var(--tuner-lejos)]/10 py-2 text-xs font-semibold text-[var(--tuner-lejos)] disabled:opacity-50 lg:mx-auto lg:w-auto lg:px-6"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      {COMPOSITOR_LABEL_ELIMINAR_CICLO}
                    </TapButton>
                  ) : (
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
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "bateria" ? (
              <div className="space-y-2.5">
                <CompositorDrumPatternPicker
                  activePatternId={activeDrumPatternId}
                  previewingPatternId={previewingDrumPatternId}
                  previewProgress={drumPatternPreviewProgress}
                  disabled={configLocked}
                  onSelectPattern={handleDrumPatternClick}
                  onPreviewPattern={(patternId) =>
                    void onPreviewDrumPattern(patternId)
                  }
                  onStopPreview={onStopDrumPatternPreview}
                />
                <CompositorTrackTimeline
                  piece={piece}
                  instrumentId="bateria"
                  events={drumTrack.events}
                  selectedEventIds={
                    selectedDrumEvent || selectedEventIds.length > 1
                      ? selectedEventIds.filter((id) =>
                          drumTrack.events.some((event) => event.id === id),
                        )
                      : []
                  }
                  cycleProgress={isPreviewingTrack ? cycleProgress : null}
                  octaveExact={true}
                  disabled={configLocked}
                  trackAtCapacity={isTrackAtCapacity(drumTrack)}
                  isPreviewingTrack={isPreviewingTrack}
                  previewDisabled={isPlaying}
                  capasMode="none"
                  placementMode="drum"
                  onSelectEventIds={onSetSelectedEventIds}
                  onUpdateEvent={(eventId, patch) =>
                    onUpdateTrackEvent(eventId, patch)
                  }
                  onUpdateEvents={(updates) =>
                    onUpdateTrackEvents(updates, "bateria")
                  }
                  onPlaceEvent={(partial) =>
                    onPlaceTrackEvent("bateria", partial)
                  }
                  onRemoveEvents={(eventIds) =>
                    onRemoveTrackEvents(eventIds, "bateria")
                  }
                  onPreviewTrack={() => void onPreviewActiveTrack()}
                />
              </div>
            ) : null}

            {activeTab === "melodias" ? (
              <div className="space-y-2.5">
                <CompositorMelodicPatternPicker
                  instrumentId={melodicTrackId}
                  activePatternId={
                    activeMelodicPatternInstrumentId === melodicTrackId
                      ? activeMelodicPatternId
                      : null
                  }
                  previewingPatternId={previewingMelodicPatternId}
                  previewProgress={melodicPatternPreviewProgress}
                  disabled={configLocked}
                  onSelectPattern={handleMelodicPatternClick}
                  onPreviewPattern={(patternId) =>
                    void onPreviewMelodicPattern(patternId, melodicTrackId)
                  }
                  onStopPreview={onStopMelodicPatternPreview}
                />
                <CompositorTrackTimeline
                  piece={piece}
                  instrumentId={melodicTrackId}
                  events={melodicTrack.events}
                  selectedEventIds={selectedEventIds.filter((id) =>
                    melodicTrack.events.some((event) => event.id === id),
                  )}
                  cycleProgress={isPreviewingTrack ? cycleProgress : null}
                  octaveExact={true}
                  disabled={configLocked}
                  trackAtCapacity={isTrackAtCapacity(melodicTrack)}
                  isPreviewingTrack={isPreviewingTrack}
                  previewDisabled={isPlaying}
                  capasMode="melodic"
                  placementMode="melodic"
                  tonalidadComposicion={tonalidadComposicion}
                  modoTonalComposicion={modoTonalComposicion}
                  onSetTonalidadComposicion={onSetTonalidadComposicion}
                  onSetModoTonalComposicion={onSetModoTonalComposicion}
                  onSelectTrack={onSetActiveTrackId}
                  onSelectEventIds={onSetSelectedEventIds}
                  onUpdateEvent={(eventId, patch) =>
                    onUpdateTrackEvent(eventId, patch)
                  }
                  onUpdateEvents={(updates) =>
                    onUpdateTrackEvents(updates, melodicTrackId)
                  }
                  onPlaceEvent={(partial, options) =>
                    onPlaceTrackEvent(melodicTrackId, partial, options)
                  }
                  onRemoveEvents={(eventIds) =>
                    onRemoveTrackEvents(eventIds, melodicTrackId)
                  }
                  onPreviewTrack={() => void onPreviewActiveTrack()}
                />
              </div>
            ) : null}

            {activeTab === "practicar" ? (
              <CompositorListenView
                piece={piece}
                activeTrackId={activeTrackId}
                selectedEventIds={selectedEventIds}
                bpm={bpm}
                tonalidadComposicion={tonalidadComposicion}
                modoTonalComposicion={modoTonalComposicion}
                isPlaying={isPlaying}
                cycleProgress={cycleProgress}
                listenMutedTrackIds={listenMutedTrackIds}
                onSetBpm={onSetBpm}
                onSetTonalidadComposicion={onSetTonalidadComposicion}
                onSetModoTonalComposicion={onSetModoTonalComposicion}
                onToggleListenTrack={onToggleListenTrack}
                onEnterListen={onEnterListen}
                onStart={onStart}
                onStop={onStop}
              />
            ) : null}
          </CompositorEditorTabShell>
        </ToolModalMobileBleed>
      ) : (
        <CompositorPcEditorShell
          piece={piece}
          activeTrackId={activeTrackId}
          activeDrumPatternId={activeDrumPatternId}
          activeMelodicPatternId={activeMelodicPatternId}
          activeMelodicPatternInstrumentId={activeMelodicPatternInstrumentId}
          selectedEventIds={selectedEventIds}
          cycleGolpes={cycleGolpes}
          cycleBeatDurations={cycleBeatDurations}
          bpm={bpm}
          tonalidadComposicion={tonalidadComposicion}
          modoTonalComposicion={modoTonalComposicion}
          isPlaying={isPlaying}
          isPreviewingTrack={isPreviewingTrack}
          previewingDrumPatternId={previewingDrumPatternId}
          drumPatternPreviewProgress={drumPatternPreviewProgress}
          previewingMelodicPatternId={previewingMelodicPatternId}
          melodicPatternPreviewProgress={melodicPatternPreviewProgress}
          cycleProgress={cycleProgress}
          tapTempoTapCount={tapTempoTapCount}
          disabled={configLocked}
          onSetActiveTrackId={onSetActiveTrackId}
          onSetSelectedEventIds={onSetSelectedEventIds}
          onToggleTrack={onToggleTrack}
          onToggleListenTrack={onToggleListenTrack}
          onEnterListen={onEnterListen}
          listenMutedTrackIds={listenMutedTrackIds}
          onSetBpm={onSetBpm}
          onSetTonalidadComposicion={onSetTonalidadComposicion}
          onSetModoTonalComposicion={onSetModoTonalComposicion}
          onPlaceTrackEvent={onPlaceTrackEvent}
          onUpdateTrackEvent={onUpdateTrackEvent}
          onUpdateTrackEvents={onUpdateTrackEvents}
          onRemoveTrackEvents={onRemoveTrackEvents}
          onTapTempo={onTapTempo}
          onPreviewActiveTrack={onPreviewActiveTrack}
          onPreviewDrumPattern={onPreviewDrumPattern}
          onStopDrumPatternPreview={onStopDrumPatternPreview}
          onPreviewMelodicPattern={onPreviewMelodicPattern}
          onStopMelodicPatternPreview={onStopMelodicPatternPreview}
          onStart={onStart}
          onStop={onStop}
          onRequestCycleGolpesChange={requestCycleGolpesChange}
          onRequestCycleBeatDurationChange={requestCycleBeatDurationChange}
          onSelectDrumPattern={handleDrumPatternClick}
          onSelectMelodicPattern={handleMelodicPatternClick}
        />
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
        open={melodicPatternConfirmOpen}
        message={
          pendingMelodicPattern
            ? COMPOSITOR_CONFIRM_APLICAR_MELODIA(
                pendingMelodicPattern.label,
                getInstrumentLabel(melodicTrackId),
              )
            : ""
        }
        confirmLabel="Sí, cargar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          if (pendingMelodicPatternId) {
            onApplyMelodicPattern(pendingMelodicPatternId, melodicTrackId);
          }

          setMelodicPatternConfirmOpen(false);
          setPendingMelodicPatternId(null);
        }}
        onCancel={() => {
          setMelodicPatternConfirmOpen(false);
          setPendingMelodicPatternId(null);
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

      <ConfirmDialog
        open={deleteCycleConfirmOpen}
        message={
          activeCycle
            ? COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE(activeCycle.nombre)
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={60}
        onConfirm={() => {
          if (!activeCycle || !onDeleteCycle) {
            return;
          }

          setDeleteCycleConfirmOpen(false);
          void onDeleteCycle(activeCycle.id).then(() => {
            onCycleDeleted?.();
          });
        }}
        onCancel={() => setDeleteCycleConfirmOpen(false)}
      />
    </div>
  );
}
