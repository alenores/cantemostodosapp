"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  BPM_MAX,
  BPM_MIN,
  computeOnTimeStreak,
  getHitAccuracy,
  getHitAccuracyColor,
  getHitFeedbackLabel,
  getTimelineWindowMs,
  type MetronomeBeatMarker,
  type MetronomeHit,
} from "@/lib/metronomo";
import { Mic, Play, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MetronomoModalProps = {
  open: boolean;
  onClose: () => void;
  bpm: number;
  isPlaying: boolean;
  beatsPerMeasure: 2 | 3 | 4;
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
  onSetBeatsPerMeasure: (value: 2 | 3 | 4) => void;
  onTapTempo: () => void;
  onToggleMic: () => void;
  onRequestMic: () => void;
};

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
  beatsPerMeasure: number,
  lookAheadMs: number,
): MetronomeBeatMarker[] {
  if (beatMarkers.length === 0) {
    return [];
  }

  const msPerBeat = 60000 / bpm;
  const lastBeat = beatMarkers[beatMarkers.length - 1];
  const upcoming: MetronomeBeatMarker[] = [];
  let nextTime = lastBeat.timestamp + msPerBeat;
  let nextIndex = (lastBeat.beatIndex + 1) % beatsPerMeasure;

  while (nextTime <= now + lookAheadMs) {
    if (nextTime > now) {
      upcoming.push({ timestamp: nextTime, beatIndex: nextIndex });
    }

    nextTime += msPerBeat;
    nextIndex = (nextIndex + 1) % beatsPerMeasure;
  }

  return upcoming;
}

function ScrollingRhythmTimeline({
  beatMarkers,
  hits,
  bpm,
  beatsPerMeasure,
  isPlaying,
}: {
  beatMarkers: MetronomeBeatMarker[];
  hits: MetronomeHit[];
  bpm: number;
  beatsPerMeasure: 2 | 3 | 4;
  isPlaying: boolean;
}) {
  const now = useTimelineNow(isPlaying || hits.length > 0);
  const windowMs = getTimelineWindowMs(bpm, beatsPerMeasure);
  const msPerBeat = 60000 / bpm;
  const msPerMeasure = msPerBeat * beatsPerMeasure;
  const lookAheadMs = msPerMeasure;
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
    ? getUpcomingBeats(beatMarkers, now, bpm, beatsPerMeasure, lookAheadMs)
    : [];
  const visibleBeats = [...pastBeats, ...upcomingBeats];
  const visibleHits = hits.filter((hit) => hit.timestamp >= now - windowMs);

  const measureLines: number[] = [];
  const firstLine =
    Math.floor((now - windowMs) / msPerMeasure) * msPerMeasure;

  for (
    let time = firstLine;
    time <= now + lookAheadMs;
    time += msPerMeasure
  ) {
    measureLines.push(time);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted">
        El tiempo corre hacia la izquierda. La línea vertical marca{" "}
        <span className="font-semibold text-text-secondary">ahora</span>.
        Compará las marcas naranjas (metrónomo) con tus puntos (golpes). Los primeros
        golpes calibran la latencia de tu dispositivo; después la comparación se
        ajusta sola.
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
              const isDownbeat = beat.beatIndex === 0;
              const isFuture = beat.timestamp > now;

              return (
                <span
                  key={`beat-${beat.timestamp}-${index}`}
                  className="absolute bottom-0 w-1 -translate-x-1/2 rounded-full"
                  style={{
                    left: `${timeToLeftPercent(beat.timestamp)}%`,
                    height: isDownbeat ? "100%" : "58%",
                    backgroundColor: isFuture
                      ? "color-mix(in srgb, var(--accent) 45%, transparent)"
                      : "var(--accent)",
                    opacity: isFuture ? 0.55 : 1,
                  }}
                  title={`Click tiempo ${beat.beatIndex + 1}`}
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
          <span className="inline-block h-3 w-1 rounded-full bg-accent" />
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
  beatsPerMeasure,
}: {
  hits: MetronomeHit[];
  beatMarkers: MetronomeBeatMarker[];
  isPlaying: boolean;
  bpm: number;
  beatsPerMeasure: 2 | 3 | 4;
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
              ? "Golpeá al ritmo: tu punto debería caer sobre la marca naranja"
              : "Iniciá el metrónomo para ver la línea de tiempo"}
          </p>
        )}
      </div>

      <ScrollingRhythmTimeline
        beatMarkers={beatMarkers}
        hits={hits}
        bpm={bpm}
        beatsPerMeasure={beatsPerMeasure}
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
  beatsPerMeasure,
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
  onSetBeatsPerMeasure,
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

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6">
          <div className="rounded-[16px] border border-border bg-bg-cola-sheet p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Tempo
            </p>

            <div className="mt-3 flex items-center justify-center gap-3">
              <TapButton
                type="button"
                aria-label="Reducir BPM"
                disabled={bpm <= BPM_MIN}
                onClick={() => onSetBpm(bpm - 1)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
              >
                −
              </TapButton>
              <div className="min-w-[7rem] text-center" aria-live="polite">
                <p className="text-5xl font-extrabold leading-none text-text-primary">
                  {bpm}
                </p>
                <p className="mt-1 text-sm text-text-muted">BPM</p>
              </div>
              <TapButton
                type="button"
                aria-label="Aumentar BPM"
                disabled={bpm >= BPM_MAX}
                onClick={() => onSetBpm(bpm + 1)}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-bg-card text-xl font-bold text-text-primary disabled:opacity-40"
              >
                +
              </TapButton>
            </div>

            <div className="mt-4 rounded-[12px] border border-border bg-bg-card p-3">
              <p className="text-xs font-semibold text-text-secondary">
                Marcar ritmo a mano
              </p>
              <p className="mt-1 text-[11px] text-text-muted">
                {isPlaying
                  ? "Detené el metrónomo para marcar el tempo con TAP."
                  : "Tocá 2–4 veces al ritmo que querés; la app calcula el BPM."}
              </p>
              <TapButton
                type="button"
                disabled={isPlaying}
                onClick={onTapTempo}
                className={`mt-3 w-full rounded-[12px] border px-4 py-3 text-sm font-bold disabled:opacity-40 ${
                  tapTempoTapCount > 0 && !isPlaying
                    ? "border-accent bg-accent-dim text-accent"
                    : "border-border bg-bg-cola-sheet text-text-primary"
                }`}
              >
                TAP
              </TapButton>
              {tapTempoTapCount > 0 && !isPlaying ? (
                <p className="mt-2 text-center text-xs text-accent" aria-live="polite">
                  {tapTempoTapCount === 1
                    ? "1 golpe · tocá una vez más"
                    : `${tapTempoTapCount} golpes · ${tapTempoTapCount >= 2 ? "tempo actualizado" : "seguí tocando"}`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[16px] border border-border bg-bg-cola-sheet p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Reproducir
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isPlaying
                    ? "bg-accent text-white"
                    : "border border-border bg-bg-card text-text-secondary"
                }`}
              >
                {isPlaying ? "Sonando" : "Detenido"}
              </span>
            </div>

            <p className="mt-2 text-[11px] text-text-muted">
              Compás · cuántos tiempos por ciclo
            </p>
            <div className="mt-2 flex items-center justify-center gap-2">
              {([2, 3, 4] as const).map((value) => {
                const selected = beatsPerMeasure === value;

                return (
                  <TapButton
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSetBeatsPerMeasure(value)}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                      selected
                        ? "bg-accent text-white"
                        : "border border-border bg-bg-card text-text-secondary"
                    }`}
                  >
                    {value}
                  </TapButton>
                );
              })}
            </div>

            <div
              className="mt-5 flex items-end justify-center gap-3"
              aria-live="polite"
              aria-label="Indicador de compás"
            >
              {Array.from({ length: beatsPerMeasure }, (_, index) => {
                const isActive = isPlaying && currentBeat === index;
                const isDownbeat = index === 0;

                return (
                  <span
                    key={index}
                    className={`rounded-full transition-colors duration-75 ${
                      isDownbeat ? "size-5" : "size-4"
                    } ${
                      isActive
                        ? "bg-accent"
                        : "border border-border bg-bg-card"
                    }`}
                  />
                );
              })}
            </div>

            <div className="mt-6 flex justify-center">
              <TapButton
                type="button"
                aria-label={isPlaying ? "Detener metrónomo" : "Iniciar metrónomo"}
                onClick={isPlaying ? onStop : onStart}
                className={`flex size-16 items-center justify-center rounded-full ${
                  isPlaying
                    ? "bg-accent text-white"
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
          </div>

          <div className="rounded-[16px] border border-border bg-bg-cola-sheet p-4">
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
                  micActivo ? "bg-accent" : "border border-border bg-bg-card"
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
                    beatsPerMeasure={beatsPerMeasure}
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
