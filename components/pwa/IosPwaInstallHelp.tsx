"use client";

import AppLogoMark from "@/components/pwa/AppLogoMark";
import { isLikelyInAppBrowser } from "@/lib/pwa-platform";
import {
  PWA_HOME_ICON_LABEL,
  PWA_HOME_ICON_SRC,
} from "@/lib/pwa-home-label";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";

function IosInstallBanner({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-accent/40 bg-bg-card shadow-sm">
      {children}
    </div>
  );
}

function IconChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-4 w-4 shrink-0 text-accent transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InstallBannerToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-bg-card-hover ${
        !open ? "ios-install-pulse" : ""
      } ${open ? "bg-bg-card-hover" : "bg-bg-card"}`}
    >
      <AppLogoMark size={36} className="rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold leading-snug text-text-primary">
          Instalá la app para uso sin conexión
        </p>
        <p className="m-0 text-[10px] leading-snug text-text-muted">
          Seguí estos 3 pasos:
        </p>
      </div>
      <IconChevron expanded={open} />
    </button>
  );
}

function InstallBannerContent({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-2 border-t border-border p-3">{children}</div>
  );
}

function SafariInstallStepCard({
  number,
  visual,
  title,
  detail,
}: {
  number: number;
  visual: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-2 rounded-[10px] border border-border bg-bg-dark px-3 pb-3 pt-4">
      <span
        aria-hidden
        className="absolute left-2.5 top-2 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white"
      >
        {number}
      </span>
      <div className="flex min-h-[56px] items-center justify-center pt-1">{visual}</div>
      <p className="m-0 text-center text-[12px] font-semibold leading-snug text-text-primary">
        {title}
      </p>
      {detail ? (
        <p className="m-0 text-center text-[10px] italic leading-snug text-text-muted">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function SafariInstallStepsFooter() {
  return (
    <p className="m-0 px-1 pt-1 text-center text-[10px] italic leading-snug text-text-muted">
      Una vez instalada, usá siempre el ícono de inicio ({PWA_HOME_ICON_LABEL}). No hace falta
      entrar desde el link ni desde el navegador.
    </p>
  );
}

function SafariInstallSteps() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent-dim px-1 pb-2.5 pt-4">
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 inline-flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-bg-card bg-accent text-[11px] font-black text-white"
          >
            1
          </span>
          <div
            aria-hidden
            className="relative overflow-hidden rounded-[10px]"
            style={{
              width: 58,
              height: 78,
              background: "#1c1c1e",
              border: "2px solid #3a3a3c",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <div
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b"
              style={{ width: 18, height: 5, background: "#1c1c1e" }}
            />
            <div
              className="absolute inset-[3px] overflow-hidden rounded-[8px]"
              style={{ background: "#f2f2f7" }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg,#e3f2fd,#f3e5f5)", bottom: 18 }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-around"
                style={{ height: 18, background: "#fff", borderTop: "0.5px solid #d1d1d6" }}
              >
                <span style={{ fontSize: 7, color: "#8e8e93" }}>⬅</span>
                <span style={{ fontSize: 7, color: "#8e8e93" }}>➡</span>
                <div className="ios-share-btn relative">
                  <div
                    className="ios-share-ripple absolute inset-[-4px] rounded-full"
                    style={{ border: "1.5px solid #378ADD" }}
                  />
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 3v9" stroke="#378ADD" strokeWidth="2.5" strokeLinecap="round" />
                    <path
                      d="M9 6l3-3 3 3"
                      stroke="#378ADD"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <rect x="5" y="13" width="14" height="8" rx="2" stroke="#378ADD" strokeWidth="2" />
                  </svg>
                </div>
                <span style={{ fontSize: 7, color: "#8e8e93" }}>⊡</span>
                <span style={{ fontSize: 7, color: "#8e8e93" }}>☰</span>
              </div>
              <div
                className="ios-finger absolute z-20"
                style={{
                  bottom: 12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 14,
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                }}
              >
                👆
              </div>
            </div>
          </div>
          <p className="m-0 text-center text-[10.5px] font-bold leading-snug text-text-primary">
            Tocá
            <br />
            Compartir
          </p>
          <p className="m-0 text-center text-[9px] italic leading-snug text-text-muted">
            Barra de abajo
            <br />
            de Safari
          </p>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent-dim px-1 pb-2.5 pt-4">
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 inline-flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-bg-card bg-accent text-[11px] font-black text-white"
          >
            2
          </span>
          <div
            aria-hidden
            className="relative overflow-hidden rounded-[10px]"
            style={{
              width: 58,
              height: 78,
              background: "#1c1c1e",
              border: "2px solid #3a3a3c",
            }}
          >
            <div
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b"
              style={{ width: 18, height: 5, background: "#1c1c1e" }}
            />
            <div
              className="absolute inset-[3px] overflow-hidden rounded-[8px]"
              style={{ background: "#f2f2f7" }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(135deg,#e3f2fd,#f3e5f5)", bottom: 18 }}
              />
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height: 18, background: "#fff", borderTop: "0.5px solid #d1d1d6" }}
              />
              <div
                className="ios-menu absolute bottom-[18px] left-0 right-0 rounded-t-lg"
                style={{
                  background: "rgba(255,255,255,0.97)",
                  padding: "4px 4px 2px",
                  boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <div
                  style={{
                    fontSize: 5,
                    color: "#8e8e93",
                    textAlign: "center",
                    paddingBottom: 3,
                    borderBottom: "0.5px solid #e5e5ea",
                    marginBottom: 2,
                  }}
                >
                  Compartir
                </div>
                <div className="ios-menu-item flex items-center gap-1.5 rounded px-1 py-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="3" width="7" height="7" rx="1" fill="#D4D4D8" />
                    <rect x="14" y="3" width="7" height="7" rx="1" fill="#D4D4D8" />
                    <rect x="3" y="14" width="7" height="7" rx="1" fill="#D4D4D8" />
                    <rect x="14" y="14" width="7" height="7" rx="1" stroke="#f4845f" strokeWidth="1.5" />
                    <path d="M16 17h3M17.5 15.5v3" stroke="#f4845f" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 5.5, fontWeight: 600, color: "#1c1c1e", lineHeight: 1.2 }}>
                    Agregar a
                    <br />
                    pantalla de inicio
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="m-0 text-center text-[10.5px] font-bold leading-snug text-text-primary">
            Elegí
            <br />
            Agregar a inicio
          </p>
          <p className="m-0 text-center text-[9px] italic leading-snug text-text-muted">
            Luego tocá
            <br />
            Agregar
          </p>
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border border-dashed border-accent/50 bg-accent-dim px-1 pb-2.5 pt-4">
          <span
            aria-hidden
            className="absolute -top-2.5 left-1/2 inline-flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-bg-card bg-accent text-[11px] font-black text-white"
          >
            3
          </span>
          <div
            aria-hidden
            className="relative overflow-hidden rounded-[10px]"
            style={{
              width: 58,
              height: 78,
              background: "#1c1c1e",
              border: "2px solid #3a3a3c",
            }}
          >
            <div
              className="absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-b"
              style={{ width: 18, height: 5, background: "#1c1c1e" }}
            />
            <div
              className="absolute inset-[3px] overflow-hidden rounded-[8px]"
              style={{ background: "linear-gradient(135deg,#667eea,#764ba2)" }}
            >
              <div
                className="absolute inset-0 grid p-1.5 pt-2"
                style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 3, alignContent: "start" }}
              >
                {["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4"].map((color) => (
                  <div key={color} className="flex flex-col items-center gap-0.5">
                    <div className="rounded-[3px] opacity-50" style={{ width: 14, height: 14, background: color }} />
                    <div
                      className="rounded-sm opacity-40"
                      style={{ width: 10, height: 2, background: "rgba(255,255,255,0.6)" }}
                    />
                  </div>
                ))}
                <div className="ios-icon-pop flex flex-col items-center gap-0.5">
                  <div className="relative h-4 w-4 overflow-hidden rounded-[4px] border border-border">
                    <Image src={PWA_HOME_ICON_SRC} alt="" fill className="object-cover" sizes="16px" />
                    <div
                      className="ios-icon-shine absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg,transparent,rgba(255,255,255,0.7),transparent)",
                      }}
                    />
                  </div>
                  <span
                    className="max-w-[18px] text-center leading-none"
                    style={{
                      fontSize: 3.5,
                      fontWeight: 700,
                      color: "white",
                      textShadow: "0 0.5px 1px rgba(0,0,0,0.4)",
                    }}
                  >
                    {PWA_HOME_ICON_LABEL}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p className="m-0 text-center text-[10.5px] font-bold leading-snug text-text-primary">
            Buscá este
            <br />
            ícono
          </p>
          <p className="m-0 text-center text-[9px] italic leading-snug text-text-muted">
            En tu pantalla
            <br />
            de inicio
          </p>
        </div>
      </div>

      <SafariInstallStepsFooter />
    </div>
  );
}

function InAppBrowserMenuLargeIcon() {
  return (
    <span
      aria-hidden
      className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-bg-card"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="5" r="1.8" fill="#378ADD" />
        <circle cx="12" cy="12" r="1.8" fill="#378ADD" />
        <circle cx="12" cy="19" r="1.8" fill="#378ADD" />
      </svg>
    </span>
  );
}

function InAppBrowserInstallSteps() {
  return (
    <div className="space-y-2">
      <SafariInstallStepCard
        number={1}
        visual={<InAppBrowserMenuLargeIcon />}
        title={
          <>
            Tocá los <span className="font-bold">tres puntitos ⋮</span> o el ícono de Safari
          </>
        }
        detail={
          <>
            y elegí{" "}
            <span className="font-semibold not-italic">&apos;Abrir en Safari&apos;</span> o{" "}
            <span className="font-semibold not-italic">&apos;Abrir en navegador externo&apos;</span>.
            <br />
            Desde ahí se completa la instalación
          </>
        }
      />
      <p className="m-0 px-1 text-center text-[10px] italic leading-snug text-text-muted">
        Instagram, WhatsApp y otras apps abren los links en su propio navegador. Para instalar la
        app se necesita estar en un navegador tradicional.
      </p>
    </div>
  );
}

function readInAppBrowserInitial(): boolean {
  if (typeof window === "undefined") return false;
  return isLikelyInAppBrowser();
}

export default function IosPwaInstallHelp() {
  const [fromInAppBrowser, setFromInAppBrowser] = useState(readInAppBrowserInitial);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setFromInAppBrowser(isLikelyInAppBrowser());
  }, []);

  return (
    <IosInstallBanner>
      <InstallBannerToggle open={open} onToggle={() => setOpen((current) => !current)} />
      {open ? (
        <InstallBannerContent>
          {fromInAppBrowser ? <InAppBrowserInstallSteps /> : <SafariInstallSteps />}
        </InstallBannerContent>
      ) : null}
    </IosInstallBanner>
  );
}
