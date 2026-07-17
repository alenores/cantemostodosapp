"use client";

import { BeatPatternEditor } from "@/components/ui/ToolRitmoConfig";
import { TapButton } from "@/components/ui/TapFeedback";
import { ToolSwitch } from "@/components/ui/ToolSwitch";
import {
  computeOnTimeStreak,
  getActivePatternSlice,
  getBeatLevelBarHeightPercent,
  getBeatLevelLabel,
  getCycleMs,
  getHitAccuracy,
  getHitAccuracyColor,
  getHitFeedbackLabel,
  getTimelineWindowMs,
  getUpcomingBeatMarkers,
  type MetronomeBeatDurationPattern,
  type MetronomeBeatMarker,
  type MetronomeBeatPattern,
  type MetronomeHit,
} from "@/lib/metronomo";
import { RITMO_LABEL_TEMPO } from "@/lib/ritmo-terminologia";
import { Mic } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function MetronomoPracticePlaybackSummary({
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  currentBeat,
  isPlaying,
  compact = false,
}: {
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  currentBeat: number | null;
  isPlaying: boolean;
  compact?: boolean;
}) {
  const beatDurationSec = 60 / bpm;
  const pendulumOnLeft =
    isPlaying && currentBeat !== null && currentBeat % 2 === 0;

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-border/80 bg-bg-card px-4 py-3"
          : "rounded-[10px] border border-border bg-bg-card px-3 py-3"
      }
    >
      {/* Péndulo: se mueve al ritmo real del metrónomo (un golpe = un lado) */}
      <div className="relative mb-3 h-1 w-full overflow-hidden rounded-full bg-bg-darker/60 border border-border/10">
        <div
          className={`absolute top-0 h-full w-16 rounded-full bg-gradient-to-r from-transparent via-[var(--accent-metronomo,#d9aa2b)] to-transparent shadow-[0_0_8px_var(--accent-metronomo,#d9aa2b)] ${
            isPlaying ? "opacity-100" : "opacity-40"
          }`}
          style={{
            left: isPlaying && currentBeat !== null
              ? pendulumOnLeft
                ? "0%"
                : "100%"
              : "50%",
            transform:
              isPlaying && currentBeat !== null
                ? pendulumOnLeft
                  ? "translateX(0%)"
                  : "translateX(-100%)"
                : "translateX(-50%)",
            width: isPlaying ? "4rem" : "1rem",
            transition: isPlaying
              ? `left ${beatDurationSec}s ease-in-out, transform ${beatDurationSec}s ease-in-out, width 300ms ease`
              : "left 300ms ease, transform 300ms ease, width 300ms ease, opacity 300ms ease",
          }}
        />
      </div>

      <div className="flex justify-between items-baseline" aria-live="polite">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
          {isPlaying ? "RITMO ACTIVO" : "METRÓNOMO DETENIDO"}
        </span>
        <div className="text-right">
          <p
            className={
              compact
                ? "text-2xl font-extrabold leading-none text-text-primary"
                : "text-lg font-extrabold leading-none text-text-primary"
            }
          >
            {bpm}
          </p>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-wide text-text-muted">
            {RITMO_LABEL_TEMPO}
          </p>
        </div>
      </div>
      <div className={compact ? "mt-3 w-full" : "mt-2 w-full"}>
        <BeatPatternEditor
          pattern={beatPattern}
          patternLength={patternLength}
          beatDurations={beatDurations}
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

export function MetronomoScrollingRhythmTimeline({
  beatMarkers,
  hits,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  isPlaying,
  layout = "mobile",
}: {
  beatMarkers: MetronomeBeatMarker[];
  hits: MetronomeHit[];
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  isPlaying: boolean;
  layout?: "mobile" | "desktop";
}) {
  const isDesktop = layout === "desktop";
  const pattern = getActivePatternSlice(beatPattern, patternLength);
  const now = useTimelineNow(isPlaying || hits.length > 0);
  const windowMs = getTimelineWindowMs(bpm, patternLength, beatDurations);
  const msPerCycle = getCycleMs(bpm, beatDurations, patternLength);
  const lookAheadMs = msPerCycle;
  const totalSpan = windowMs + lookAheadMs;
  const nowLinePercent = (windowMs / totalSpan) * 100;
  const rowHeightClass = isDesktop ? "h-12" : "h-9";
  const labelColWidth = isDesktop ? "72px" : "64px";

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
      <p className={isDesktop ? "text-xs text-text-muted" : "text-[11px] text-text-muted"}>
        El tiempo corre hacia la izquierda. La línea vertical marca{" "}
        <span className="font-semibold text-text-secondary">ahora</span>. Compará
        las marcas del metrónomo con tus golpes. Los primeros golpes calibran la
        latencia; después la comparación se ajusta sola.
      </p>

      <div
        className={
          isDesktop
            ? "relative overflow-hidden rounded-xl border border-border/80 bg-bg-card"
            : "relative overflow-hidden rounded-[12px] border border-border bg-bg-card"
        }
      >
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

        <div
          className="relative z-[1] grid gap-x-2 pl-3 pr-2 pb-3 pt-6"
          style={{ gridTemplateColumns: `${labelColWidth} 1fr` }}
        >
          <span className="self-center pr-1 text-right text-[10px] font-semibold leading-tight text-text-muted">
            Metrónomo
          </span>
          <div className={`relative border-b border-border/60 ${rowHeightClass}`}>
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
                  className={`absolute bottom-0 -translate-x-1/2 rounded-full ${
                    isDesktop ? "w-1.5" : "w-1"
                  }`}
                  style={{
                    left: `${timeToLeftPercent(beat.timestamp)}%`,
                    height: `${barHeight}%`,
                    backgroundColor: isFuture
                      ? "color-mix(in srgb, var(--text-primary) 28%, transparent)"
                      : "color-mix(in srgb, var(--text-primary) 72%, transparent)",
                    opacity: isFuture ? 0.55 : 1,
                  }}
                />
              );
            })}
          </div>

          <span className="self-center pr-1 text-right text-[10px] font-semibold text-text-muted">
            Vos
          </span>
          <div className={`relative ${rowHeightClass}`}>
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
                  className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/20 ${
                    isDesktop ? "size-3.5" : "size-3"
                  }`}
                  style={{
                    left: `${timeToLeftPercent(hit.timestamp)}%`,
                    backgroundColor: getHitAccuracyColor(accuracy),
                  }}
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

export function MetronomoHitTimingFeedback({
  hits,
  beatMarkers,
  isPlaying,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  layout = "mobile",
}: {
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  isPlaying: boolean;
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  layout?: "mobile" | "desktop";
}) {
  const isDesktop = layout === "desktop";
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
        className={
          isDesktop
            ? "min-h-[72px] text-center animate-[metronomo-hit-flash_450ms_ease-out] flex flex-col items-center justify-center relative overflow-visible"
            : "min-h-[64px] text-center animate-[metronomo-hit-flash_450ms_ease-out] flex flex-col items-center justify-center relative overflow-visible"
        }
      >
        {lastHit ? (
          <div className="relative flex flex-col items-center justify-center overflow-visible">
            {/* Onda expansiva de reacción */}
            <div 
              key={`ripple-${flashKey}`}
              className="absolute pointer-events-none rounded-full border opacity-0 animate-[mic-hit-ring_650ms_ease-out_forwards] size-14"
              style={{
                borderColor: getHitAccuracyColor(lastAccuracy!),
                boxShadow: `0 0 12px ${getHitAccuracyColor(lastAccuracy!)}`,
              }}
            />
            <p
              className={
                isDesktop
                  ? "text-2xl font-extrabold leading-tight relative z-10"
                  : "text-xl font-extrabold leading-tight relative z-10"
              }
              style={{ color: getHitAccuracyColor(lastAccuracy!) }}
              aria-live="assertive"
            >
              {getHitFeedbackLabel(lastHit.deltaMsClamped)}
            </p>
            {streak >= 2 ? (
              <p
                className="mt-1 text-sm font-bold relative z-10"
                style={{ color: "var(--tuner-in-tune)" }}
              >
                Racha: {streak} en tiempo
              </p>
            ) : null}
          </div>
        ) : (
          <p
            className={
              isDesktop
                ? "pt-4 text-sm italic text-text-muted"
                : "pt-3 text-sm italic text-text-muted"
            }
          >
            {isPlaying
              ? "Golpeá al ritmo: tu punto debería caer sobre la marca del metrónomo"
              : "Iniciá el metrónomo para ver la línea de tiempo"}
          </p>
        )}
      </div>

      <MetronomoScrollingRhythmTimeline
        beatMarkers={beatMarkers}
        hits={hits}
        bpm={bpm}
        beatPattern={beatPattern}
        patternLength={patternLength}
        beatDurations={beatDurations}
        isPlaying={isPlaying}
        layout={layout}
      />
    </div>
  );
}

export function MetronomoMicConnectingPanel() {
  return (
    <div className="flex w-full flex-col items-center gap-3 py-2 text-center">
      <div className="flex size-12 items-center justify-center rounded-full border border-border bg-bg-card">
        <Mic className="size-6 text-accent" aria-hidden="true" />
      </div>
      <p className="text-sm text-text-muted">Conectando micrófono...</p>
    </div>
  );
}

export function MetronomoMicPermissionPanel({
  micError,
  micStarting,
  onRequestMic,
  fullWidthButton = true,
}: {
  micError: string | null;
  micStarting: boolean;
  onRequestMic: () => void;
  fullWidthButton?: boolean;
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
        className={`rounded-[12px] bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
          fullWidthButton ? "w-full" : "min-w-[12rem]"
        }`}
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

export function MetronomoMicDetectionPanel({
  micActivo,
  micReady,
  micPermissionGranted,
  micError,
  micStarting,
  hits,
  beatMarkers,
  isPlaying,
  bpm,
  beatPattern,
  patternLength,
  beatDurations,
  layout = "mobile",
  onToggleMic,
  onRequestMic,
}: {
  micActivo: boolean;
  micReady: boolean;
  micPermissionGranted: boolean;
  micError: string | null;
  micStarting: boolean;
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  isPlaying: boolean;
  bpm: number;
  beatPattern: MetronomeBeatPattern;
  patternLength: number;
  beatDurations: MetronomeBeatDurationPattern;
  layout?: "mobile" | "desktop";
  onToggleMic: () => void;
  onRequestMic: () => void;
}) {
  const isDesktop = layout === "desktop";

  return (
    <div
      className={
        isDesktop
          ? "rounded-xl border border-border/80 bg-bg-card px-4 py-3"
          : "rounded-[10px] border border-border bg-bg-card px-3 py-2.5"
      }
    >
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text-primary">
          Detectar mis golpes
        </span>
        <ToolSwitch
          checked={micActivo}
          onChange={onToggleMic}
          accentVar="--accent-metronomo"
          size="md"
          aria-label="Detectar mis golpes"
        />
      </label>

      {micActivo ? (
        <div className="mt-4">
          {!micReady ? (
            !micPermissionGranted || micError ? (
              <MetronomoMicPermissionPanel
                micError={micError}
                micStarting={micStarting}
                onRequestMic={onRequestMic}
                fullWidthButton={!isDesktop}
              />
            ) : (
              <MetronomoMicConnectingPanel />
            )
          ) : (
            <MetronomoHitTimingFeedback
              hits={hits}
              beatMarkers={beatMarkers}
              isPlaying={isPlaying}
              bpm={bpm}
              beatPattern={beatPattern}
              patternLength={patternLength}
              beatDurations={beatDurations}
              layout={layout}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
