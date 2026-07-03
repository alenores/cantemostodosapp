"use client";

import {
  ToolPracticeSection,
} from "@/components/ui/ToolModalSections";
import PlayingEqIndicator from "@/components/ui/PlayingEqIndicator";
import { PlayCircleButton } from "@/components/ui/PlayCircleButton";
import {
  BeatPatternEditor,
  RitmoConfigSection,
} from "@/components/ui/ToolRitmoConfig";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  computeOnTimeStreak,
  getActivePatternSlice,
  getBeatLevelBarHeightPercent,
  getBeatLevelConfigColor,
  getBeatLevelLabel,
  getBeatDurationPatternSummary,
  getCycleMs,
  getHitAccuracy,
  getHitAccuracyColor,
  getHitFeedbackLabel,
  getTimelineWindowMs,
  getUpcomingBeatMarkers,
  type MetronomeBeatDuration,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatLevel,
  type MetronomeBeatMarker,
  type MetronomeBeatPattern,
  type MetronomeHit,
} from "@/lib/metronomo";
import { ToolModalHeader } from "@/components/ui/ToolModalHeader";
import {
  MetronomoConfigHelpButton,
  MetronomoConfigHelpModal,
} from "@/components/ui/MetronomoConfigHelpModal";
import {
  formatRitmoConfigSummary,
  RITMO_LABEL_TEMPO,
} from "@/lib/ritmo-terminologia";
import { Mic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type MetronomoModalProps = {
  open: boolean;
  onClose: () => void;
  bpm: number;
  isPlaying: boolean;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  currentBeat: number | null;
  micActivo: boolean;
  micPermissionGranted: boolean;
  micError: string | null;
  micReady: boolean;
  micStarting: boolean;
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  tapTempoTapCount: number;
  onStart: () => void;
  onStop: () => void;
  onSetBpm: (value: number) => void;
  onSetPatternLength: (value: number) => void;
  onSetBeatDurationAtSlot: (
    slotIndex: number,
    duration: MetronomeBeatDuration,
  ) => void;
  onSetBeatLevelAtSlot: (
    slotIndex: number,
    level: MetronomeBeatLevel,
  ) => void;
  onTapTempo: () => void;
  onToggleMic: () => void;
  onRequestMic: () => void;
};

function PracticePlaybackSummary({
  bpm,
  beatPattern,
  patternLength,
  currentBeat,
  isPlaying,
}: {
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  currentBeat: number | null;
  isPlaying: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <div className="flex justify-end" aria-live="polite">
        <div className="text-right">
          <p className="text-lg font-extrabold leading-none text-text-primary">
            {bpm}
          </p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-text-muted">
            {RITMO_LABEL_TEMPO}
          </p>
        </div>
      </div>
      <div className="mt-2 w-full">
        <BeatPatternEditor
          pattern={beatPattern}
          patternLength={patternLength}
          variant="practice"
          currentBeat={isPlaying ? currentBeat : null}
        />
      </div>
    </div>
  );
}

function useTimelineNow(active: boolean): number {
  const [now, setNow] = useState(() => performance.now());

  useEffect(() => {
    if (!active) {
      return;
    }

    let animationFrame = 0;

    const tick = () => {
      setNow(performance.now());
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [active]);

  return now;
}

function ScrollingRhythmTimeline({
  beatMarkers,
  hits,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  isPlaying,
}: {
  beatMarkers: MetronomeBeatMarker[];
  hits: MetronomeHit[];
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  isPlaying: boolean;
}) {
  const pattern = getActivePatternSlice(beatPattern, patternLength);
  const now = useTimelineNow(isPlaying || hits.length > 0);
  const windowMs = getTimelineWindowMs(bpm, patternLength, beatDurations);
  const msPerCycle = getCycleMs(bpm, beatDurations, patternLength);
  const lookAheadMs = msPerCycle;
  const totalSpan = windowMs + lookAheadMs;
  const nowLinePercent = (windowMs / totalSpan) * 100;

  const timeToLeftPercent = (timeMs: number) => {
    const offset = timeMs - (now - windowMs);
    return Math.max(0, Math.min(100, (offset / totalSpan) * 100));
  };

  const pastBeats = beatMarkers.filter(
    (beat) =>
      beat.timestamp >= now - windowMs && beat.timestamp <= now + lookAheadMs,
  );
  const upcomingBeats = isPlaying
    ? getUpcomingBeatMarkers(
        beatMarkers,
        now,
        bpm,
        patternLength,
        beatDurations,
        lookAheadMs,
      )
    : [];
  const visibleBeats = [...pastBeats, ...upcomingBeats];
  const visibleHits = hits.filter((hit) => hit.timestamp >= now - windowMs);

  const measureLines: number[] = [];
  const anchor = beatMarkers[0]?.timestamp ?? now;
  const firstLine =
    anchor + Math.floor((now - windowMs - anchor) / msPerCycle) * msPerCycle;

  for (let time = firstLine; time <= now + lookAheadMs; time += msPerCycle) {
    measureLines.push(time);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-text-muted">
        El tiempo corre hacia la izquierda. La línea vertical marca{" "}
        <span className="font-semibold text-text-secondary">ahora</span>. Compará
        las marcas del metrónomo con tus golpes. Los primeros golpes calibran la
        latencia; después la comparación se ajusta sola.
      </p>

      <div className="relative overflow-hidden rounded-[12px] border border-border bg-bg-card">
        <div
          className="pointer-events-none absolute inset-y-0 z-20 w-px bg-text-primary"
          style={{ left: `${nowLinePercent}%` }}
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute top-1 z-20 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wide text-text-secondary"
          style={{ left: `${nowLinePercent}%` }}
        >
          ahora
        </span>

        {measureLines.map((time) => (
          <div
            key={time}
            className="pointer-events-none absolute inset-y-0 z-0 w-px bg-border/70"
            style={{ left: `${timeToLeftPercent(time)}%` }}
            aria-hidden="true"
          />
        ))}

        <div className="relative z-[1] grid grid-cols-[64px_1fr] gap-x-2 pl-3 pr-2 pb-3 pt-6">
          <span className="self-center pr-1 text-right text-[10px] font-semibold leading-tight text-text-muted">
            Metrónomo
          </span>
          <div className="relative h-9 border-b border-border/60">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10"
              style={{
                background:
                  "linear-gradient(to right, var(--bg-card), transparent)",
              }}
              aria-hidden="true"
            />
            {visibleBeats.map((beat, index) => {
              const level = pattern[beat.beatIndex] ?? "silencio";
              const barHeight = getBeatLevelBarHeightPercent(level);
              const isFuture = beat.timestamp > now;

              if (level === "silencio") {
                return null;
              }

              return (
                <span
                  key={`beat-${beat.timestamp}-${index}`}
                  className="absolute bottom-0 w-1 -translate-x-1/2 rounded-full"
                  style={{
                    left: `${timeToLeftPercent(beat.timestamp)}%`,
                    height: `${barHeight}%`,
                    backgroundColor: isFuture
                      ? "color-mix(in srgb, var(--text-primary) 28%, transparent)"
                      : "color-mix(in srgb, var(--text-primary) 72%, transparent)",
                    opacity: isFuture ? 0.55 : 1,
                  }}
                  title={`${getBeatLevelLabel(level)} · tiempo ${beat.beatIndex + 1}`}
                />
              );
            })}
          </div>

          <span className="self-center pr-1 text-right text-[10px] font-semibold text-text-muted">
            Vos
          </span>
          <div className="relative h-9">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10"
              style={{
                background:
                  "linear-gradient(to right, var(--bg-card), transparent)",
              }}
              aria-hidden="true"
            />
            {visibleHits.map((hit, index) => {
              const accuracy = getHitAccuracy(hit.deltaMsClamped);

              return (
                <span
                  key={`hit-${hit.timestamp}-${index}`}
                  className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/20"
                  style={{
                    left: `${timeToLeftPercent(hit.timestamp)}%`,
                    backgroundColor: getHitAccuracyColor(accuracy),
                  }}
                  title={getHitFeedbackLabel(hit.deltaMsClamped)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-[10px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-1 rounded-full bg-text-secondary" />
          Click del metrónomo
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "var(--tuner-in-tune)" }}
            />
            En tiempo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "var(--tuner-cerca)" }}
            />
            Cerca
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: "var(--tuner-flat-sharp)" }}
            />
            Lejos
          </span>
        </div>
      </div>
    </div>
  );
}

function HitTimingFeedback({
  hits,
  beatMarkers,
  isPlaying,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
}: {
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  isPlaying: boolean;
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
}) {
  const lastHit = hits.length > 0 ? hits[hits.length - 1] : null;
  const streak = useMemo(() => computeOnTimeStreak(hits), [hits]);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (lastHit) {
      setFlashKey(lastHit.timestamp);
    }
  }, [lastHit]);

  const lastAccuracy = lastHit
    ? getHitAccuracy(lastHit.deltaMsClamped)
    : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        key={flashKey}
        className="min-h-[64px] text-center animate-[metronomo-hit-flash_450ms_ease-out]"
      >
        {lastHit ? (
          <>
            <p
              className="text-xl font-extrabold leading-tight"
              style={{ color: getHitAccuracyColor(lastAccuracy!) }}
              aria-live="assertive"
            >
              {getHitFeedbackLabel(lastHit.deltaMsClamped)}
            </p>
            {streak >= 2 ? (
              <p
                className="mt-1.5 text-sm font-bold"
                style={{ color: "var(--tuner-in-tune)" }}
              >
                Racha: {streak} en tiempo
              </p>
            ) : null}
          </>
        ) : (
          <p className="pt-3 text-sm italic text-text-muted">
            {isPlaying
              ? "Golpeá al ritmo: tu punto debería caer sobre la marca del metrónomo"
              : "Iniciá el metrónomo para ver la línea de tiempo"}
          </p>
        )}
      </div>

      <ScrollingRhythmTimeline
        beatMarkers={beatMarkers}
        hits={hits}
        bpm={bpm}
        beatPattern={beatPattern}
        patternLength={patternLength}
        beatDurations={beatDurations}
        isPlaying={isPlaying}
      />
    </div>
  );
}

function MicConnectingPanel() {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-2 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-6 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Conectando micrófono...</p>
    </div>
  );
}

function MicPermissionPanel({
  micError,
  micStarting,
  onRequestMic,
}: {
  micError: string | null;
  micStarting: boolean;
  onRequestMic: () => void;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-2 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-6 text-accent" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary">
          Acceso al micrófono
        </p>
        <p className="text-xs text-text-muted">
          Para detectar tus golpes, necesitamos escuchar el instrumento. Tocá el
          botón y aceptá el permiso cuando el navegador te lo pida.
        </p>
      </div>
      {micError ? (
        <p className="text-sm text-accent" role="alert">
          {micError}
        </p>
      ) : null}
      <TapButton
        type="button"
        disabled={micStarting}
        onClick={onRequestMic}
        className="w-full rounded-[12px] bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {micStarting
          ? "Solicitando permiso..."
          : micError
            ? "Reintentar"
            : "Permitir micrófono"}
      </TapButton>
    </div>
  );
}

export default function MetronomoModal({
  open,
  onClose,
  bpm,
  isPlaying,
  beatPattern,
  patternLength,
  beatDurations,
  currentBeat,
  micActivo,
  micPermissionGranted,
  micError,
  micReady,
  micStarting,
  hits,
  beatMarkers,
  tapTempoTapCount,
  onStart,
  onStop,
  onSetBpm,
  onSetPatternLength,
  onSetBeatDurationAtSlot,
  onSetBeatLevelAtSlot,
  onTapTempo,
  onToggleMic,
  onRequestMic,
}: MetronomoModalProps) {
  const [configHelpOpen, setConfigHelpOpen] = useState(false);

  if (!open) {
    return null;
  }

  const configSummary = formatRitmoConfigSummary(
    patternLength,
    getBeatDurationPatternSummary(beatDurations, patternLength),
    bpm,
  );

  return createPortal(
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar metrónomo"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="metronomo-titulo"
        className="relative z-10 flex h-[min(92vh,780px)] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <ToolModalHeader
          titleId="metronomo-titulo"
          title="Metrónomo"
          closeAriaLabel="Cerrar metrónomo"
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <RitmoConfigSection
              compasLayout="flat"
              collapsedSummary={configSummary}
              autoCollapseWhen={isPlaying}
              configHeaderAction={
                <MetronomoConfigHelpButton
                  onClick={() => setConfigHelpOpen(true)}
                />
              }
              beatPattern={beatPattern}
              patternLength={patternLength}
              beatDurations={beatDurations}
              bpm={bpm}
              isPlaying={isPlaying}
              tapTempoTapCount={tapTempoTapCount}
              patternLengthInputId="metronomo-pattern-length"
              onSetPatternLength={onSetPatternLength}
              onSetBeatDurationAtSlot={onSetBeatDurationAtSlot}
              onSetBeatLevelAtSlot={onSetBeatLevelAtSlot}
              onSetBpm={onSetBpm}
              onTapTempo={onTapTempo}
            />

            <ToolPracticeSection>
            {isPlaying ? (
              <div className="flex items-center justify-end">
                <PlayingEqIndicator
                  color="var(--tool-practice)"
                  ariaLabel="Metrónomo sonando"
                />
              </div>
            ) : null}

            <PracticePlaybackSummary
              bpm={bpm}
              beatPattern={beatPattern}
              patternLength={patternLength}
              currentBeat={currentBeat}
              isPlaying={isPlaying}
            />

            <div className="flex justify-center">
              <PlayCircleButton
                isPlaying={isPlaying}
                onClick={isPlaying ? onStop : onStart}
                playAriaLabel="Iniciar metrónomo"
                stopAriaLabel="Detener metrónomo"
              />
            </div>

            <div className="rounded-[10px] border border-border bg-bg-card px-3 py-2.5">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary">
                  Detectar mis golpes
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={micActivo}
                  onClick={onToggleMic}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    micActivo
                      ? "border border-text-secondary bg-bg-dark"
                      : "border border-border bg-bg-darker"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-6 rounded-full bg-white transition-transform ${
                      micActivo ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </label>

              {micActivo ? (
                <div className="mt-4">
                  {!micReady ? (
                    !micPermissionGranted || micError ? (
                      <MicPermissionPanel
                        micError={micError}
                        micStarting={micStarting}
                        onRequestMic={onRequestMic}
                      />
                    ) : (
                      <MicConnectingPanel />
                    )
                  ) : (
                    <HitTimingFeedback
                      hits={hits}
                      beatMarkers={beatMarkers}
                      isPlaying={isPlaying}
                      bpm={bpm}
                      beatPattern={beatPattern}
                      patternLength={patternLength}
                      beatDurations={beatDurations}
                    />
                  )}
                </div>
              ) : null}
            </div>
          </ToolPracticeSection>
          </div>
        </div>
      </div>
    </div>
    <MetronomoConfigHelpModal
      open={configHelpOpen}
      onClose={() => setConfigHelpOpen(false)}
    />
    </>,
    document.body,
  );
}
