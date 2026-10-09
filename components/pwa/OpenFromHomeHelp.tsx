"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PWA_HOME_ICON_LABEL, PWA_HOME_ICON_SRC } from "@/lib/pwa-home-label";
import { clearEverOpenedStandaloneMark } from "@/lib/pwa-platform";
import {
  clearInstallFeedbackCooldown,
  clearPwaOnDeviceMarks,
  notifyPwaOnDeviceChanged,
} from "@/lib/pwa-on-device";

const STEP_MS = 2400;
const INITIAL_DELAY_MS = 1200;
type SpotlightPhase = -1 | 0 | 1 | 2 | "done";

type OpenFromHomeHelpProps = {
  platform: "ios" | "android";
  /** iPhone: distingue salir de Safari o cerrar WhatsApp. Android usa el mismo texto. */
  inAppBrowser?: boolean;
};

function readReducedMotionPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function phraseStateClass(
  phase: SpotlightPhase,
  index: 0 | 1 | 2,
  reduceMotion: boolean,
  baseClass: string,
): string {
  if (reduceMotion || phase === "done") {
    return `${baseClass} open-from-home-phrase open-from-home-phrase-settled`;
  }
  if (phase === index) {
    return `${baseClass} open-from-home-phrase open-from-home-phrase-active`;
  }
  return `${baseClass} open-from-home-phrase open-from-home-phrase-idle`;
}

function leavePhrase(platform: "ios" | "android", inAppBrowser: boolean): ReactNode {
  if (platform === "android") {
    return (
      <>
        <strong>Salí</strong> de este navegador
      </>
    );
  }
  return inAppBrowser ? (
    <>
      <strong>Cerrá</strong> esta app (WhatsApp, etc.)
    </>
  ) : (
    <>
      <strong>Salí</strong> de Safari
    </>
  );
}

function reiniciarInstalacion() {
  clearPwaOnDeviceMarks();
  clearEverOpenedStandaloneMark();
  clearInstallFeedbackCooldown();
  notifyPwaOnDeviceChanged();
}

/** La app ya está en el teléfono, pero la abrieron desde un link. */
export function OpenFromHomeHelp({ platform, inAppBrowser = false }: OpenFromHomeHelpProps) {
  const [reduceMotion, setReduceMotion] = useState(readReducedMotionPreference);
  const [phase, setPhase] = useState<SpotlightPhase>(() =>
    readReducedMotionPreference() ? "done" : -1,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      const prefersReduced = media.matches;
      setReduceMotion(prefersReduced);
      if (prefersReduced) {
        setPhase("done");
      }
    };

    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const stepZero = window.setTimeout(() => setPhase(0), INITIAL_DELAY_MS);
    const stepOne = window.setTimeout(() => setPhase(1), INITIAL_DELAY_MS + STEP_MS);
    const stepTwo = window.setTimeout(() => setPhase(2), INITIAL_DELAY_MS + STEP_MS * 2);
    const finish = window.setTimeout(() => setPhase("done"), INITIAL_DELAY_MS + STEP_MS * 3);

    return () => {
      window.clearTimeout(stepZero);
      window.clearTimeout(stepOne);
      window.clearTimeout(stepTwo);
      window.clearTimeout(finish);
    };
  }, [reduceMotion]);

  const iconHighlighted = !reduceMotion && phase === 2;

  return (
    <div
      className="rounded-2xl border-[1.5px] border-emerald-500/40 bg-[var(--chalk-mid)] px-4 py-5 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3.5 flex justify-center">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 transition-all duration-700 ease-out ${
            phase === -1 && !reduceMotion ? "scale-110 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "scale-100 shadow-none"
          }`}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className={`transition-transform duration-700 delay-75 ease-out ${
              phase === -1 && !reduceMotion ? "scale-110" : "scale-100"
            }`}
          >
            <path
              d="M6 14l5.5 5.5L22 8"
              stroke="#34d399"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="mx-auto flex max-w-[280px] flex-col gap-1.5">
        <p
          className={phraseStateClass(
            phase,
            0,
            reduceMotion,
            "m-0 px-2 py-1.5 text-[17px] font-semibold open-from-home-phrase-title",
          )}
        >
          App instalada
        </p>
        <p
          className={phraseStateClass(
            phase,
            1,
            reduceMotion,
            "m-0 px-2 py-1.5 leading-relaxed open-from-home-phrase-body",
          )}
        >
          {leavePhrase(platform, inAppBrowser)}
        </p>
        <p
          className={phraseStateClass(
            phase,
            2,
            reduceMotion,
            "m-0 px-2 py-1.5 leading-relaxed open-from-home-phrase-body",
          )}
        >
          Buscá el <strong>Icono</strong> de la APP:
        </p>
      </div>

      <div className="mb-5 mt-4 flex justify-center">
        <div className="flex flex-col items-center gap-2">
          <div
            className={`open-from-home-icon-focus h-16 w-16 overflow-hidden rounded-[14px] border border-[var(--chalk-dark)] shadow-sm ${
              iconHighlighted ? "is-active" : ""
            }`}
          >
            <img
              src={PWA_HOME_ICON_SRC}
              alt="Icono de la app"
              className="h-full w-full object-cover"
            />
          </div>
          <p
            className={`m-0 text-[11px] font-semibold transition-colors duration-300 ${
              iconHighlighted ? "text-emerald-300" : "text-emerald-400"
            }`}
          >
            {PWA_HOME_ICON_LABEL}
          </p>
        </div>
      </div>

      <p className="m-0 text-[11px] italic leading-relaxed text-[var(--rock-light)]">
        La app ya te queda instalada y con el icono, lista para usar SIN conexión. No es necesario entrar desde un
        link o por el navegador.
      </p>

      <div className="mt-5 border-t border-emerald-500/30 pt-3.5 text-center">
        <button
          type="button"
          onClick={reiniciarInstalacion}
          className="cursor-pointer text-xs font-medium text-emerald-300 underline decoration-emerald-500/50 underline-offset-2"
        >
          ¿Desinstalaste la app o no encontrás el ícono? Reinstalar aquí
        </button>
      </div>
    </div>
  );
}
