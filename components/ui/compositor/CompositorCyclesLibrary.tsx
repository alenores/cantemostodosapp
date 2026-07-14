"use client";

import { CompositorCycleCard } from "@/components/ui/compositor/CompositorCycleCard";
import { CompositorMidiImportButton } from "@/components/ui/compositor/CompositorMidiImportButton";
import { TapButton } from "@/components/ui/TapFeedback";
import type { CompositorInstrumentId, CompositorPiece } from "@/lib/compositor";
import type { CompositorCycle } from "@/lib/compositor-cycles";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import {
  COMPOSITOR_LABEL_MIS_CICLOS,
  COMPOSITOR_LABEL_NUEVO_CICLO,
} from "@/lib/ritmo-terminologia";
import { Plus, RefreshCw } from "lucide-react";

type CompositorCyclesLibraryProps = {
  isLoggedIn: boolean;
  online: boolean;
  savedCycles: CompositorCycle[];
  cyclesLoading: boolean;
  cyclesBusy: boolean;
  cyclesError: string | null;
  listeningCycleId: string | null;
  playbackPiece: CompositorPiece;
  activeTrackId: CompositorInstrumentId;
  selectedEventIds: string[];
  bpm: number;
  tonalidadComposicion: NotaIndex;
  modoTonalComposicion: ModoTonal;
  isPlaying: boolean;
  cycleProgress: number | null;
  listenMutedTrackIds: CompositorInstrumentId[];
  onRefreshCycles: () => Promise<void>;
  onBeginNewCycle: () => void;
  onImportMidiFile?: (file: File) => void | Promise<void>;
  onToggleListenCycle: (cycleId: string) => void;
  onEditCycle: (cycleId: string) => void;
  onSetBpm: (value: number) => void;
  onSetTonalidadComposicion: (value: NotaIndex) => void;
  onSetModoTonalComposicion: (value: ModoTonal) => void;
  onToggleListenTrack: (instrumentId: CompositorInstrumentId, enabled: boolean) => void;
  onEnterListen: () => void;
  onStartPlayback: () => void;
  onStopPlayback: () => void;
};

export function CompositorCyclesLibrary({
  isLoggedIn,
  online,
  savedCycles,
  cyclesLoading,
  cyclesBusy,
  cyclesError,
  listeningCycleId,
  playbackPiece,
  activeTrackId,
  selectedEventIds,
  bpm,
  tonalidadComposicion,
  modoTonalComposicion,
  isPlaying,
  cycleProgress,
  listenMutedTrackIds,
  onRefreshCycles,
  onBeginNewCycle,
  onImportMidiFile,
  onToggleListenCycle,
  onEditCycle,
  onSetBpm,
  onSetTonalidadComposicion,
  onSetModoTonalComposicion,
  onToggleListenTrack,
  onEnterListen,
  onStartPlayback,
  onStopPlayback,
}: CompositorCyclesLibraryProps) {
  const controlsDisabled = cyclesBusy;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-bg-card/70 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-compositor-config">
            {COMPOSITOR_LABEL_MIS_CICLOS}
          </p>

          <TapButton
            type="button"
            aria-label="Actualizar lista de ciclos"
            disabled={controlsDisabled || cyclesLoading}
            onClick={() => void onRefreshCycles()}
            className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-darker disabled:opacity-40"
          >
            <RefreshCw
              className={`size-3 text-text-muted ${cyclesLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </TapButton>
        </div>

        {!isLoggedIn ? (
          <p className="mt-0.5 truncate text-[9px] text-text-muted">
            Solo en este dispositivo · iniciá sesión para sincronizar
          </p>
        ) : !online ? (
          <p className="mt-0.5 truncate text-[9px] text-text-muted">
            Sin conexión · ciclos locales
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <TapButton
            type="button"
            disabled={controlsDisabled}
            onClick={onBeginNewCycle}
            className="inline-flex min-h-8 flex-1 items-center justify-center gap-1 rounded-full border border-compositor-config/35 bg-compositor-config/10 px-2.5 py-1 text-[11px] font-bold text-compositor-config disabled:opacity-40 sm:flex-none"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {COMPOSITOR_LABEL_NUEVO_CICLO}
          </TapButton>

          {onImportMidiFile ? (
            <CompositorMidiImportButton
              disabled={controlsDisabled}
              onPickFile={onImportMidiFile}
            />
          ) : null}
        </div>

        {cyclesError ? (
          <p className="mt-1.5 text-[10px] leading-snug text-[var(--tuner-lejos)]">
            {cyclesError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        {cyclesLoading && savedCycles.length === 0 ? (
          <p className="px-1 text-[10px] text-text-muted">Cargando ciclos…</p>
        ) : null}

        {!cyclesLoading && savedCycles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-2.5 py-3 text-center text-[10px] leading-snug text-text-muted">
            Todavía no hay ciclos guardados.
          </p>
        ) : null}

        {savedCycles.map((cycle) => (
          <CompositorCycleCard
            key={cycle.id}
            cycle={cycle}
            controlsDisabled={controlsDisabled}
            isExpanded={listeningCycleId === cycle.id}
            isPlaybackActive={listeningCycleId === cycle.id}
            piece={playbackPiece}
            activeTrackId={activeTrackId}
            selectedEventIds={selectedEventIds}
            bpm={bpm}
            tonalidadComposicion={tonalidadComposicion}
            modoTonalComposicion={modoTonalComposicion}
            isPlaying={isPlaying}
            cycleProgress={cycleProgress}
            listenMutedTrackIds={listenMutedTrackIds}
            onToggleListen={() => onToggleListenCycle(cycle.id)}
            onEdit={() => onEditCycle(cycle.id)}
            onSetBpm={onSetBpm}
            onSetTonalidadComposicion={onSetTonalidadComposicion}
            onSetModoTonalComposicion={onSetModoTonalComposicion}
            onToggleListenTrack={onToggleListenTrack}
            onEnterListen={onEnterListen}
            onStart={onStartPlayback}
            onStop={onStopPlayback}
          />
        ))}
      </div>
    </div>
  );
}
