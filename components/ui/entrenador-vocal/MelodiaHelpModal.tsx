"use client";

import { HelpCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const NOTES = [
  { name: "Do", targetY: 112, xStart: 20, xEnd: 38 },
  { name: "Mi", targetY: 66, xStart: 60, xEnd: 78 },
  { name: "Sol", targetY: 42, xStart: 100, xEnd: 118 },
  { name: "La", targetY: 18, xStart: 140, xEnd: 158 },
  { name: "Mi", targetY: 66, xStart: 180, xEnd: 198 },
  { name: "Do", targetY: 112, xStart: 220, xEnd: 238 },
] as const;

const RUNS = [
  ["en-tono", "en-tono", "en-tono", "en-tono", "en-tono", "en-tono"],
  ["en-tono", "cerca", "en-tono", "en-tono", "lejos", "en-tono"],
  ["cerca", "en-tono", "en-tono", "cerca", "en-tono", "en-tono"],
] as const;

const COLORS = {
  "en-tono": "var(--tuner-in-tune)",
  cerca: "var(--tuner-cerca)",
  lejos: "var(--tuner-flat-sharp)",
} as const;

const LABELS = {
  "en-tono": "¡Nota exacta!",
  cerca: "Cerca",
  lejos: "Nota incorrecta",
} as const;

const AMPLITUDES = {
  "en-tono": 3,
  cerca: 9,
  lejos: 18,
} as const;

const TOTAL_MS = 6200;
const RESULT_WAIT_MS = 1400;
const X_START = 20;
const X_END = 238;

type ResultKey = keyof typeof COLORS;

function MelodiaIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="5" cy="18" r="3" fill="var(--voz-config)" />
      <circle cx="19" cy="14" r="3" fill="var(--voz-config)" opacity="0.6" />
      <line
        x1="8"
        y1="18"
        x2="8"
        y2="6"
        stroke="var(--voz-config)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="14"
        x2="22"
        y2="2"
        stroke="var(--voz-config)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="8"
        y1="6"
        x2="22"
        y2="2"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function noisyY(targetY: number, elapsed: number, amp: number): number {
  return (
    targetY +
    Math.sin((elapsed / 280) * 4.2) * amp +
    Math.cos((elapsed / 280) * 7.1) * amp * 0.4
  );
}

function getActiveNoteIndex(x: number): number {
  for (let i = NOTES.length - 1; i >= 0; i--) {
    if (x >= NOTES[i]!.xStart) {
      return i;
    }
  }
  return 0;
}

function getTargetY(x: number): number {
  for (const note of NOTES) {
    if (x >= note.xStart && x <= note.xEnd) {
      return note.targetY;
    }
  }

  for (let i = 0; i < NOTES.length - 1; i++) {
    const current = NOTES[i]!;
    const next = NOTES[i + 1]!;
    if (x > current.xEnd && x < next.xStart) {
      const t = (x - current.xEnd) / (next.xStart - current.xEnd);
      return current.targetY + (next.targetY - current.targetY) * t;
    }
  }

  return NOTES[NOTES.length - 1]!.targetY;
}

function MelodiaConfigCard({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1 rounded-[12px] border border-border bg-bg-dark p-3">
      <p className="text-[13px] font-bold text-text-primary">{label}</p>
      <p className="text-[12px] leading-relaxed text-text-secondary">{text}</p>
    </div>
  );
}

function MelodiaHelpDemo() {
  const traceRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [statusLabel, setStatusLabel] = useState("Do · ¡Nota exacta!");
  const [statusColor, setStatusColor] = useState<string>(COLORS["en-tono"]);
  const [mouthRy, setMouthRy] = useState(3.5);

  useEffect(() => {
    let cancelled = false;
    let rafId = 0;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let runIndex = 0;
    let lastNoteIndex = -1;
    let inResultPhase = false;

    function startRun() {
      if (cancelled) {
        return;
      }

      const run = RUNS[runIndex]!;
      const cycleStart = performance.now();
      const points: { x: number; y: number }[] = [];
      lastNoteIndex = -1;
      inResultPhase = false;

      if (traceRef.current) {
        traceRef.current.setAttribute("d", "");
        traceRef.current.setAttribute("stroke", COLORS[run[0]!]);
      }
      if (dotRef.current) {
        dotRef.current.setAttribute("cx", String(X_START));
        dotRef.current.setAttribute("cy", String(NOTES[0]!.targetY));
        dotRef.current.setAttribute("fill", COLORS[run[0]!]);
      }

      setStatusLabel(`${NOTES[0]!.name} · ${LABELS[run[0]!]}`);
      setStatusColor(COLORS[run[0]!]);
      setMouthRy(3.5);

      function frame(now: number) {
        if (cancelled) {
          return;
        }

        const elapsed = now - cycleStart;

        if (elapsed >= TOTAL_MS + RESULT_WAIT_MS) {
          runIndex = (runIndex + 1) % RUNS.length;
          timeoutIds.push(setTimeout(startRun, 0));
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

        const progress = elapsed / TOTAL_MS;
        const x = X_START + (X_END - X_START) * progress;
        const noteIndex = getActiveNoteIndex(x);
        const note = NOTES[noteIndex]!;
        const result = run[noteIndex]! as ResultKey;
        const targetY = getTargetY(x);
        const y = noisyY(targetY, elapsed, AMPLITUDES[result]);
        const color = COLORS[result];

        points.push({ x, y });

        if (traceRef.current) {
          const pathData = points
            .map((point, index) =>
              index === 0
                ? `M ${point.x} ${point.y}`
                : `L ${point.x} ${point.y}`,
            )
            .join(" ");
          traceRef.current.setAttribute("d", pathData);
          traceRef.current.setAttribute("stroke", color);
        }

        if (dotRef.current) {
          dotRef.current.setAttribute("cx", String(x));
          dotRef.current.setAttribute("cy", String(y));
          dotRef.current.setAttribute("fill", color);
        }

        if (noteIndex !== lastNoteIndex) {
          lastNoteIndex = noteIndex;
          setStatusLabel(`${note.name} · ${LABELS[result]}`);
          setStatusColor(color);
          setMouthRy(note.name === "La" ? 4.5 : 3.5);
        }

        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
    }

    startRun();

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
              className="arc-singing"
            />
            <path
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className="arc-singing arc-singing-delay-1"
            />
            <path
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className="arc-singing arc-singing-delay-2"
            />
          </svg>

          <div className="min-w-0 flex-1 overflow-hidden rounded-[10px] border border-border bg-bg-dark">
            <svg
              width="100%"
              viewBox="0 0 240 130"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 3%, transparent)"
              />
              <rect
                x="40"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 5%, transparent)"
              />
              <rect
                x="80"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 3%, transparent)"
              />
              <rect
                x="120"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 5%, transparent)"
              />
              <rect
                x="160"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 3%, transparent)"
              />
              <rect
                x="200"
                y="0"
                width="40"
                height="130"
                fill="color-mix(in srgb, var(--voz-config) 5%, transparent)"
              />

              <line x1="40" y1="0" x2="40" y2="130" stroke="var(--border)" strokeWidth="1" />
              <line x1="80" y1="0" x2="80" y2="130" stroke="var(--border)" strokeWidth="1" />
              <line x1="120" y1="0" x2="120" y2="130" stroke="var(--border)" strokeWidth="1" />
              <line x1="160" y1="0" x2="160" y2="130" stroke="var(--border)" strokeWidth="1" />
              <line x1="200" y1="0" x2="200" y2="130" stroke="var(--border)" strokeWidth="1" />

              <text
                x="6"
                y="22"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.7"
                fontFamily="system-ui"
                fontWeight="700"
              >
                La
              </text>
              <text
                x="6"
                y="47"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
                fontWeight="700"
              >
                Sol
              </text>
              <text
                x="6"
                y="72"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
                fontWeight="700"
              >
                Mi
              </text>
              <text
                x="6"
                y="97"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
                fontWeight="700"
              >
                Re
              </text>
              <text
                x="6"
                y="118"
                fontSize="7"
                fill="var(--tuner-in-tune)"
                opacity="0.55"
                fontFamily="system-ui"
                fontWeight="700"
              >
                Do
              </text>

              <line
                x1="20"
                y1="112"
                x2="38"
                y2="112"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <line
                x1="60"
                y1="66"
                x2="78"
                y2="66"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <line
                x1="100"
                y1="42"
                x2="118"
                y2="42"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <line
                x1="140"
                y1="18"
                x2="158"
                y2="18"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <line
                x1="180"
                y1="66"
                x2="198"
                y2="66"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />
              <line
                x1="220"
                y1="112"
                x2="238"
                y2="112"
                stroke="var(--tuner-in-tune)"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
              />

              <text
                x="22"
                y="106"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                Do
              </text>
              <text
                x="62"
                y="60"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                Mi
              </text>
              <text
                x="102"
                y="36"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                Sol
              </text>
              <text
                x="142"
                y="12"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                La
              </text>
              <text
                x="182"
                y="60"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                Mi
              </text>
              <text
                x="222"
                y="106"
                fontSize="8"
                fill="var(--voz-config)"
                fontFamily="system-ui"
                fontWeight="800"
                opacity="0.7"
              >
                Do
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
                cy="112"
                r="4"
                fill="var(--tuner-in-tune)"
              />
            </svg>
          </div>
        </div>

        <p className="mt-1 text-center text-xs leading-relaxed text-text-muted">
          Cada segmento es una nota distinta. La línea sigue tu voz.
        </p>
      </div>
    </div>
  );
}

type MelodiaHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MelodiaHelpModal({ open, onClose }: MelodiaHelpModalProps) {
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
        aria-label="Cerrar ayuda de Melodía"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="melodia-help-titulo"
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
              <MelodiaIcon />
            </div>
            <h2
              id="melodia-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Melodía
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <MelodiaHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <MelodiaConfigCard
                  label="¿Para qué sirve?"
                  text="Entrenás una melodía. Cada golpe del ciclo tiene una nota asignada que tenés que cantar al ritmo marcado. La app evalúa si cantaste la nota correcta en el momento justo."
                />
                <MelodiaConfigCard
                  label="Notas"
                  text="Para cada golpe elegís qué nota tenés que cantar. Eso define la melodía del ciclo."
                />
                <MelodiaConfigCard
                  label="Golpes"
                  text="Cuántos tiempos tiene el ciclo que se repite."
                />
                <MelodiaConfigCard
                  label="Figura"
                  text="Cuánto dura cada golpe. En este modo la figura es igual para todos los golpes."
                />
                <MelodiaConfigCard
                  label="Tempo"
                  text="La velocidad del ciclo."
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

export function MelodiaHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Melodía"
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
