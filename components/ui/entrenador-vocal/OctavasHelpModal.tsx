"use client";

import { HelpCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const LOW_Y = 98;
const HIGH_Y = 36;
const X_LOW_START = 8;
const X_LOW_END = 100;
const X_HIGH_START = 140;
const X_HIGH_END = 232;
const TOTAL_MS = 5200;
const RESULT_WAIT_MS = 1600;
const LOW_PHASE_END = 0.42;
const PAUSE_PHASE_END = 0.54;

const CYCLES = [
  {
    lowAmp: 4,
    highAmp: 5,
    lowColor: "var(--tuner-in-tune)",
    highColor: "var(--tuner-in-tune)",
    label: "¡Ambas en tono!",
    finalColor: "var(--tuner-in-tune)",
  },
  {
    lowAmp: 14,
    highAmp: 5,
    lowColor: "var(--tuner-cerca)",
    highColor: "var(--tuner-in-tune)",
    label: "Octava perfecta",
    finalColor: "var(--tuner-cerca)",
  },
  {
    lowAmp: 4,
    highAmp: 20,
    lowColor: "var(--tuner-in-tune)",
    highColor: "var(--tuner-flat-sharp)",
    label: "Trabajá la octava",
    finalColor: "var(--tuner-flat-sharp)",
  },
  {
    lowAmp: 6,
    highAmp: 6,
    lowColor: "var(--tuner-in-tune)",
    highColor: "var(--tuner-in-tune)",
    label: "¡Ambas en tono!",
    finalColor: "var(--tuner-in-tune)",
  },
] as const;

type ChartPoint = { x: number; y: number };

function noisyY(targetY: number, elapsed: number, amplitude: number): number {
  return (
    targetY +
    Math.sin(elapsed / 300) * amplitude +
    Math.cos(elapsed / 180) * amplitude * 0.4
  );
}

function pointsToPath(points: ChartPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(" ");
}

function OctaveIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path
        d="M5 18 Q13 6 21 18"
        stroke="var(--voz-config)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="5" cy="18" r="2.2" fill="var(--voz-config)" />
      <circle cx="21" cy="18" r="2.2" fill="var(--voz-config)" />
      <path
        d="M9 14 Q13 8 17 14"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

function OctavasHelpDemo() {
  const [statusLabel, setStatusLabel] = useState("Esperando…");
  const [statusColor, setStatusColor] = useState("var(--accent)");
  const [singing, setSinging] = useState(false);
  const [mouthRy, setMouthRy] = useState(2.5);
  const [lblLowColor, setLblLowColor] = useState("var(--text-muted)");
  const [lblHighColor, setLblHighColor] = useState("var(--text-muted)");
  const [traceLow, setTraceLow] = useState("");
  const [traceHigh, setTraceHigh] = useState("");
  const [traceLowColor, setTraceLowColor] = useState("var(--tuner-in-tune)");
  const [traceHighColor, setTraceHighColor] = useState("var(--tuner-in-tune)");
  const [liveDot, setLiveDot] = useState({ cx: -20, cy: LOW_Y, visible: false });

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let cycleIndex = 0;

    function startCycle() {
      if (cancelled) {
        return;
      }

      const cycle = CYCLES[cycleIndex]!;
      const cycleStart = performance.now();
      let lastPhase: "idle" | "low" | "pause" | "high" | "result" = "idle";
      const lowPoints: ChartPoint[] = [];
      const highPoints: ChartPoint[] = [];

      setStatusLabel("Esperando…");
      setStatusColor("var(--accent)");
      setLblLowColor("var(--text-muted)");
      setLblHighColor("var(--text-muted)");
      setTraceLow("");
      setTraceHigh("");
      setTraceLowColor(cycle.lowColor);
      setTraceHighColor(cycle.highColor);
      setSinging(false);
      setMouthRy(2.5);
      setLiveDot({ cx: -20, cy: LOW_Y, visible: false });

      function frame(now: number) {
        if (cancelled) {
          return;
        }

        const elapsed = now - cycleStart;

        if (elapsed >= TOTAL_MS + RESULT_WAIT_MS) {
          cycleIndex = (cycleIndex + 1) % CYCLES.length;
          timeoutIds.push(setTimeout(startCycle, 300));
          return;
        }

        if (elapsed >= TOTAL_MS) {
          if (lastPhase !== "result") {
            lastPhase = "result";
            setSinging(false);
            setMouthRy(2.5);
            setLiveDot({ cx: -20, cy: HIGH_Y, visible: false });
            setLblLowColor("var(--text-muted)");
            setLblHighColor("var(--text-muted)");
            setStatusLabel(cycle.label);
            setStatusColor(cycle.finalColor);
          }
          rafId = requestAnimationFrame(frame);
          return;
        }

        const pct = elapsed / TOTAL_MS;

        if (pct < LOW_PHASE_END) {
          if (lastPhase !== "low") {
            lastPhase = "low";
            lowPoints.length = 0;
            setStatusLabel("Cantando nota base…");
            setStatusColor("var(--accent)");
            setLblLowColor(cycle.lowColor);
            setLblHighColor("var(--text-muted)");
            setSinging(true);
            setMouthRy(4);
            setTraceLow("");
            setTraceLowColor(cycle.lowColor);
          }

          const phaseT = pct / LOW_PHASE_END;
          const x = X_LOW_START + (X_LOW_END - X_LOW_START) * phaseT;
          const y = noisyY(LOW_Y, elapsed, cycle.lowAmp);
          lowPoints.push({ x, y });
          setTraceLow(pointsToPath(lowPoints));
          setLiveDot({ cx: x, cy: y, visible: true });
        } else if (pct < PAUSE_PHASE_END) {
          if (lastPhase !== "pause") {
            lastPhase = "pause";
            setSinging(false);
            setMouthRy(2.5);
            setStatusLabel("—");
            setStatusColor("var(--accent)");
            setLblLowColor("var(--text-muted)");
            setLiveDot({ cx: -20, cy: LOW_Y, visible: false });
          }
        } else {
          if (lastPhase !== "high") {
            lastPhase = "high";
            highPoints.length = 0;
            setStatusLabel("Cantando +1 octava…");
            setStatusColor("var(--accent)");
            setLblHighColor(cycle.highColor);
            setSinging(true);
            setMouthRy(5);
            setTraceHigh("");
            setTraceHighColor(cycle.highColor);
          }

          const phaseT = (pct - PAUSE_PHASE_END) / (1 - PAUSE_PHASE_END);
          const x = X_HIGH_START + (X_HIGH_END - X_HIGH_START) * phaseT;
          const y = noisyY(HIGH_Y, elapsed, cycle.highAmp);
          highPoints.push({ x, y });
          setTraceHigh(pointsToPath(highPoints));
          setLiveDot({ cx: x, cy: y, visible: true });
        }

        rafId = requestAnimationFrame(frame);
      }

      timeoutIds.push(
        setTimeout(() => {
          if (!cancelled) {
            rafId = requestAnimationFrame(frame);
          }
        }, 400),
      );
    }

    startCycle();

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
        <p
          className="min-h-[16px] text-center text-xs font-bold uppercase tracking-wide"
          style={{ color: statusColor }}
        >
          {statusLabel}
        </p>

        <div className="flex w-full items-center gap-2">
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
              d="M46 28 Q53 30 46 36"
              stroke="var(--voz-config)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              className={singing ? "octavas-arc-singing" : ""}
              style={{ opacity: singing ? undefined : 0.2 }}
            />
            <path
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className={singing ? "octavas-arc-singing octavas-arc-singing-delay-1" : ""}
              style={{ opacity: singing ? undefined : 0.2 }}
            />
            <path
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={singing ? "octavas-arc-singing octavas-arc-singing-delay-2" : ""}
              style={{ opacity: singing ? undefined : 0.2 }}
            />
          </svg>

          <div className="min-w-0 flex-1 overflow-hidden rounded-[10px] border border-border bg-bg-dark">
            <div className="flex border-b border-border">
              <p
                id="lbl-low"
                className="flex-1 py-1.5 text-center text-[10px] font-bold transition-colors duration-200"
                style={{ color: lblLowColor }}
              >
                Nota base
              </p>
              <div className="w-[14%] shrink-0 border-l border-r border-border" />
              <p
                id="lbl-high"
                className="flex-1 py-1.5 text-center text-[10px] font-bold transition-colors duration-200"
                style={{ color: lblHighColor }}
              >
                +1 octava
              </p>
            </div>

            <svg
              width="100%"
              viewBox="0 0 240 140"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="104"
                height="140"
                fill="color-mix(in srgb, var(--voz-config) 4%, transparent)"
              />
              <rect
                x="136"
                y="0"
                width="104"
                height="140"
                fill="color-mix(in srgb, var(--voz-config) 6%, transparent)"
              />
              <line
                x1="108"
                y1="0"
                x2="108"
                y2="140"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <line
                x1="132"
                y1="0"
                x2="132"
                y2="140"
                stroke="var(--border)"
                strokeWidth="1.5"
              />
              <line
                x1="6"
                y1="98"
                x2="100"
                y2="98"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.6"
              />
              <line
                x1="140"
                y1="36"
                x2="234"
                y2="36"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.6"
              />
              <text
                x="8"
                y="94"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
              >
                objetivo
              </text>
              <text
                x="142"
                y="32"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
              >
                objetivo
              </text>
              <path
                d={traceLow}
                stroke={traceLowColor}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={traceHigh}
                stroke={traceHighColor}
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {liveDot.visible ? (
                <circle
                  cx={liveDot.cx}
                  cy={liveDot.cy}
                  r="4"
                  fill={liveDot.cx < 120 ? traceLowColor : traceHighColor}
                />
              ) : null}
            </svg>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-text-muted">
          Cantás la nota base, hacés un corte, y cantás la misma nota una octava
          más arriba.
        </p>
      </div>
    </div>
  );
}

function InfoCard({ label, text }: { label: string; text: string }) {
  return (
    <article className="space-y-1.5 rounded-[12px] border border-border bg-bg-dark p-3">
      <p className="text-[12px] font-bold" style={{ color: "var(--voz-config)" }}>
        {label}
      </p>
      <p className="text-[12px] leading-relaxed text-text-secondary">{text}</p>
    </article>
  );
}

type OctavasHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function OctavasHelpModal({ open, onClose }: OctavasHelpModalProps) {
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
        aria-label="Cerrar ayuda de Octavas"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="octavas-help-titulo"
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
              <OctaveIcon />
            </div>
            <h2
              id="octavas-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Octavas
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <OctavasHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <InfoCard
                  label="¿Para qué sirve?"
                  text="Entrenás el salto de octava: cantás una nota, hacés un corte, y cantás la misma nota una octava más arriba. Es un ejercicio clásico para ampliar el rango vocal."
                />
                <InfoCard
                  label="Nota objetivo"
                  text="La nota base que vas a cantar. La app deriva automáticamente la octava de arriba."
                />
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Tips
              </h3>
              <div className="mt-2 flex items-start gap-2">
                <span
                  className="mt-1.5 size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "var(--voz-config)" }}
                  aria-hidden="true"
                />
                <p className="text-[11px] text-text-muted">
                  Escuchá la referencia antes de empezar — la app puede tocarte
                  las dos notas para que tengas el oído afinado.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function OctavasHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Octavas"
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
