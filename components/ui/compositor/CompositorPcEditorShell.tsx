"use client";

import { CompositorDrumPatternPicker } from "@/components/ui/compositor/CompositorDrumPatternPicker";
import { CompositorDesktopCicloBar } from "@/components/ui/compositor/CompositorDesktopCicloBar";
import { CompositorDesktopTempoBar } from "@/components/ui/compositor/CompositorDesktopTempoBar";
import { CompositorInstrumentIcon } from "@/components/ui/compositor/CompositorInstrumentIcon";
import { CompositorListenView } from "@/components/ui/compositor/CompositorListenView";
import { CompositorTrackTimeline } from "@/components/ui/compositor/CompositorTrackTimeline";
import type { CompositorEditorProps } from "@/components/ui/compositor/CompositorEditor";
import type { CompositorEditorTab } from "@/components/ui/compositor/CompositorEditorTabShell";
import {
  COMPOSITOR_INSTRUMENT_OPTIONS,
  COMPOSITOR_MELODIC_INSTRUMENT_IDS,
  formatTrackCapacityLabel,
  getCompositorTrack,
  isTrackAtCapacity,
  type CompositorInstrumentId,
  type CompositorMelodicInstrumentId,
} from "@/lib/compositor";
import type { CompositorDrumPatternId } from "@/lib/compositor-drum-patterns";
import {
  COMPOSITOR_LABEL_CICLO_COMPARTIDO,
  COMPOSITOR_TAB_BATERIA,
  COMPOSITOR_TAB_CICLO,
  COMPOSITOR_TAB_MELODIAS,
  COMPOSITOR_TAB_PRACTICAR,
} from "@/lib/ritmo-terminologia";
import { forwardVerticalWheel } from "@/lib/forward-vertical-wheel";
import { Play } from "lucide-react";
import { useState } from "react";

const MELODIC_OPTIONS = COMPOSITOR_INSTRUMENT_OPTIONS.filter((option) =>
  COMPOSITOR_MELODIC_INSTRUMENT_IDS.includes(
    option.id as CompositorMelodicInstrumentId,
  ),
);

function primaryTabClass(isActive: boolean) {
  return `shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold leading-none transition-colors disabled:opacity-50 ${
    isActive
      ? "bg-compositor-config text-white shadow-sm"
      : "text-text-muted hover:bg-bg-card/70 hover:text-text-primary"
  }`;
}

function melodiasGroupTabClass(isActive: boolean) {
  return `shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold leading-none transition-colors disabled:opacity-50 ${
    isActive
      ? "bg-transparent text-compositor-config underline decoration-compositor-config decoration-2 underline-offset-[4px]"
      : "text-compositor-config hover:bg-compositor-config/10"
  }`;
}

function practiceTabClass(isActive: boolean) {
  return `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold leading-none transition-colors disabled:opacity-50 ${
    isActive
      ? "bg-tool-practice text-white shadow-sm"
      : "text-tool-practice hover:bg-tool-practice/10"
  }`;
}

function isMelodicId(
  id: CompositorInstrumentId,
): id is CompositorMelodicInstrumentId {
  return COMPOSITOR_MELODIC_INSTRUMENT_IDS.includes(
    id as CompositorMelodicInstrumentId,
  );
}

type CompositorPcEditorShellProps = Pick<
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
  | "onToggleListenTrack"
  | "onEnterListen"
  | "listenMutedTrackIds"
  | "onSetBpm"
  | "onSetTonalidadComposicion"
  | "onPlaceTrackEvent"
  | "onUpdateTrackEvent"
  | "onRemoveTrackEvent"
  | "onTapTempo"
  | "onPreviewActiveTrack"
  | "onStart"
  | "onStop"
> & {
  disabled: boolean;
  onRequestCycleGolpesChange: (value: number) => void;
  onRequestCycleBeatDurationChange: (
    slotIndex: number,
    duration: import("@/lib/metronomo").MetronomeBeatDuration,
  ) => void;
  onSelectDrumPattern: (patternId: CompositorDrumPatternId) => void;
};

export function CompositorPcEditorShell({
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
  disabled,
  onSetActiveTrackId,
  onSetSelectedEventId,
  onToggleTrack,
  onToggleListenTrack,
  onEnterListen,
  listenMutedTrackIds,
  onSetBpm,
  onSetTonalidadComposicion,
  onPlaceTrackEvent,
  onUpdateTrackEvent,
  onRemoveTrackEvent,
  onTapTempo,
  onPreviewActiveTrack,
  onStart,
  onStop,
  onRequestCycleGolpesChange,
  onRequestCycleBeatDurationChange,
  onSelectDrumPattern,
}: CompositorPcEditorShellProps) {
  const [activeTab, setActiveTab] = useState<CompositorEditorTab>("ciclo");
  const [melodiasExpanded, setMelodiasExpanded] = useState(false);

  const drumTrack = getCompositorTrack(piece, "bateria");
  const melodicTrackId = isMelodicId(activeTrackId) ? activeTrackId : "piano";
  const melodicTrack = getCompositorTrack(piece, melodicTrackId);
  const isPractice = activeTab === "practicar";
  const isMelodias = activeTab === "melodias";

  const selectedDrumEvent =
    selectedEventId == null
      ? null
      : drumTrack.events.find((event) => event.id === selectedEventId) ?? null;
  const selectedMelodicEvent =
    selectedEventId == null
      ? null
      : melodicTrack.events.find((event) => event.id === selectedEventId) ?? null;

  function openCiclo() {
    setMelodiasExpanded(false);
    setActiveTab("ciclo");
    onSetSelectedEventId(null);
  }

  function openBateria() {
    setMelodiasExpanded(false);
    setActiveTab("bateria");
    onSetActiveTrackId("bateria");
    onSetSelectedEventId(null);
  }

  function openMelodiasTab() {
    setMelodiasExpanded(true);
    setActiveTab("melodias");
    if (!isMelodicId(activeTrackId)) {
      onSetActiveTrackId("piano");
    }
    onSetSelectedEventId(null);
  }

  function openMelodicInstrument(instrumentId: CompositorMelodicInstrumentId) {
    setMelodiasExpanded(true);
    setActiveTab("melodias");
    onSetActiveTrackId(instrumentId);
    onSetSelectedEventId(null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border bg-bg-card">
      <div className="shrink-0 border-b border-border/80 bg-bg-darker px-3 py-1.5">
        <div
          className="flex items-center gap-2"
          role="tablist"
          aria-label="Secciones del editor"
        >
          <div
            className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onWheel={forwardVerticalWheel}
          >
            <div className="inline-flex min-w-max items-center gap-0.5 rounded-full border border-border/80 bg-bg-dark p-0.5">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "ciclo"}
                disabled={disabled}
                onClick={openCiclo}
                className={primaryTabClass(activeTab === "ciclo")}
              >
                {COMPOSITOR_TAB_CICLO}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "bateria"}
                disabled={disabled}
                onClick={openBateria}
                className={primaryTabClass(activeTab === "bateria")}
              >
                {COMPOSITOR_TAB_BATERIA}
              </button>

              {melodiasExpanded ? (
                <div
                  className={`inline-flex items-center gap-0.5 rounded-full p-0.5 transition-colors ${
                    isMelodias
                      ? "bg-bg-card/50 ring-1 ring-inset ring-border/70"
                      : "bg-compositor-config/8"
                  }`}
                  role="group"
                  aria-label={COMPOSITOR_TAB_MELODIAS}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isMelodias}
                    disabled={disabled}
                    onClick={openMelodiasTab}
                    className={melodiasGroupTabClass(isMelodias)}
                  >
                    {COMPOSITOR_TAB_MELODIAS}
                  </button>
                  <span
                    className="mx-0.5 h-4 w-px shrink-0 bg-compositor-config/25"
                    aria-hidden="true"
                  />
                  {MELODIC_OPTIONS.map((option) => {
                    const isActive =
                      isMelodias && melodicTrackId === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        disabled={disabled}
                        onClick={() =>
                          openMelodicInstrument(
                            option.id as CompositorMelodicInstrumentId,
                          )
                        }
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold leading-none transition-colors disabled:opacity-50 ${
                          isActive
                            ? "bg-compositor-config text-white"
                            : "text-text-primary hover:bg-bg-card/80"
                        }`}
                      >
                        <CompositorInstrumentIcon instrumentId={option.id} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isMelodias}
                  disabled={disabled}
                  onClick={openMelodiasTab}
                  className={primaryTabClass(isMelodias)}
                >
                  {COMPOSITOR_TAB_MELODIAS}
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            role="tab"
            aria-selected={isPractice}
            disabled={disabled}
            onClick={() => setActiveTab("practicar")}
            className={practiceTabClass(isPractice)}
          >
            <Play className="size-3 fill-current" aria-hidden="true" />
            {COMPOSITOR_TAB_PRACTICAR}
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          isPractice
            ? "bg-[var(--tool-practice-section-bg)]"
            : "bg-[color-mix(in_srgb,var(--compositor-config)_5%,var(--bg-card))]"
        }`}
      >
        {activeTab === "ciclo" ? (
          <div
            data-tool-vertical-scroll=""
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-y-contain p-5 touch-pan-y"
          >
            <div className="rounded-xl border border-border/80 bg-bg-darker/70 p-5">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-wide text-compositor-config">
                {COMPOSITOR_LABEL_CICLO_COMPARTIDO}
              </p>
              <CompositorDesktopCicloBar
                cycleGolpes={cycleGolpes}
                cycleBeatDurations={cycleBeatDurations}
                disabled={disabled}
                size="comfortable"
                accent="compositor"
                onSetCycleGolpes={onRequestCycleGolpesChange}
                onSetCycleBeatDurationAtSlot={onRequestCycleBeatDurationChange}
              />
            </div>

            <div className="w-fit rounded-xl border border-border/80 bg-bg-darker/70 p-5">
              <CompositorDesktopTempoBar
                bpm={bpm}
                isPlaying={isPlaying}
                tapTempoTapCount={tapTempoTapCount}
                disabled={disabled}
                onSetBpm={onSetBpm}
                onTapTempo={onTapTempo}
              />
            </div>
          </div>
        ) : null}

        {activeTab === "bateria" ? (
          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
            <CompositorTrackTimeline
              layout="desktop"
              capacityLabel={`${formatTrackCapacityLabel(drumTrack.events.length)}${
                isTrackAtCapacity(drumTrack) ? " · límite alcanzado" : ""
              }`}
              configHeaderTrailing={
                <div className="w-auto min-w-[8rem] max-w-[11rem]">
                  <CompositorDrumPatternPicker
                    activePatternId={activeDrumPatternId}
                    disabled={disabled}
                    onSelectPattern={onSelectDrumPattern}
                  />
                </div>
              }
              piece={piece}
              instrumentId="bateria"
              events={drumTrack.events}
              selectedEventId={selectedDrumEvent ? selectedEventId : null}
              cycleProgress={isPreviewingTrack ? cycleProgress : null}
              octaveExact={true}
              disabled={disabled}
              trackAtCapacity={isTrackAtCapacity(drumTrack)}
              isPreviewingTrack={isPreviewingTrack}
              previewDisabled={isPlaying}
              capasMode="none"
              placementMode="drum"
              onSelectEvent={onSetSelectedEventId}
              onUpdateEvent={(eventId, patch) =>
                onUpdateTrackEvent(eventId, patch)
              }
              onPlaceEvent={(partial) => onPlaceTrackEvent("bateria", partial)}
              onRemoveEvent={onRemoveTrackEvent}
              onPreviewTrack={() => void onPreviewActiveTrack()}
            />
          </div>
        ) : null}

        {activeTab === "melodias" ? (
          <div className="flex min-h-0 flex-1 flex-col px-3 py-2">
            <CompositorTrackTimeline
              layout="desktop"
              capacityLabel={`${formatTrackCapacityLabel(melodicTrack.events.length)}${
                isTrackAtCapacity(melodicTrack) ? " · límite alcanzado" : ""
              }`}
              piece={piece}
              instrumentId={melodicTrackId}
              events={melodicTrack.events}
              selectedEventId={
                selectedMelodicEvent ? selectedEventId : null
              }
              cycleProgress={isPreviewingTrack ? cycleProgress : null}
              octaveExact={true}
              disabled={disabled}
              trackAtCapacity={isTrackAtCapacity(melodicTrack)}
              isPreviewingTrack={isPreviewingTrack}
              previewDisabled={isPlaying}
              capasMode="none"
              placementMode="melodic"
              tonalidadComposicion={tonalidadComposicion}
              onSetTonalidadComposicion={onSetTonalidadComposicion}
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
          </div>
        ) : null}

        {activeTab === "practicar" ? (
          <div
            data-tool-vertical-scroll=""
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 touch-pan-y"
          >
            <CompositorListenView
              layout="desktop"
              piece={piece}
              activeTrackId={activeTrackId}
              selectedEventId={selectedEventId}
              bpm={bpm}
              tonalidadComposicion={tonalidadComposicion}
              isPlaying={isPlaying}
              cycleProgress={cycleProgress}
              listenMutedTrackIds={listenMutedTrackIds}
              onSetBpm={onSetBpm}
              onSetTonalidadComposicion={onSetTonalidadComposicion}
              onToggleListenTrack={onToggleListenTrack}
              onEnterListen={onEnterListen}
              onStart={onStart}
              onStop={onStop}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
