"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { Gauge, HelpCircle, Clock, Music2, Timer, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const META_SECS = 10;
const CIRCUMFERENCE = 2 * Math.PI * 40;

const PHASES = [
  {
    counting: true,
    ms: 2800,
    label: "En tono — el tiempo suma",
    dialColor: "var(--tuner-in-tune)",
  },
  {
    counting: false,
    ms: 1400,
    label: "Fuera de tono — vuelve a cero",
    dialColor: "var(--tuner-flat-sharp)",
  },
  {
    counting: true,
    ms: 2200,
    label: "En tono — el tiempo suma",
    dialColor: "var(--tuner-in-tune)",
  },
  {
    counting: false,
    ms: 1000,
    label: "Fuera de tono — vuelve a cero",
    dialColor: "var(--tuner-flat-sharp)",
  },
  {
    counting: true,
    ms: 2600,
    label: "En tono — el tiempo suma",
    dialColor: "var(--tuner-in-tune)",
  },
  {
    counting: false,
    ms: 800,
    label: "Fuera de tono — vuelve a cero",
    dialColor: "var(--tuner-flat-sharp)",
  },
  {
    counting: true,
    ms: 1800,
    label: "¡Meta cumplida!",
    dialColor: "var(--tuner-in-tune)",
  },
] as const;

const HELP_ICON_CLASS = "size-4 shrink-0 text-[var(--voz-config)]";

function ClockIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle
        cx="13"
        cy="13"
        r="10"
        stroke="var(--voz-config)"
        strokeWidth="1.8"
      />
      <path
        d="M13 7v6l3.5 3.5"
        stroke="var(--voz-config)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="10.5"
        y1="2"
        x2="15.5"
        y2="2"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="13" cy="3" r="1.2" fill="var(--voz-config)" />
    </svg>
  );
}

function SostenerHelpDemo() {
  const [statusLabel, setStatusLabel] = useState("Esperando voz…");
  const [singing, setSinging] = useState(false);
  const [dialColor, setDialColor] = useState("var(--tuner-in-tune)");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [strokeDashoffset, setStrokeDashoffset] = useState(CIRCUMFERENCE);
  const [needleRotation, setNeedleRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let phaseIndex = 0;
    let rafId = 0;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let phaseStartTime = 0;
    let currentCounting = false;
    let currentPhaseMs = 0;
    let phaseTargetElapsed: number | null = null;

    function updateVisuals(
      elapsedSecs: number,
      color: string,
      label: string,
      isSinging: boolean,
    ) {
      const clamped = Math.min(elapsedSecs, META_SECS);
      setStatusLabel(label);
      setDialColor(color);
      setSinging(isSinging);
      setElapsedSeconds(Math.min(META_SECS, Math.round(clamped)));
      setStrokeDashoffset(CIRCUMFERENCE * (1 - clamped / META_SECS));
      setNeedleRotation((clamped / META_SECS) * 360);
    }

    function tickLoop(now: number) {
      if (cancelled || !currentCounting) {
        return;
      }

      const progress = Math.min(1, (now - phaseStartTime) / currentPhaseMs);
      const clamped =
        phaseTargetElapsed !== null
          ? Math.min(META_SECS, phaseTargetElapsed * progress)
          : Math.min(META_SECS, (now - phaseStartTime) / 1000);

      setElapsedSeconds(Math.min(META_SECS, Math.round(clamped)));
      setStrokeDashoffset(CIRCUMFERENCE * (1 - clamped / META_SECS));
      setNeedleRotation((clamped / META_SECS) * 360);
      rafId = requestAnimationFrame(tickLoop);
    }

    function resetLoop() {
      updateVisuals(0, "var(--tuner-in-tune)", "Esperando voz…", false);
      timeoutIds.push(
        setTimeout(() => {
          if (!cancelled) {
            phaseIndex = 0;
            runPhase();
          }
        }, 600),
      );
    }

    function runPhase() {
      if (cancelled) {
        return;
      }

      if (phaseIndex >= PHASES.length) {
        resetLoop();
        return;
      }

      const phase = PHASES[phaseIndex]!;
      currentPhaseMs = phase.ms;

      if (!phase.counting) {
        currentCounting = false;
        cancelAnimationFrame(rafId);
        updateVisuals(0, phase.dialColor, phase.label, false);

        timeoutIds.push(
          setTimeout(() => {
            if (cancelled) {
              return;
            }
            phaseIndex += 1;
            runPhase();
          }, phase.ms),
        );
        return;
      }

      phaseStartTime = performance.now();
      currentCounting = true;
      phaseTargetElapsed =
        phase.label === "¡Meta cumplida!" ? META_SECS : null;

      const isSinging = phase.label !== "¡Meta cumplida!";
      updateVisuals(0, phase.dialColor, phase.label, isSinging);
      rafId = requestAnimationFrame(tickLoop);

      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) {
            return;
          }

          cancelAnimationFrame(rafId);
          currentCounting = false;

          const finalElapsed =
            phaseTargetElapsed !== null
              ? META_SECS
              : Math.min(META_SECS, phase.ms / 1000);
          updateVisuals(finalElapsed, phase.dialColor, phase.label, false);

          phaseIndex += 1;
          runPhase();
        }, phase.ms),
      );
    }

    updateVisuals(0, "var(--tuner-in-tune)", "Esperando voz…", false);
    timeoutIds.push(
      setTimeout(() => {
        if (!cancelled) {
          runPhase();
        }
      }, 600),
    );

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      for (const id of timeoutIds) {
        clearTimeout(id);
      }
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-[12px] border border-border bg-bg-card p-4"
      aria-hidden="true"
    >
      <div className="space-y-4">
        <p className="min-h-[16px] text-center text-xs font-bold uppercase tracking-wide text-accent">
          {statusLabel}
        </p>

        <div className="flex items-center justify-center gap-7">
          <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true">
            <circle
              cx="30"
              cy="30"
              r="22"
              fill="var(--bg-card)"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <circle cx="23" cy="26" r="2.5" fill="var(--voz-config)" />
            <circle cx="37" cy="26" r="2.5" fill="var(--voz-config)" />
            <ellipse
              cx="30"
              cy="37"
              rx="6"
              ry={singing ? 4 : 2.5}
              fill="var(--voz-config)"
              className="transition-all duration-200"
            />
            <path
              d="M46 28 Q53 30 46 36"
              stroke="var(--voz-config)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className={singing ? "arc-singing" : ""}
              style={{ opacity: singing ? undefined : 0.25 }}
            />
            <path
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className={singing ? "arc-singing arc-singing-delay-1" : ""}
              style={{ opacity: singing ? undefined : 0.25 }}
            />
            <path
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={singing ? "arc-singing arc-singing-delay-2" : ""}
              style={{ opacity: singing ? undefined : 0.25 }}
            />
          </svg>

          <div className="relative shrink-0">
            <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden="true">
              <circle
                cx="55"
                cy="55"
                r="46"
                fill="var(--bg-dark)"
                stroke="var(--border)"
                strokeWidth="2"
              />
              <circle
                cx="55"
                cy="55"
                r="42"
                fill="none"
                stroke="var(--border)"
                strokeWidth="5"
                strokeDasharray="2 7"
                opacity="0.4"
              />
              <circle
                cx="55"
                cy="55"
                r="40"
                fill="none"
                stroke={dialColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 55 55)"
                style={{
                  transition: "stroke-dashoffset 0.15s ease-out, stroke 0.3s ease-out",
                }}
              />
              <g
                transform={`rotate(${needleRotation} 55 55)`}
                style={{ transition: "transform 0.25s ease-out" }}
              >
                <line
                  x1="55"
                  y1="55"
                  x2="55"
                  y2="20"
                  stroke={dialColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ transition: "stroke 0.3s ease-out" }}
                />
              </g>
              <circle
                cx="55"
                cy="55"
                r="5"
                fill={dialColor}
                style={{ transition: "fill 0.3s ease-out" }}
              />
              <circle cx="55" cy="55" r="2.5" fill="var(--bg-dark)" />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold tabular-nums text-text-primary">
                {elapsedSeconds}
              </span>
              <span className="text-[9px] uppercase tracking-wide text-text-muted">
                seg
              </span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-text-muted">
          El tiempo suma solo mientras estás afinado. Si te desafinás, el
          cronómetro vuelve a cero.
        </p>
      </div>
    </div>
  );
}

type SostenerHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SostenerHelpModal({ open, onClose }: SostenerHelpModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-3 py-6">
      <button
        type="button"
        aria-label="Cerrar ayuda de Sostener"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sostener-help-titulo"
        className="relative z-10 flex h-[min(88vh,620px)] w-full max-w-sm flex-col overflow-hidden rounded-[16px] border border-border bg-bg-cola-sheet shadow-2xl"
      >
        <header
          className="relative shrink-0 border-b bg-bg-dark px-4 pb-4 pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            aria-label="Cerrar ayuda"
            onClick={onClose}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </button>

          <div className="flex flex-col items-center gap-2 pt-1">
            <div
              className="flex size-11 items-center justify-center rounded-full border"
              style={{
                backgroundColor:
                  "color-mix(in srgb, var(--voz-config) 12%, transparent)",
                borderColor:
                  "color-mix(in srgb, var(--voz-config) 25%, transparent)",
              }}
            >
              <ClockIcon />
            </div>
            <h2
              id="sostener-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Sostener
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <SostenerHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={
                    <Clock
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="¿Para qué sirve?"
                  text="Entrenás tu voz para mantener una nota afinada durante un tiempo. La app mide cuántos segundos la sostenés en tono."
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={
                    <Music2
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="Nota objetivo"
                  text="La nota que tenés que sostener."
                  shimmerDelayMs={220}
                />
                <HelpInfoCard
                  icon={
                    <Timer
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="Meta de tiempo"
                  text="Cuántos segundos querés mantener la nota en tono seguidos. El cronómetro suma solo mientras estás afinado y vuelve a cero si te desafinás."
                  shimmerDelayMs={440}
                />
                <HelpInfoCard
                  icon={
                    <Gauge
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="Calibre"
                  text="Qué tan estricta es la evaluación: Principiante acepta más desviación, Avanzado exige mayor precisión."
                  shimmerDelayMs={660}
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SostenerHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Sostener"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-bg-card"
      style={{
        borderColor: "color-mix(in srgb, var(--voz-config) 35%, var(--border))",
        color: "var(--voz-config)",
        backgroundColor:
          "color-mix(in srgb, var(--voz-config) 10%, transparent)",
      }}
    >
      <HelpCircle className="size-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
