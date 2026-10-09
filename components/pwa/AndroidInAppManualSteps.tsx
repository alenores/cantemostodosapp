"use client";

import type { CSSProperties } from "react";

const ANDROID_IN_APP_MANUAL_STEPS = [
  { id: "menu", label: "Menú ⋮ (arriba a la derecha)" },
  { id: "chrome", label: "Abrir en Chrome" },
  { id: "install", label: "Instalar App" },
] as const;

/** Desde Samsung Internet u otro navegador el menú no tiene «Abrir en Chrome»: se pasa el link. */
const OTRO_NAVEGADOR_MANUAL_STEPS = [
  { id: "copy", label: "Copiá el link (botón de abajo)" },
  { id: "chrome", label: "Abrí Chrome y pegalo arriba" },
  { id: "install", label: "Instalar App" },
] as const;

type AndroidInAppManualStepsProps = {
  /** Navegador del teléfono que no es Chrome, en vez de un visor embebido. */
  otroNavegador?: boolean;
};

/** Pasos a mano si Chrome no se abrió (solo la cajita de 3 pasos). */
export function AndroidInAppManualSteps({ otroNavegador = false }: AndroidInAppManualStepsProps = {}) {
  const pasos = otroNavegador ? OTRO_NAVEGADOR_MANUAL_STEPS : ANDROID_IN_APP_MANUAL_STEPS;
  return (
    <div className="in-app-manual-fallback android-install-manual-reveal" aria-live="polite">
      <p className="in-app-manual-fallback-title">¿No se abrió Chrome?</p>
      <p className="in-app-manual-fallback-lead">Hacelo en 3 pasos:</p>

      <ol className="in-app-manual-fallback-steps">
        {pasos.map((step, index) => (
          <li
            key={step.id}
            className="in-app-manual-fallback-step"
            style={{ "--step-index": index } as CSSProperties}
          >
            <span className="in-app-manual-fallback-step-num" aria-hidden>
              {index + 1}
            </span>
            <span className="in-app-manual-fallback-step-label">{step.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
