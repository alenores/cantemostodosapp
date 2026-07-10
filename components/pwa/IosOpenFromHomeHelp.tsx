"use client";

import AppLogoMark from "@/components/pwa/AppLogoMark";
import { PWA_HOME_ICON_LABEL } from "@/lib/pwa-home-label";

const STEPS_SAFARI = [
  {
    title: "Cerrá Safari o esta pestaña",
    detail: "Salí del navegador y volvé a la pantalla de inicio de tu iPhone.",
  },
  {
    title: "Buscá el ícono de la app",
    detail: `Se llama ${PWA_HOME_ICON_LABEL}, con el logo de CantemosTodos.`,
  },
] as const;

const STEPS_IN_APP = [
  {
    title: "Cerrá esta app (WhatsApp, etc.)",
    detail: "Volvé a la pantalla de inicio de tu iPhone.",
  },
  {
    title: "Buscá el ícono de la app",
    detail: `Se llama ${PWA_HOME_ICON_LABEL}, con el logo de CantemosTodos.`,
  },
] as const;

function HomeScreenIllustration() {
  return (
    <div
      className="mx-auto flex w-full max-w-[220px] justify-center rounded-[18px] border border-border bg-bg-dark px-4 py-4 shadow-sm"
      aria-hidden
    >
      <svg viewBox="0 0 200 240" className="h-[168px] w-full max-w-[180px]">
        <rect x="24" y="8" width="152" height="224" rx="22" fill="#2a2a2a" stroke="var(--accent)" strokeWidth="2" />
        <rect x="36" y="22" width="128" height="18" rx="9" fill="#333" />
        <circle cx="100" cy="31" r="2.5" fill="var(--accent)" />
        <rect x="44" y="56" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="86" y="56" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="128" y="56" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="44" y="96" width="28" height="28" rx="7" fill="#3a3a3a" />
        <g>
          <rect x="82" y="92" width="36" height="36" rx="10" fill="#252525" stroke="var(--accent)" strokeWidth="2.5" />
          <rect x="88" y="98" width="24" height="24" rx="6" fill="#3a2a22" />
          <path
            d="M94 110h12M100 104v12"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="100" cy="110" r="18" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="3 4" />
        </g>
        <rect x="128" y="96" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="44" y="136" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="86" y="136" width="28" height="28" rx="7" fill="#3a3a3a" />
        <rect x="128" y="136" width="28" height="28" rx="7" fill="#3a3a3a" />
        <text
          x="100"
          y="206"
          textAnchor="middle"
          fill="var(--accent)"
          fontSize="11"
          fontWeight="600"
          fontFamily="Arial, Helvetica, sans-serif"
        >
          {PWA_HOME_ICON_LABEL}
        </text>
        <rect x="62" y="188" width="76" height="10" rx="5" fill="#3a2a22" />
      </svg>
    </div>
  );
}

function OpenFromHomeStep({
  number,
  title,
  detail,
}: {
  number: number;
  title: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-2.5 rounded-[10px] border border-border bg-bg-dark px-3 py-2.5 text-left">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white"
      >
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[12px] font-medium leading-snug text-text-primary">{title}</p>
        <p className="m-0 mt-0.5 text-[11px] leading-snug text-text-muted">{detail}</p>
      </div>
    </li>
  );
}

type IosOpenFromHomeHelpProps = {
  inAppBrowser?: boolean;
};

export default function IosOpenFromHomeHelp({
  inAppBrowser = false,
}: IosOpenFromHomeHelpProps) {
  const steps = inAppBrowser ? STEPS_IN_APP : STEPS_SAFARI;

  return (
    <div
      className="rounded-2xl border border-emerald-500/40 bg-bg-card px-4 py-5 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mb-3.5 flex justify-center">
        <div className="inline-flex items-center gap-2.5 rounded-[14px] border border-border bg-bg-dark px-4 py-2.5 shadow-sm">
          <AppLogoMark size={44} />
          <div className="text-left">
            <p className="m-0 text-[13px] font-medium leading-snug text-text-primary">
              CantemosTodos
            </p>
            <p className="m-0 text-[11px] text-emerald-400">App en tu iPhone</p>
          </div>
        </div>
      </div>

      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M5 8l2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        App ya en tu iPhone
      </div>

      <p className="m-0 mb-1 text-[15px] font-semibold text-text-primary">
        Abrila desde el ícono de inicio
      </p>
      <p className="m-0 mb-4 text-xs leading-relaxed text-text-secondary">
        Estás en el navegador. Para usarla sin conexión, abrila desde la pantalla de inicio —
        buscá {PWA_HOME_ICON_LABEL}.
      </p>

      <HomeScreenIllustration />

      <ol className="m-0 mt-4 flex list-none flex-col gap-2 p-0">
        {steps.map((step, index) => (
          <OpenFromHomeStep
            key={step.title}
            number={index + 1}
            title={step.title}
            detail={step.detail}
          />
        ))}
      </ol>
    </div>
  );
}
