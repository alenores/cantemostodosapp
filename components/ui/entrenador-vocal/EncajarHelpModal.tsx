"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { HelpCircle, Music2, Target, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ATTEMPTS = [
  {
    left: "50%",
    color: "var(--tuner-in-tune)",
    border: "var(--tuner-in-tune)",
    label: "¡En tono!",
  },
  {
    left: "68%",
    color: "var(--tuner-cerca)",
    border: "var(--tuner-cerca)",
    label: "Cerca",
  },
  {
    left: "26%",
    color: "var(--tuner-flat-sharp)",
    border: "var(--tuner-flat-sharp)",
    label: "Lejos",
  },
  {
    left: "54%",
    color: "var(--tuner-in-tune)",
    border: "var(--tuner-in-tune)",
    label: "¡En tono!",
  },
  {
    left: "78%",
    color: "var(--tuner-flat-sharp)",
    border: "var(--tuner-flat-sharp)",
    label: "Lejos",
  },
  {
    left: "62%",
    color: "var(--tuner-cerca)",
    border: "var(--tuner-cerca)",
    label: "Cerca",
  },
] as const;

const NEUTRAL_MARKER_COLOR = "var(--text-muted)";
const NEUTRAL_MARKER_BORDER = "var(--border)";

const HELP_ICON_CLASS = "size-4 shrink-0 text-[var(--voz-config)]";

function MicIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="10"
        cy="8"
        rx="4"
        ry="5"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
      />
      <path
        d="M6 8a4 4 0 0 0 8 0"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="10"
        y1="13"
        x2="10"
        y2="16"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="7"
        y1="16"
        x2="13"
        y2="16"
        stroke="var(--voz-config)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function triggerRingAnimation(element: HTMLDivElement | null) {
  if (!element) {
    return;
  }
  element.classList.remove("animating");
  void element.offsetWidth;
  element.classList.add("animating");
}

function EncajarHelpDemo() {
  const [statusLabel, setStatusLabel] = useState("Cantá una nota corta…");
  const [markerLeft, setMarkerLeft] = useState("50%");
  const [markerColor, setMarkerColor] = useState(NEUTRAL_MARKER_COLOR);
  const [markerBorder, setMarkerBorder] = useState(NEUTRAL_MARKER_BORDER);
  const [singing, setSinging] = useState(false);

  const ring1Ref = useRef<HTMLDivElement>(null);
  const ring2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];
    let attemptIndex = 0;
    let cancelled = false;

    function stopRings() {
      ring1Ref.current?.classList.remove("animating");
      ring2Ref.current?.classList.remove("animating");
    }

    function startRings() {
      triggerRingAnimation(ring1Ref.current);
      timeoutIds.push(
        setTimeout(() => {
          if (!cancelled) {
            triggerRingAnimation(ring2Ref.current);
          }
        }, 180),
      );
    }

    function runAttempt() {
      if (cancelled) {
        return;
      }

      const attempt = ATTEMPTS[attemptIndex]!;

      setStatusLabel("Cantando…");
      setMarkerLeft("50%");
      setMarkerColor(NEUTRAL_MARKER_COLOR);
      setMarkerBorder(NEUTRAL_MARKER_BORDER);
      setSinging(true);
      startRings();

      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) {
            return;
          }
          setMarkerLeft(attempt.left);
          setMarkerColor(attempt.color);
          setMarkerBorder(attempt.border);
          setStatusLabel(attempt.label);
          setSinging(false);
          stopRings();
        }, 900),
      );

      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) {
            return;
          }
          setMarkerLeft("50%");
          setStatusLabel("Cantá una nota corta…");
          setMarkerColor(NEUTRAL_MARKER_COLOR);
          setMarkerBorder(NEUTRAL_MARKER_BORDER);
        }, 2200),
      );

      timeoutIds.push(
        setTimeout(() => {
          if (cancelled) {
            return;
          }
          attemptIndex = (attemptIndex + 1) % ATTEMPTS.length;
          runAttempt();
        }, 2800),
      );
    }

    runAttempt();

    return () => {
      cancelled = true;
      for (const id of timeoutIds) {
        clearTimeout(id);
      }
      stopRings();
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

        <div className="relative mx-auto flex size-[52px] items-center justify-center">
          <div
            ref={ring1Ref}
            className="encajar-help-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <div
            ref={ring2Ref}
            className="encajar-help-ring pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          />
          <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="var(--bg-card)"
              stroke="var(--border)"
              strokeWidth="1.5"
            />
            <circle cx="19" cy="22" r="2.5" fill="var(--voz-config)" />
            <circle cx="33" cy="22" r="2.5" fill="var(--voz-config)" />
            <ellipse
              cx="26"
              cy={singing ? 34 : 33}
              rx={singing ? 8 : 7}
              ry={singing ? 5 : 3}
              fill="var(--voz-config)"
            />
          </svg>
        </div>

        <div>
          <div className="relative h-7 overflow-hidden rounded-full border border-border bg-bg-dark">
            <div
              className="pointer-events-none absolute inset-y-0 rounded-full"
              style={{
                left: "50%",
                width: "22%",
                transform: "translateX(-50%)",
                backgroundColor: "var(--tuner-in-tune)",
                opacity: 0.15,
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 rounded-full"
              style={{
                left: "31%",
                width: "16%",
                backgroundColor: "var(--tuner-cerca)",
                opacity: 0.1,
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 rounded-full"
              style={{
                left: "53%",
                width: "16%",
                backgroundColor: "var(--tuner-cerca)",
                opacity: 0.1,
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
              style={{
                backgroundColor: "var(--tuner-in-tune)",
                opacity: 0.4,
              }}
            />
            <span
              className="absolute top-1/2 size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,background-color,border-color] duration-300"
              style={{
                left: markerLeft,
                backgroundColor: markerColor,
                border: `2px solid ${markerBorder}`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-text-muted">
            <span>Más bajo</span>
            <span>Objetivo</span>
            <span>Más alto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

type EncajarHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function EncajarHelpModal({ open, onClose }: EncajarHelpModalProps) {
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
        aria-label="Cerrar ayuda de Encajar"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="encajar-help-titulo"
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
              <MicIcon />
            </div>
            <h2
              id="encajar-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Encajar
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <EncajarHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué tener en cuenta
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={
                    <Target
                      className={HELP_ICON_CLASS}
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  }
                  label="¿Para qué sirve?"
                  text="Entrenás tu voz para caer directo en una nota. Cantás un golpe corto y la app te dice al instante si le pegaste."
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
                  text="La nota que querés practicar. Activá 'octava exacta' para ser preciso con el registro, o desactivala para que valga cualquier octava."
                  shimmerDelayMs={220}
                />
              </div>
            </section>

            <div className="flex items-start gap-2">
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--voz-config)" }}
                aria-hidden="true"
              />
              <p className="text-[11px] text-text-muted">
                Cantá un golpe corto y soltá. No sostengas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EncajarHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Encajar"
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
