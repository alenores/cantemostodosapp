"use client";

import { HelpInfoCard } from "@/components/ui/HelpInfoCard";
import { HelpCircle, Timer, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const BEAT_MS = 560;
const BEAT_PATTERN = [true, false, true, true, false, true] as const;

const HELP_ICON_CLASS = "size-4 shrink-0 text-[var(--voz-config)]";

function RitmoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="10" width="5" height="9" rx="1.5" fill="var(--voz-config)" />
      <rect
        x="9.5"
        y="6"
        width="5"
        height="13"
        rx="1.5"
        fill="var(--voz-config)"
        opacity="0.2"
      />
      <rect x="17" y="10" width="5" height="9" rx="1.5" fill="var(--voz-config)" />
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

function ContenidoConceptIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect x="2" y="10" width="5" height="9" rx="1.5" fill="var(--voz-config)" />
      <rect
        x="9.5"
        y="6"
        width="5"
        height="13"
        rx="1.5"
        fill="var(--voz-config)"
        opacity="0.2"
      />
      <rect x="17" y="10" width="5" height="9" rx="1.5" fill="var(--voz-config)" />
    </svg>
  );
}

function RitmoHelpDemo() {
  const [beatIndex, setBeatIndex] = useState(0);
  const [singing, setSinging] = useState<boolean>(BEAT_PATTERN[0]);

  useEffect(() => {
    let cancelled = false;
    const timeoutIds: ReturnType<typeof setTimeout>[] = [];

    function tick() {
      if (cancelled) {
        return;
      }

      setBeatIndex((prev) => {
        const next = (prev + 1) % BEAT_PATTERN.length;
        setSinging(BEAT_PATTERN[next]!);
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

  const statusLabel = singing ? "Cantá" : "Silencio";
  const statusColor = singing ? "var(--voz-config)" : "var(--text-muted)";

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
          {statusLabel}
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
              style={{ opacity: singing ? undefined : 0.2 }}
            />
            <path
              d="M50 24 Q60 30 50 40"
              stroke="var(--voz-config)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              className={singing ? "arc-singing arc-singing-delay-1" : ""}
              style={{ opacity: singing ? undefined : 0.2 }}
            />
            <path
              d="M54 20 Q67 30 54 44"
              stroke="var(--voz-config)"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              className={singing ? "arc-singing arc-singing-delay-2" : ""}
              style={{ opacity: singing ? undefined : 0.2 }}
            />
          </svg>

          <div className="min-w-0 flex-1">
            <div className="flex h-10 items-stretch gap-1.5">
              {BEAT_PATTERN.map((isCantar, index) => {
                const active = index === beatIndex;

                if (isCantar) {
                  return (
                    <div
                      key={index}
                      className={`flex flex-1 items-center justify-center rounded-[6px] transition-all duration-100 ${
                        active
                          ? "scale-y-110 border border-[var(--voz-config)] bg-[color-mix(in_srgb,var(--voz-config)_75%,transparent)]"
                          : "border border-[color-mix(in_srgb,var(--voz-config)_30%,transparent)] bg-[color-mix(in_srgb,var(--voz-config)_18%,transparent)]"
                      }`}
                    />
                  );
                }

                return (
                  <div
                    key={index}
                    className={`flex flex-1 items-center justify-center rounded-[6px] border transition-all duration-100 ${
                      active
                        ? "border-border/60 bg-bg-card"
                        : "border-border bg-bg-dark"
                    }`}
                  >
                    <VolumeX
                      className={`size-3 text-text-muted ${active ? "opacity-80" : "opacity-50"}`}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>

            <div className="relative mt-1.5 h-0.5 w-full rounded-full bg-border">
              <div
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--voz-config)] transition-[left] duration-100"
                style={{ left: `${(beatIndex / BEAT_PATTERN.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RitmoHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RitmoHelpModal({ open, onClose }: RitmoHelpModalProps) {
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
        aria-label="Cerrar ayuda de Ritmo"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ritmo-help-titulo"
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
              <RitmoIcon />
            </div>
            <h2
              id="ritmo-help-titulo"
              className="text-xl font-extrabold text-text-primary"
            >
              Ritmo
            </h2>
            <p className="text-center text-xs text-text-muted">
              Entrenador vocal · cómo funciona este modo
            </p>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col touch-pan-y overflow-y-auto overscroll-y-contain px-4 py-4">
          <div className="space-y-3">
            <RitmoHelpDemo />

            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                Qué configurar
              </h3>
              <div className="mt-2 space-y-2">
                <HelpInfoCard
                  icon={<RitmoIcon />}
                  label="¿Para qué sirve?"
                  text="Entrenás cuándo cantar y cuándo callar. La app reproduce un patrón rítmico y vos tenés que seguirlo. No se evalúa ni la nota ni el volumen."
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
                  icon={<ContenidoConceptIcon />}
                  label="Contenido"
                  text="Para cada golpe elegís si hay que cantar o callar"
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

export function RitmoHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda para el modo Ritmo"
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
