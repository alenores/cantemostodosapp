"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AndroidInAppBrowserInstallHelp } from "@/components/pwa/AndroidInAppBrowserInstallHelp";
import { IosInAppInstallHelp } from "@/components/pwa/IosInAppInstallHelp";
import { IosInstallCta } from "@/components/pwa/IosInstallScreen";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  clearInstallPrompt,
  getInstallPromptSnapshot,
  subscribeInstallPrompt,
} from "@/lib/pwa-install-prompt";
import {
  isIphoneForPwaInstall,
  isLikelyInAppBrowser,
  navegadorAndroidQueNoEsChrome,
} from "@/lib/pwa-platform";
import {
  beginInstallFeedbackCooldown,
  clearInstallFeedbackCooldown,
  INSTALL_FEEDBACK_DELAY_MS,
  markPwaOnDeviceFromInstallEvent,
  notifyPwaOnDeviceChanged,
} from "@/lib/pwa-on-device";
import { linkWhatsappSoporte } from "@/lib/soporte";

type Panel = "ios" | "ios-inapp" | "android-inapp" | "android-ayuda" | null;

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M20.5 3.5A11.6 11.6 0 0 0 2.1 17.4L1 23l5.8-1.5a11.5 11.5 0 0 0 5.2 1.3h.1A11.6 11.6 0 0 0 20.5 3.5Zm-8.4 17.3a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.4.9.9-3.3-.2-.4a9.6 9.6 0 1 1 8 4.3Zm5.3-7.2c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.8.2l-.6.8c-.2.2-.3.3-.6.1s-1.2-.4-2.2-1.3c-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.6l.4-.4.3-.5c.1-.2.1-.4 0-.6s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.7 1.1 3.1 1.2 3.3c.2.2 2.2 3.5 5.4 4.9.8.3 1.4.5 1.9.6.8.3 1.5.2 2 .1.6-.1 1.8-.8 2.1-1.5.2-.8.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

function PanelInstalacion({
  children,
  onClose,
  etiqueta,
}: {
  children: React.ReactNode;
  onClose: () => void;
  etiqueta: string;
}) {
  const [montado, setMontado] = useState(false);
  useHardwareBack(true, onClose);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={etiqueta}
      className="pwa-install-tema fixed inset-0 z-[500] flex flex-col overflow-y-auto bg-[var(--chalk)] px-5 py-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
      }}
    >
      <div className="mb-4 flex justify-end">
        <TapButton
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white"
        >
          <X size={19} strokeWidth={2.4} />
        </TapButton>
      </div>
      {children}
    </div>,
    document.body,
  );
}

export default function InstallHomeButton() {
  const installPrompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPromptSnapshot, () => null);
  const [panel, setPanel] = useState<Panel>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [otroNavegador, setOtroNavegador] = useState<"samsung" | "otro" | null>(null);
  const [iphone, setIphone] = useState(false);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setIphone(isIphoneForPwaInstall());
    setInApp(isLikelyInAppBrowser());
    setOtroNavegador(navegadorAndroidQueNoEsChrome());
  }, []);

  const instalarEnChrome = async () => {
    if (!installPrompt) {
      setPanel("android-ayuda");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      beginInstallFeedbackCooldown(INSTALL_FEEDBACK_DELAY_MS);
      clearInstallPrompt();
      setIsInstalling(true);
      try {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, INSTALL_FEEDBACK_DELAY_MS);
        });
      } finally {
        setIsInstalling(false);
        markPwaOnDeviceFromInstallEvent();
        clearInstallFeedbackCooldown();
        notifyPwaOnDeviceChanged();
      }
    } else {
      clearInstallPrompt();
    }
  };

  const onClick = () => {
    if (iphone && inApp) {
      setPanel("ios-inapp");
      return;
    }
    if (iphone) {
      setPanel("ios");
      return;
    }
    if (inApp || otroNavegador) {
      setPanel("android-inapp");
      return;
    }
    void instalarEnChrome();
  };

  if (isInstalling) {
    return (
      <div
        className="pwa-install-tema flex flex-col items-center gap-2.5 rounded-2xl border-[1.5px] border-[var(--chalk-dark)] bg-[var(--chalk-mid)] px-4 py-5 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="m-0 text-[13px] font-medium text-[var(--rock)]">Instalando la app…</p>
        <p className="m-0 text-[11px] text-[var(--rock-mid)]">Esto tarda solo un momento</p>
        <div
          className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--chalk-dark)]"
          aria-hidden="true"
        >
          <div className="progress-bar-indeterminate h-1.5 w-[38%] rounded-full bg-[var(--chapa)]" />
        </div>
      </div>
    );
  }

  const whatsappAndroid = linkWhatsappSoporte("Hola !!\nNo logro instalar la app en mi Android");

  return (
    <>
      <TapButton
        type="button"
        onClick={onClick}
        className="w-full rounded-xl bg-accent px-4 py-[13px] text-sm font-bold text-white shadow-lg active:scale-[0.98]"
      >
        Instalá la app
      </TapButton>

      <IosInstallCta abierta={panel === "ios"} onClose={() => setPanel(null)} />

      {panel === "ios-inapp" ? (
        <PanelInstalacion etiqueta="Cómo instalar la app" onClose={() => setPanel(null)}>
          <IosInAppInstallHelp />
        </PanelInstalacion>
      ) : null}

      {panel === "android-inapp" ? (
        <PanelInstalacion etiqueta="Abrí la app en Chrome" onClose={() => setPanel(null)}>
          <AndroidInAppBrowserInstallHelp otroNavegador={inApp ? null : otroNavegador} />
        </PanelInstalacion>
      ) : null}

      {panel === "android-ayuda" ? (
        <PanelInstalacion etiqueta="No se puede instalar todavía" onClose={() => setPanel(null)}>
          <div className="rounded-2xl border border-[var(--chalk-dark)] bg-[var(--chalk-mid)] px-4 py-5 text-center">
            <p className="m-0 text-[15px] font-semibold text-[var(--rock)]">Instalá la app</p>
            <a
              href={whatsappAndroid}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-[var(--rock-mid)] underline-offset-2"
            >
              <IconoWhatsApp className="h-3.5 w-3.5 shrink-0 fill-current text-[#25D366]" />
              ¿No podés instalarla? Escribime por WhatsApp
            </a>
          </div>
        </PanelInstalacion>
      ) : null}
    </>
  );
}
