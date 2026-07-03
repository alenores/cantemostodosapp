"use client";

import {
  getBeatDurationLabel,
  getMsPerBeat,
  type MetronomeBeatDuration,
} from "@/lib/metronomo";
import { useEffect, useState } from "react";

type DemoPhase = {
  beats: number;
  bpm: number;
  label: string;
  duration: MetronomeBeatDuration;
  duracionMs: number;
};

const DEMO_PHASES: DemoPhase[] = [
  {
    beats: 4,
    bpm: 80,
    label: "4 golpes · ritmo normal",
    duration: "negra",
    duracionMs: 4000,
  },
  {
    beats: 5,
    bpm: 80,
    label: "5 golpes · se suma uno",
    duration: "negra",
    duracionMs: 3200,
  },
  {
    beats: 6,
    bpm: 80,
    label: "6 golpes · más largo",
    duration: "negra",
    duracionMs: 3600,
  },
  {
    beats: 4,
    bpm: 80,
    label: "Volvemos a 4",
    duration: "negra",
    duracionMs: 2400,
  },
  {
    beats: 4,
    bpm: 120,
    label: "Acelerando…",
    duration: "negra",
    duracionMs: 3000,
  },
  {
    beats: 4,
    bpm: 160,
    label: "160 BPM · muy rápido",
    duration: "corchea",
    duracionMs: 2500,
  },
  {
    beats: 4,
    bpm: 80,
    label: "De vuelta a 80 BPM",
    duration: "negra",
    duracionMs: 3000,
  },
];

export function MetronomeUnifiedDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [activeBeat, setActiveBeat] = useState(0);

  const phase = DEMO_PHASES[phaseIndex] ?? DEMO_PHASES[0]!;
  const figuraLabel = getBeatDurationLabel(phase.duration);

  useEffect(() => {
    let currentPhaseIndex = 0;
    let beatIndex = 0;
    let nextBeatAt = 0;
    let rafId = 0;
    let phaseTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    function getCurrentPhase() {
      return DEMO_PHASES[currentPhaseIndex] ?? DEMO_PHASES[0]!;
    }

    function tickLoop(now: number) {
      if (cancelled) {
        return;
      }

      const currentPhase = getCurrentPhase();

      if (now >= nextBeatAt) {
        beatIndex = (beatIndex + 1) % currentPhase.beats;
        setActiveBeat(beatIndex);
        nextBeatAt = now + getMsPerBeat(currentPhase.bpm, currentPhase.duration);
      }

      rafId = requestAnimationFrame(tickLoop);
    }

    function startPhase() {
      const currentPhase = getCurrentPhase();
      beatIndex = 0;
      setPhaseIndex(currentPhaseIndex);
      setActiveBeat(0);
      nextBeatAt = performance.now() + getMsPerBeat(currentPhase.bpm, currentPhase.duration);

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(tickLoop);

      if (phaseTimeoutId !== undefined) {
        clearTimeout(phaseTimeoutId);
      }

      phaseTimeoutId = setTimeout(() => {
        if (cancelled) {
          return;
        }
        currentPhaseIndex = (currentPhaseIndex + 1) % DEMO_PHASES.length;
        startPhase();
      }, currentPhase.duracionMs);
    }

    startPhase();

    return () => {
      cancelled = true;
      if (phaseTimeoutId !== undefined) {
        clearTimeout(phaseTimeoutId);
      }
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-[12px] border border-border bg-bg-card"
      aria-hidden="true"
    >
      <div className="space-y-4 p-4">
        <p className="flex h-4 items-center justify-center text-center text-xs font-bold uppercase tracking-wide text-accent">
          {phase.label}
        </p>

        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: phase.beats }, (_, index) => {
            const isActive = index === activeBeat;
            const isFirst = index === 0;
            const size = isFirst ? 20 : 14;

            return (
              <span
                key={`${phaseIndex}-${index}`}
                className="shrink-0 rounded-full border transition-all duration-75"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: isActive ? "var(--voz-config)" : "var(--bg-card)",
                  borderColor: "var(--border)",
                  transform: isActive ? "scale(1.4)" : "scale(1)",
                }}
              />
            );
          })}
        </div>

        <div
          className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-center">
            <p className="text-[10px] text-text-muted">Golpes</p>
            <p className="text-lg font-bold text-text-primary">{phase.beats}</p>
          </div>
          <div
            className="h-8 w-px shrink-0"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div className="text-center">
            <p className="text-[10px] text-text-muted">BPM</p>
            <p className="text-3xl font-extrabold text-text-primary">{phase.bpm}</p>
          </div>
          <div
            className="h-8 w-px shrink-0"
            style={{ backgroundColor: "var(--border)" }}
          />
          <div className="text-center">
            <p className="text-[10px] text-text-muted">Figura</p>
            <p className="text-sm font-bold text-text-primary">{figuraLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
