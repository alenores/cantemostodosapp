"use client";

import {
  ToolConfigSection,
  ToolPracticeSection,
} from "@/components/ui/ToolModalSections";
import PlayingEqIndicator from "@/components/ui/PlayingEqIndicator";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  BEATS_PER_MEASURE_MAX,
  BEATS_PER_MEASURE_MIN,
  BPM_MAX,
  BPM_MIN,
  computeOnTimeStreak,
  getActivePatternSlice,
  getBeatLevelBarAppearance,
  getBeatLevelBarHeightPercent,
  getBeatLevelConfigColor,
  getBeatLevelLabel,
  getHitAccuracy,
  getHitAccuracyColor,
  getHitFeedbackLabel,
  getTimelineWindowMs,
  type MetronomeBeatLevel,
  type MetronomeBeatMarker,
  type MetronomeBeatPattern,
  type MetronomeHit,
} from "@/lib/metronomo";
import { ChevronDown, Mic, Play, Square, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type BpmInputMode = "botones" | "tap";

type MetronomoModalProps = {
  open: boolean;
  onClose: () => void;
  bpm: number;
  isPlaying: boolean;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
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
  onCycleBeatPatternSlot: (slotIndex: number) => void;
  onTapTempo: () => void;
  onToggleMic: () => void;
  onRequestMic: () => void;
};

function CollapsibleConfigBlock({
  title,
  collapsedSummary,
  isPlaying,
  modalOpen,
  defaultExpanded = true,
  children,
}: {
  title: string;
  collapsedSummary: string;
  isPlaying: boolean;
  modalOpen: boolean;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (modalOpen) {
      setExpanded(defaultExpanded);
    }
  }, [defaultExpanded, modalOpen]);

  useEffect(() => {
    if (isPlaying) {
      setExpanded(false);
    }
  }, [isPlaying]);

  return (
    <div className="rounded-[10px] border border-border bg-bg-dark/60 px-3 py-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-voz-config">
            {title}
          </p>
          {!expanded ? (
            <p className="mt-0.5 truncate text-[11px] text-text-secondary">
              {collapsedSummary}
            </p>
          ) : null}
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-text-muted transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {expanded ? <div className="mt-3 space-y-3">{children}</div> : null}
    </div>
  );
}

function BpmSetupPanel({
  bpm,
  isPlaying,
  tapTempoTapCount,
  onSetBpm,
  onTapTempo,
}: {
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  const [mode, setMode] = useState<BpmInputMode>("botones");

  useEffect(() => {
    if (isPlaying) {
      setMode("botones");
    }
  }, [isPlaying]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full border border-border bg-bg-darker p-0.5">
        {(
          [
            { id: "botones" as const, label: "Botones" },
            { id: "tap" as const, label: "Marcar a mano" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={isPlaying}
            onClick={() => setMode(tab.id)}
            className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-bold disabled:opacity-50 ${
              mode === tab.id
                ? "bg-voz-config text-white"
                : "text-text-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-3 min-h-[5.5rem]">
        {mode === "botones" ? (
          <div className="flex items-center justify-center gap-3">
            <TapButton
              type="button"
              aria-label="Reducir BPM"
              disabled={isPlaying || bpm <= BPM_MIN}
              onClick={() => onSetBpm(bpm - 1)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
            >
              −
            </TapButton>
            <p className="w-16 text-center text-sm text-text-muted">Ajustá</p>
            <TapButton
              type="button"
              aria-label="Aumentar BPM"
              disabled={isPlaying || bpm >= BPM_MAX}
              onClick={() => onSetBpm(bpm + 1)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
            >
              +
            </TapButton>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-text-muted">
              {isPlaying
                ? "Detené el metrónomo para marcar el tempo con TAP."
                : "Tocá 2–4 veces al ritmo. No suena nada mientras tocás."}
            </p>
            <TapButton
              type="button"
              disabled={isPlaying}
              onClick={onTapTempo}
              className={`w-full rounded-[12px] border px-4 py-3 text-sm font-bold disabled:opacity-40 ${
                tapTempoTapCount > 0 && !isPlaying
                  ? "border-voz-config bg-voz-config/15 text-voz-config"
                  : "border-border bg-bg-cola-sheet text-text-primary"
              }`}
            >
              TAP
            </TapButton>
            {tapTempoTapCount > 0 && !isPlaying ? (
              <p
                className="text-center text-xs text-voz-config"
                aria-live="polite"
              >
                {tapTempoTapCount === 1
                  ? "1 golpe · tocá una vez más"
                  : `${tapTempoTapCount} golpes registrados`}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div
        className="mt-3 rounded-[10px] border border-border bg-bg-card px-3 py-3 text-center"
        aria-live="polite"
      >
        <p className="text-5xl font-extrabold leading-none text-text-primary">
          {bpm}
        </p>
        <p className="mt-1 text-sm text-text-muted">BPM que va a sonar</p>
      </div>
    </div>
  );
}

function PatternLengthControl({
  patternLength,
  disabled,
  onSetPatternLength,
}: {
  patternLength: number;
  disabled?: boolean;
  onSetPatternLength: (value: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-text-primary">
        Cantidad de tiempos
      </p>
      <p className="mt-0.5 text-[11px] text-text-muted">
        Cuántos golpes forman un ciclo ({BEATS_PER_MEASURE_MIN}–
        {BEATS_PER_MEASURE_MAX})
      </p>
      <div className="mt-2 flex items-center justify-center gap-3">
        <TapButton
          type="button"
          aria-label="Reducir cantidad de tiempos"
          disabled={disabled || patternLength <= BEATS_PER_MEASURE_MIN}
          onClick={() => onSetPatternLength(patternLength - 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-card text-lg font-bold text-text-primary disabled:opacity-40"
        >
          −
        </TapButton>
        <label className="sr-only" htmlFor="metronomo-pattern-length">
          Cantidad de tiempos en el ciclo
        </label>
        <input
          id="metronomo-pattern-length"
          type="number"
          inputMode="numeric"
          min={BEATS_PER_MEASURE_MIN}
          max={BEATS_PER_MEASURE_MAX}
          disabled={disabled}
          value={patternLength}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (!Number.isNaN(parsed)) {
              onSetPatternLength(parsed);
            }
          }}
          onBlur={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            onSetPatternLength(
              Number.isNaN(parsed) ? BEATS_PER_MEASURE_MIN : parsed,
            );
          }}
          className="w-14 rounded-[10px] border border-border bg-bg-card py-2 text-center text-xl font-extrabold text-text-primary disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <TapButton
          type="button"
          aria-label="Aumentar cantidad de tiempos"
          disabled={disabled || patternLength >= BEATS_PER_MEASURE_MAX}
          onClick={() => onSetPatternLength(patternLength + 1)}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-bg-card text-lg font-bold text-text-primary disabled:opacity-40"
        >
          +
        </TapButton>
      </div>
    </div>
  );
}

function BeatPatternEditor({
  pattern,
  patternLength,
  disabled = false,
  variant = "config",
  currentBeat = null,
  onCycleSlot,
}: {
  pattern: MetronomeBeatPattern;
  patternLength: number;
  disabled?: boolean;
  variant?: "config" | "practice";
  currentBeat?: number | null;
  onCycleSlot?: (slotIndex: number) => void;
}) {
  const activePattern = getActivePatternSlice(pattern, patternLength);
  const interactive = variant === "config";
  const beatLevels: MetronomeBeatLevel[] = [
    "silencio",
    "suave",
    "medio",
    "fuerte",
  ];

  const bars = (
    <div className={`flex gap-1 ${variant === "config" ? "mt-3" : ""}`}>
      {activePattern.map((level, index) => {
        const heightPercent = Math.max(
          getBeatLevelBarHeightPercent(level),
          level === "silencio" ? 0 : 8,
        );
        const isActive = currentBeat === index;
        const barAppearance = getBeatLevelBarAppearance(level);

        if (!interactive) {
          return (
            <span
              key={`beat-slot-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
              title={`Tiempo ${index + 1}: ${getBeatLevelLabel(level)}`}
            >
              <span
                className={`w-full rounded-full transition-colors ${
                  isActive
                    ? "ring-2 ring-text-primary ring-offset-1 ring-offset-bg-card"
                    : ""
                }`}
                style={{
                  height: `${Math.max(heightPercent * 0.28, level === "silencio" ? 4 : 10)}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
            </span>
          );
        }

        return (
          <button
            key={`beat-slot-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onCycleSlot?.(index)}
            aria-label={`Tiempo ${index + 1}: ${getBeatLevelLabel(level)}`}
            aria-pressed={level !== "silencio"}
            className="flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-end gap-1 disabled:opacity-50"
          >
            <span
              className="w-full rounded-full"
              style={{
                height: `${Math.max(heightPercent * 0.32, level === "silencio" ? 6 : 12)}px`,
                backgroundColor: barAppearance.backgroundColor,
                border: barAppearance.border,
              }}
            />
            <span className="text-[9px] font-bold text-text-muted">
              {index + 1}
            </span>
          </button>
        );
      })}
    </div>
  );

  const legend = (
    <div className="mt-3 flex items-start gap-2">
      <Volume2
        className="mt-0.5 size-3.5 shrink-0 text-text-muted"
        aria-hidden="true"
      />
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-text-muted">
        {beatLevels.map((level) => {
          const barAppearance = getBeatLevelBarAppearance(level);

          return (
            <span key={level} className="inline-flex items-center gap-1">
              <span
                className="inline-block w-3 rounded-full"
                style={{
                  height: `${Math.max(getBeatLevelBarHeightPercent(level) * 0.12, 4)}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
              {getBeatLevelLabel(level)}
            </span>
          );
        })}
      </div>
    </div>
  );

  if (variant === "config") {
    return (
      <div className="border-t border-border pt-3">
        <div className="rounded-lg border border-border bg-bg-card px-3 py-3">
          <p className="text-sm font-semibold text-text-primary">
            Volumen de cada tiempo
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-text-muted">
            Tocá cada barra: silencio → suave → medio → fuerte
          </p>
          {bars}
          {legend}
        </div>
      </div>
    );
  }

  return <div>{bars}</div>;
}

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
    <div className="flex items-end gap-3 rounded-[10px] border border-border bg-bg-card px-3 py-3">
      <div className="shrink-0 text-center" aria-live="polite">
        <p className="text-3xl font-extrabold leading-none text-text-primary">
          {bpm}
        </p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          BPM
        </p>
      </div>
      <div className="min-w-0 flex-1">
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

function getUpcomingBeats(
  beatMarkers: MetronomeBeatMarker[],
  now: number,
  bpm: number,
  patternLength: number,
  lookAheadMs: number,
): MetronomeBeatMarker[] {
  if (beatMarkers.length === 0) {
    return [];
  }

  const msPerBeat = 60000 / bpm;
  const lastBeat = beatMarkers[beatMarkers.length - 1]!;
  const upcoming: MetronomeBeatMarker[] = [];
  let nextTime = lastBeat.timestamp + msPerBeat;
  let nextIndex = (lastBeat.beatIndex + 1) % patternLength;

  while (nextTime <= now + lookAheadMs) {
    if (nextTime > now) {
      upcoming.push({ timestamp: nextTime, beatIndex: nextIndex });
    }

    nextTime += msPerBeat;
    nextIndex = (nextIndex + 1) % patternLength;
  }

  return upcoming;
}

function ScrollingRhythmTimeline({
  beatMarkers,
  hits,
  bpm,
  beatPattern,
  patternLength,
  isPlaying,
}: {
  beatMarkers: MetronomeBeatMarker[];
  hits: MetronomeHit[];
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  isPlaying: boolean;
}) {
  const pattern = getActivePatternSlice(beatPattern, patternLength);
  const now = useTimelineNow(isPlaying || hits.length > 0);
  const windowMs = getTimelineWindowMs(bpm, patternLength);
  const msPerBeat = 60000 / bpm;
  const msPerCycle = msPerBeat * pattern.length;
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
    ? getUpcomingBeats(beatMarkers, now, bpm, patternLength, lookAheadMs)
    : [];
  const visibleBeats = [...pastBeats, ...upcomingBeats];
  const visibleHits = hits.filter((hit) => hit.timestamp >= now - windowMs);

  const measureLines: number[] = [];
  const firstLine = Math.floor((now - windowMs) / msPerCycle) * msPerCycle;

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
}: {
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  isPlaying: boolean;
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
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
  onCycleBeatPatternSlot,
  onTapTempo,
  onToggleMic,
  onRequestMic,
}: MetronomoModalProps) {
  if (!open) {
    return null;
  }

  return (
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
        className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-xl"
      >
        <header className="shrink-0 border-b border-border bg-bg-dark px-4 py-3">
          <div className="flex items-center gap-3">
            <h2
              id="metronomo-titulo"
              className="min-w-0 flex-1 text-lg font-extrabold text-accent"
            >
              Metrónomo
            </h2>
            <button
              type="button"
              aria-label="Cerrar metrónomo"
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
          <ToolConfigSection>
            <CollapsibleConfigBlock
              title="Compás"
              collapsedSummary={`${patternLength} tiempos en el ciclo`}
              isPlaying={isPlaying}
              modalOpen={open}
              defaultExpanded
            >
              <PatternLengthControl
                patternLength={patternLength}
                disabled={isPlaying}
                onSetPatternLength={onSetPatternLength}
              />
              <BeatPatternEditor
                pattern={beatPattern}
                patternLength={patternLength}
                disabled={isPlaying}
                onCycleSlot={onCycleBeatPatternSlot}
              />
            </CollapsibleConfigBlock>

            <CollapsibleConfigBlock
              title="Tempo"
              collapsedSummary={`${bpm} BPM`}
              isPlaying={isPlaying}
              modalOpen={open}
              defaultExpanded={false}
            >
              <BpmSetupPanel
                bpm={bpm}
                isPlaying={isPlaying}
                tapTempoTapCount={tapTempoTapCount}
                onSetBpm={onSetBpm}
                onTapTempo={onTapTempo}
              />
            </CollapsibleConfigBlock>
          </ToolConfigSection>

          <ToolPracticeSection>
            {isPlaying ? (
              <div className="flex items-center justify-end">
                <PlayingEqIndicator
                  color="var(--voz-config)"
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
              <TapButton
                type="button"
                aria-label={isPlaying ? "Detener metrónomo" : "Iniciar metrónomo"}
                onClick={isPlaying ? onStop : onStart}
                className={`flex size-16 items-center justify-center rounded-full ${
                  isPlaying
                    ? "border border-text-secondary bg-bg-card text-text-primary"
                    : "border border-border bg-bg-card text-text-primary"
                }`}
              >
                {isPlaying ? (
                  <Square className="size-7 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="size-7 fill-current" aria-hidden="true" />
                )}
              </TapButton>
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
                    />
                  )}
                </div>
              ) : null}
            </div>
          </ToolPracticeSection>
        </div>
      </div>
    </div>
  );
}
