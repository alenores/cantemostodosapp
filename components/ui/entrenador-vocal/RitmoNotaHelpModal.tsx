"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { HelpCircle, Music2, Timer, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HELP_ICON_CLASS = "size-4 shrink-0 text-[var(--voz-config)]";

type IntensidadLevel = "fuerte" | "medio" | "suave" | "silencio";
type ResultKey = "en-tono" | "cerca" | "lejos";

const PATTERN: Array<{
  level: IntensidadLevel;
  height: number;
  sing: boolean;
  label: string;
}> = [
  { level: "fuerte", height: 32, sing: true, label: "F" },
  { level: "silencio", height: 0, sing: false, label: "—" },
  { level: "medio", height: 20, sing: true, label: "M" },
  { level: "fuerte", height: 32, sing: true, label: "F" },
  { level: "silencio", height: 0, sing: false, label: "—" },
  { level: "suave", height: 10, sing: true, label: "S" },
];

const RESULT_CYCLES: ResultKey[][] = [
  ["en-tono", "en-tono", "cerca", "en-tono"],
  ["cerca", "en-tono", "en-tono", "lejos"],
  ["en-tono", "cerca", "en-tono", "en-tono"],
];

const COLORS: Record<ResultKey, string> = {
  "en-tono": "var(--tuner-in-tune)",
  cerca: "var(--tuner-cerca)",
  lejos: "var(--tuner-flat-sharp)",
};

const LABELS: Record<ResultKey, string> = {
  "en-tono": "Mi · En tono",
  cerca: "Mi · Cerca",
  lejos: "Mi · Desafinado",
};

const AMPLITUDES: Record<ResultKey, number> = {
  "en-tono": 3.5,
  cerca: 10,
  lejos: 22,
};

const LEVEL_MOUTH_RY: Record<IntensidadLevel, number> = {
  fuerte: 5.5,
  medio: 4,
  suave: 2.5,
  silencio: 1.5,
};

const TARGET_Y = 45;
const TOTAL_MS = 6400;
const RESULT_WAIT_MS = 1400;
const SEG_W = 240 / 6;

function RitmoNotaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="10" width="4" height="9" rx="1.5" fill="var(--voz-config)" />
      <rect
        x="9"
        y="10"
        width="4"
        height="9"
        rx="1.5"
        fill="var(--voz-config)"
        opacity="0.25"
      />
      <rect x="16" y="10" width="4" height="9" rx="1.5" fill="var(--voz-config)" />
      <circle cx="4" cy="19" r="2.5" fill="var(--voz-config)" />
      <circle cx="18" cy="19" r="2.5" fill="var(--voz-config)" />
      <line
        x1="4"
        y1="10"
        x2="4"
        y2="4"
        stroke="var(--voz-config)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="10"
        x2="18"
        y2="6"
        stroke="var(--voz-config)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <line
        x1="4"
        y1="4"
        x2="18"
        y2="6"
        stroke="var(--voz-config)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
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

function noisyY(elapsed: number, amp: number): number {
  return (
    TARGET_Y +
    Math.sin((elapsed / 260) * 4.5) * amp +
    Math.cos((elapsed / 260) * 7.8) * amp * 0.4
  );
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

function getSingingBeatIndex(beatIdx: number): number {
  let count = 0;
  for (let i = 0; i < beatIdx; i++) {
    if (PATTERN[i]!.sing) {
      count++;
    }
  }
  return count;
}

function buildPathFromPoints(pts: Array<[number, number] | null>): string {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];

  for (const pt of pts) {
    if (pt === null) {
      if (current.length > 0) {
        segments.push(current);
      }
      current = [];
    } else {
      current.push(pt);
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments
    .map((seg) => `M ${seg.map((p) => `${p[0]},${p[1]}`).join(" L ")}`)
    .join(" ");
}

function RitmoNotaHelpDemo() {
  const traceRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [statusLabel, setStatusLabel] = useState(LABELS["en-tono"]);
  const [statusColor, setStatusColor] = useState<string>(COLORS["en-tono"]);
  const [faceLevel, setFaceLevel] = useState<IntensidadLevel>("fuerte");
  const [beatIndex, setBeatIndex] = useState(0);
  const [resultColor, setResultColor] = useState<string>(COLORS["en-tono"]);

  const mouthRy = LEVEL_MOUTH_RY[faceLevel];
  const arc1 = getArcState(faceLevel, 1);
  const arc2 = getArcState(faceLevel, 2);
  const arc3 = getArcState(faceLevel, 3);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    let restartTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let runIndex = 0;
    let lastBeatIdx = -1;
    let inResultPhase = false;

    function startRun() {
      if (cancelled) {
        return;
      }

      const cycle = RESULT_CYCLES[runIndex]!;
      const cycleStart = performance.now();
      const pts: Array<[number, number] | null> = [];
      lastBeatIdx = -1;
      inResultPhase = false;
      let currentResult: ResultKey = cycle[0]!;

      if (traceRef.current) {
        traceRef.current.setAttribute("d", "");
        traceRef.current.setAttribute("stroke", COLORS[currentResult]);
      }
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", "-10");
        dotRef.current.setAttribute("cy", String(TARGET_Y));
        dotRef.current.setAttribute("fill", COLORS[currentResult]);
      }

      setStatusLabel(LABELS[currentResult]);
      setStatusColor(COLORS[currentResult]);
      setResultColor(COLORS[currentResult]);
      setFaceLevel(PATTERN[0]!.level);
      setBeatIndex(0);

      function frame(now: number) {
        if (cancelled) {
          return;
        }

        const elapsed = now - cycleStart;

        if (elapsed >= TOTAL_MS + RESULT_WAIT_MS) {
          runIndex = (runIndex + 1) % RESULT_CYCLES.length;
          restartTimeoutId = setTimeout(startRun, 0);
          return;
        }

        if (elapsed >= TOTAL_MS) {
          if (!inResultPhase) {
            inResultPhase = true;
            setStatusLabel("¡Ciclo completo!");
            setStatusColor(COLORS["en-tono"]);
            if (traceRef.current) {
              traceRef.current.setAttribute("stroke", COLORS["en-tono"]);
            }
            if (dotRef.current) {
              dotRef.current.setAttribute("fill", COLORS["en-tono"]);
            }
          }
          rafId = requestAnimationFrame(frame);
          return;
        }

        const x = (elapsed / TOTAL_MS) * 240;
        const beatIdx = Math.min(Math.floor(x / SEG_W), 5);
        const beat = PATTERN[beatIdx]!;

        if (beatIdx !== lastBeatIdx) {
          lastBeatIdx = beatIdx;
          setBeatIndex(beatIdx);
          setFaceLevel(beat.level);

          if (beat.sing) {
            const singingIdx = getSingingBeatIndex(beatIdx);
            currentResult = cycle[singingIdx]!;
            setStatusLabel(LABELS[currentResult]);
            setStatusColor(COLORS[currentResult]);
            setResultColor(COLORS[currentResult]);
          } else {
            setStatusLabel("Silencio");
            setStatusColor("var(--text-muted)");
            pts.push(null);
            if (dotRef.current) {
              dotRef.current.setAttribute("cx", "-10");
            }
          }
        }

        const color = COLORS[currentResult];

        if (beat.sing) {
          const amp = AMPLITUDES[currentResult];
          const y = noisyY(elapsed, amp);
          pts.push([x, y]);

          if (traceRef.current) {
            traceRef.current.setAttribute("d", buildPathFromPoints(pts));
            traceRef.current.setAttribute("stroke", color);
          }
          if (dotRef.current) {
            dotRef.current.setAttribute("cx", String(x));
            dotRef.current.setAttribute("cy", String(y));
            dotRef.current.setAttribute("fill", color);
          }
        } else if (traceRef.current) {
          traceRef.current.setAttribute("d", buildPathFromPoints(pts));
        }

        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
    }

    startRun();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (restartTimeoutId !== undefined) {
        clearTimeout(restartTimeoutId);
      }
    };
  }, []);

  return (
    <div
      className="rounded-[12px] border border-border bg-bg-card p-4"
      aria-hidden="true"
    >
      <div className="space-y-3">
        <p
          className="min-h-[16px] text-center text-xs font-bold uppercase tracking-wide transition-colors"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </p>

        <div className="flex w-full items-center gap-2.5">
          <svg width="58" height="58" viewBox="0 0 72 72" aria-hidden="true">
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
              d="M46 28 Q53 30 46 36"
              stroke="var(--voz-config)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className={arc1.active ? "arc-singing" : ""}
              style={{ opacity: arc1.opacity }}
            />
            <path
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className={arc2.active ? "arc-singing arc-singing-delay-1" : ""}
              style={{ opacity: arc2.opacity }}
            />
            <path
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={arc3.active ? "arc-singing arc-singing-delay-2" : ""}
              style={{ opacity: arc3.opacity }}
            />
          </svg>

          <div className="flex flex-1 flex-col gap-1.5">
            <div className="overflow-hidden rounded-[10px] border border-border bg-bg-dark">
              <svg
                width="100%"
                viewBox="0 0 240 90"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <rect
                  x="0"
                  y="0"
                  width="40"
                  height="90"
                  fill="color-mix(in srgb, var(--voz-config) 9%, transparent)"
                />
                <rect x="40" y="0" width="40" height="90" fill="rgba(0,0,0,0.22)" />
                <rect
                  x="80"
                  y="0"
                  width="40"
                  height="90"
                  fill="color-mix(in srgb, var(--voz-config) 5%, transparent)"
                />
                <rect
                  x="120"
                  y="0"
                  width="40"
                  height="90"
                  fill="color-mix(in srgb, var(--voz-config) 9%, transparent)"
                />
                <rect x="160" y="0" width="40" height="90" fill="rgba(0,0,0,0.22)" />
                <rect
                  x="200"
                  y="0"
                  width="40"
                  height="90"
                  fill="color-mix(in srgb, var(--voz-config) 4%, transparent)"
                />

                <line x1="40" y1="0" x2="40" y2="90" stroke="var(--border)" strokeWidth="1" />
                <line x1="80" y1="0" x2="80" y2="90" stroke="var(--border)" strokeWidth="1" />
                <line x1="120" y1="0" x2="120" y2="90" stroke="var(--border)" strokeWidth="1" />
                <line x1="160" y1="0" x2="160" y2="90" stroke="var(--border)" strokeWidth="1" />
                <line x1="200" y1="0" x2="200" y2="90" stroke="var(--border)" strokeWidth="1" />

                <text
                  x="3"
                  y="48"
                  fontSize="7"
                  fill="var(--tuner-in-tune)"
                  opacity="0.7"
                  fontFamily="system-ui"
                  fontWeight="700"
                >
                  Mi
                </text>

                <line
                  x1="0"
                  y1="45"
                  x2="240"
                  y2="45"
                  stroke="var(--tuner-in-tune)"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.5"
                />

                <text
                  x="48"
                  y="49"
                  fontSize="7"
                  fill="var(--text-muted)"
                  fontFamily="system-ui"
                  fontWeight="700"
                  opacity="0.7"
                >
                  silencio
                </text>
                <text
                  x="166"
                  y="49"
                  fontSize="7"
                  fill="var(--text-muted)"
                  fontFamily="system-ui"
                  fontWeight="700"
                  opacity="0.7"
                >
                  silencio
                </text>

                <path
                  ref={traceRef}
                  d=""
                  stroke="var(--tuner-in-tune)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  ref={dotRef}
                  cx="-10"
                  cy="45"
                  r="4"
                  fill="var(--tuner-in-tune)"
                />
              </svg>
            </div>

            <div>
              <div className="flex h-9 items-end gap-1">
                {PATTERN.map((beat, index) => {
                  const active = index === beatIndex;
                  const isSilencio = beat.level === "silencio";
                  const barHeight = beat.height === 0 ? 5 : beat.height;

                  let barClass =
                    "flex-1 rounded-[5px] transition-all duration-100 origin-bottom ";
                  if (isSilencio) {
                    barClass += active
                      ? "border border-border/60 bg-bg-card"
                      : "border border-border bg-bg-dark";
                  } else if (active) {
                    barClass += "scale-y-110";
                  } else {
                    barClass +=
                      "border border-[color-mix(in_srgb,var(--voz-config)_40%,transparent)] bg-[color-mix(in_srgb,var(--voz-config)_25%,transparent)]";
                  }

                  return (
                    <div
                      key={index}
                      className={barClass}
                      style={{
                        height: `${barHeight}px`,
                        ...(active && !isSilencio
                          ? {
                              backgroundColor: `color-mix(in srgb, ${resultColor} 50%, rgba(167,139,250,0.1))`,
                              borderColor: resultColor,
                            }
                          : {}),
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-0.5 flex gap-1">
                {PATTERN.map((beat, index) => (
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
            </div>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-text-muted">
          Cantá con el volumen correcto y en la nota correcta.
        </p>
      </div>
    </div>
  );
}

type RitmoNotaHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RitmoNotaHelpModal({ open, onClose }: RitmoNotaHelpModalProps) {
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
        aria-label="Cerrar ayuda de Ritmo-Nota"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ritmo-nota-help-titulo"
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
              <RitmoNotaIcon />
            </div>
            <h2
              id="ritmo-nota-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Ritmo-Nota
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <RitmoNotaHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<RitmoNotaIcon />}
                  label="¿Para qué sirve?"
                  text="Combinás ritmo, afinación y volumen. La app marca cuándo cantar y en qué volumen. Cuando toca cantar, tenés que hacerlo en la nota correcta."
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
                  text="La nota que tenés que cantar cuando el patrón lo indica."
                  shimmerDelayMs={220}
                />
                <HelpInfoCard
                  icon={<GolpesConceptIcon />}
                  label="Golpes"
                  text="Cuántos tiempos tiene el ciclo."
                  shimmerDelayMs={440}
                />
                <HelpInfoCard
                  icon={<FiguraConceptIcon />}
                  label="Figura"
                  text="Cuánto dura cada golpe: negra es el estándar, corchea más rápido, blanca más lento."
                  shimmerDelayMs={660}
                />
                <HelpInfoCard
                  icon={<IntensidadConceptIcon />}
                  label="Intensidad"
                  text="Para cada golpe elegís el volumen: silencio, suave, medio o fuerte."
                  shimmerDelayMs={880}
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
                  shimmerDelayMs={1100}
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

export function RitmoNotaHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Ritmo-Nota"
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
