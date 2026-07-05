"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { HelpCircle, Timer, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type IntensidadLevel = "fuerte" | "medio" | "suave" | "silencio";

const BEAT_MS = 600;
const BEAT_CONTAINER_PX = 44;
const BEAT_PATTERN: IntensidadLevel[] = [
  "fuerte",
  "suave",
  "medio",
  "fuerte",
  "silencio",
  "medio",
];

const BEAT_DEFS: Array<{
  level: IntensidadLevel;
  heightPercent: number | null;
  label: string;
}> = [
  { level: "fuerte", heightPercent: 100, label: "F" },
  { level: "suave", heightPercent: 28, label: "S" },
  { level: "medio", heightPercent: 58, label: "M" },
  { level: "fuerte", heightPercent: 100, label: "F" },
  { level: "silencio", heightPercent: null, label: "—" },
  { level: "medio", heightPercent: 58, label: "M" },
];

const LEVEL_STATUS: Record<IntensidadLevel, string> = {
  fuerte: "Fuerte",
  medio: "Medio",
  suave: "Suave",
  silencio: "Silencio",
};

const LEVEL_MOUTH_RY: Record<IntensidadLevel, number> = {
  fuerte: 5.5,
  medio: 4,
  suave: 2.5,
  silencio: 1.5,
};

const HELP_ICON_CLASS = "size-4 shrink-0 text-[var(--voz-config)]";

function IntensidadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="14"
        width="5"
        height="8"
        rx="1.5"
        fill="var(--voz-config)"
        opacity="0.45"
      />
      <rect
        x="9.5"
        y="8"
        width="5"
        height="14"
        rx="1.5"
        fill="var(--voz-config)"
        opacity="0.72"
      />
      <rect x="17" y="3" width="5" height="19" rx="1.5" fill="var(--voz-config)" />
    </svg>
  );
}

function GolpesConceptIcon() {
  return (
    <svg
      viewBox="0 0 28 10"
      className="h-2.5 w-7 shrink-0 text-[var(--voz-config)]"
      aria-hidden="true"
    >
      {[5, 11, 17, 23].map((cx) => (
        <circle key={cx} cx={cx} cy="5" r="2.5" fill="currentColor" />
      ))}
    </svg>
  );
}

function FiguraConceptIcon() {
  return (
    <svg
      viewBox="0 0 32 40"
      className="h-4 w-3 shrink-0 text-[var(--voz-config)]"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
      <line
        x1="21"
        y1="30"
        x2="21"
        y2="4"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IntensidadConceptIcon() {
  return (
    <Volume2
      className={HELP_ICON_CLASS}
      strokeWidth={2.25}
      aria-hidden="true"
    />
  );
}

function getBeatBaseHeight(heightPercent: number | null): number {
  if (heightPercent === null) {
    return 8;
  }

  return (heightPercent / 100) * BEAT_CONTAINER_PX;
}

function getArcState(
  level: IntensidadLevel,
  arcIndex: 1 | 2 | 3,
): { active: boolean; opacity: number } {
  switch (level) {
    case "fuerte":
      return { active: true, opacity: 1 };
    case "medio":
      return arcIndex <= 2
        ? { active: true, opacity: 1 }
        : { active: false, opacity: 0.2 };
    case "suave":
      return arcIndex === 1
        ? { active: true, opacity: 1 }
        : { active: false, opacity: 0.2 };
    default:
      return { active: false, opacity: 0.2 };
  }
}

function IntensidadHelpDemo() {
  const [beatIndex, setBeatIndex] = useState(0);
  const [level, setLevel] = useState<IntensidadLevel>(BEAT_PATTERN[0]!);

  useEffect(() => {
    let cancelled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    function tick() {
      if (cancelled) {
        return;
      }

      setBeatIndex((prev) => {
        const next = (prev + 1) % BEAT_PATTERN.length;
        setLevel(BEAT_PATTERN[next]!);
        return next;
      });

      timeoutIds.push(setTimeout(tick, BEAT_MS));
    }

    timeoutIds.push(setTimeout(tick, BEAT_MS));

    return () => {
      cancelled = true;
      for (const id of timeoutIds) {
        clearTimeout(id);
      }
    };
  }, []);

  const mouthRy = LEVEL_MOUTH_RY[level];
  const arc1 = getArcState(level, 1);
  const arc2 = getArcState(level, 2);
  const arc3 = getArcState(level, 3);
  const statusColor =
    level === "silencio" ? "var(--text-muted)" : "var(--voz-config)";

  return (
    <div
      className="rounded-[12px] border border-border bg-bg-card p-4"
      aria-hidden="true"
    >
      <div className="space-y-4">
        <p
          className="min-h-[16px] text-center text-xs font-bold uppercase tracking-wide transition-colors"
          style={{ color: statusColor }}
        >
          {LEVEL_STATUS[level]}
        </p>

        <div className="flex w-full items-center gap-3">
          <svg width="62" height="62" viewBox="0 0 72 72" aria-hidden="true">
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
              ry={mouthRy}
              fill="var(--voz-config)"
              className="transition-all duration-200"
            />
            <path
              id="a1"
              d="M46 28 Q53 30 46 36"
              stroke="var(--voz-config)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className={arc1.active ? "arc-singing" : ""}
              style={{ opacity: arc1.opacity }}
            />
            <path
              id="a2"
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className={arc2.active ? "arc-singing arc-singing-delay-1" : ""}
              style={{ opacity: arc2.opacity }}
            />
            <path
              id="a3"
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={arc3.active ? "arc-singing arc-singing-delay-2" : ""}
              style={{ opacity: arc3.opacity }}
            />
          </svg>

          <div className="min-w-0 flex-1">
            <div className="flex h-11 items-end gap-1.5">
              {BEAT_DEFS.map((beat, index) => {
                const active = index === beatIndex;
                const baseHeight = getBeatBaseHeight(beat.heightPercent);
                const height = active ? baseHeight * 1.08 : baseHeight;
                const isSilencio = beat.level === "silencio";

                return (
                  <div
                    key={index}
                    className={`flex flex-1 items-center justify-center rounded-[6px] transition-all duration-150 ${
                      isSilencio
                        ? active
                          ? "border border-border/60 bg-bg-card"
                          : "border border-border bg-bg-dark"
                        : active
                          ? "border border-[var(--voz-config)] bg-[color-mix(in_srgb,var(--voz-config)_78%,transparent)]"
                          : "border border-[color-mix(in_srgb,var(--voz-config)_32%,transparent)] bg-[color-mix(in_srgb,var(--voz-config)_20%,transparent)]"
                    }`}
                    style={{ height: `${height}px` }}
                  >
                    {isSilencio ? (
                      <VolumeX
                        className={`size-2.5 text-text-muted ${active ? "opacity-80" : "opacity-50"}`}
                        aria-hidden="true"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-0.5 flex gap-1.5">
              {BEAT_DEFS.map((beat, index) => (
                <span
                  key={`label-${index}`}
                  className="flex-1 text-center text-[8px] font-bold"
                  style={{
                    color:
                      beat.level === "silencio"
                        ? "var(--text-muted)"
                        : "var(--voz-config)",
                  }}
                >
                  {beat.label}
                </span>
              ))}
            </div>

            <div className="relative mt-1.5 h-0.5 w-full rounded-full bg-border">
              <div
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--voz-config)] transition-[left] duration-150"
                style={{ left: `${(beatIndex / BEAT_PATTERN.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type IntensidadHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function IntensidadHelpModal({ open, onClose }: IntensidadHelpModalProps) {
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
        aria-label="Cerrar ayuda de Ritmo-Intensidad"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intensidad-help-titulo"
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
              <IntensidadIcon />
            </div>
            <h2
              id="intensidad-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Ritmo-Intensidad
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <IntensidadHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<IntensidadIcon />}
                  label="¿Para qué sirve?"
                  text="Entrenás ritmo y volumen al mismo tiempo. La app reproduce el patrón y vos tenés que seguirlo: cantando en el momento justo y con la intensidad correcta."
                  shimmerDelayMs={0}
                />
                <HelpInfoCard
                  icon={<GolpesConceptIcon />}
                  label="Golpes"
                  text="Cuántos tiempos tiene el ciclo que se repite."
                  shimmerDelayMs={220}
                />
                <HelpInfoCard
                  icon={<FiguraConceptIcon />}
                  label="Figura"
                  text="Cuánto dura cada golpe: negra es el estándar, corchea más rápido, blanca más lento."
                  shimmerDelayMs={440}
                />
                <HelpInfoCard
                  icon={<IntensidadConceptIcon />}
                  label="Intensidad"
                  text="Para cada golpe elegís el volumen: silencio, suave, medio o fuerte. Ese es el patrón de intensidad que tenés que reproducir con la voz."
                  shimmerDelayMs={660}
                />
                <HelpInfoCard
                  icon={
                    <Timer
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="Tempo"
                  text="La velocidad del ciclo."
                  shimmerDelayMs={880}
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

export function IntensidadHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Ritmo-Intensidad"
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
