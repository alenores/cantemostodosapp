"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChromeIntentFallbackReveal } from "@/hooks/useChromeIntentFallbackReveal";
import { AndroidInAppManualSteps } from "@/components/pwa/AndroidInAppManualSteps";
import { OfflineIcon } from "@/components/pwa/OfflineIcon";
import { TapButton } from "@/components/ui/TapFeedback";
import { ANDROID_IN_APP_CHROME_INTENT_WAIT_MS } from "@/lib/pwa-open-in-chrome";

const COPY_FEEDBACK_MS = 2000;

type AndroidInAppBrowserInstallHelpProps = {
  /**
   * Navegador del teléfono que no es Chrome. Samsung Internet instala un paquete
   * que el teléfono bloquea; los demás no instalan.
   */
  otroNavegador?: "samsung" | "otro" | null;
};

/**
 * Android fuera de Chrome (WhatsApp, Instagram, Samsung u otro navegador):
 * primero abre Chrome. Los pasos a mano aparecen solo si eso no funciona.
 */
export function AndroidInAppBrowserInstallHelp({
  otroNavegador = null,
}: AndroidInAppBrowserInstallHelpProps = {}) {
  const { manualRevealed, attempting, startAttempt } = useChromeIntentFallbackReveal(
    ANDROID_IN_APP_CHROME_INTENT_WAIT_MS,
  );
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [copiaManual, setCopiaManual] = useState<string | null>(null);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current !== null) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  const copyAppLink = useCallback(async () => {
    const url = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopyConfirmed(true);
        setCopiaManual(null);
        if (copyFeedbackTimerRef.current !== null) {
          clearTimeout(copyFeedbackTimerRef.current);
        }
        copyFeedbackTimerRef.current = setTimeout(() => {
          setCopyConfirmed(false);
          copyFeedbackTimerRef.current = null;
        }, COPY_FEEDBACK_MS);
        return;
      }
    } catch {
      // Si no se puede copiar solo, se muestra el link para copiarlo a mano.
    }

    setCopiaManual(url);
  }, []);

  const chromeButtonLabel = attempting ? "Abriendo Chrome…" : "Abrí en Chrome";

  return (
    <div className="android-install-banner android-install-enter rounded-2xl px-4 py-5 text-center">
      <div className="in-app-install-intro mb-4 text-left">
        <p className="in-app-install-intro-title m-0">Instalá la app</p>
        <p className="in-app-install-intro-offline m-0">
          <OfflineIcon className="in-app-install-intro-offline-icon" />
          Uso offline
        </p>
        {!manualRevealed ? (
          <p className="in-app-install-intro-body m-0">
            {otroNavegador === "samsung"
              ? "Estás en el navegador de Samsung. La app se instala desde Chrome:"
              : otroNavegador === "otro"
                ? "La app se instala desde Chrome. Abrila ahí:"
                : "Estás en el navegador de Instagram o WhatsApp. Abrí desde Chrome:"}
          </p>
        ) : null}
      </div>

      <div className={!attempting && !manualRevealed ? "preinstall-install-cta-ring" : undefined}>
        <TapButton
          type="button"
          className={`relative z-[1] w-full rounded-xl border border-[var(--install-cta)] bg-[var(--install-cta)] py-3 text-[13px] font-semibold text-white hover:border-[var(--install-cta-hover)] hover:bg-[var(--install-cta-hover)]${
            manualRevealed ? " opacity-95" : ""
          }`}
          onClick={startAttempt}
          aria-label={chromeButtonLabel}
        >
          {chromeButtonLabel}
        </TapButton>
      </div>

      {manualRevealed ? (
        <>
          <AndroidInAppManualSteps otroNavegador={Boolean(otroNavegador)} />
          {!otroNavegador ? (
            <p className="in-app-manual-copy-hint m-0">Si no, copiá el link y pegalo en Chrome</p>
          ) : null}
          <TapButton
            type="button"
            className="in-app-manual-fallback-copy"
            onClick={() => {
              void copyAppLink();
            }}
            aria-label={copyConfirmed ? "Link copiado" : "Copiar link de la app"}
          >
            {copyConfirmed ? "¡Copiado!" : "Copiar link"}
          </TapButton>
          {copiaManual ? (
            <div className="mt-3 text-left">
              <p className="m-0 text-[13px] font-semibold text-[var(--rock)]">Copiá el link</p>
              <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--rock-mid)]">
                Mantené apretado el link para copiarlo y abrilo en Chrome:
              </p>
              <p className="m-0 mt-2 break-all text-xs text-[var(--rock)]">{copiaManual}</p>
              <TapButton
                type="button"
                className="mt-3 text-xs font-semibold text-[var(--chapa)]"
                onClick={() => setCopiaManual(null)}
              >
                Listo
              </TapButton>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
