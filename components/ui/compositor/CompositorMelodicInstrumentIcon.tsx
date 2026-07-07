"use client";

import type { CompositorMelodicInstrumentId } from "@/lib/compositor";
import { Guitar, Piano } from "lucide-react";

function CompositorFluteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect
        x="10.25"
        y="2.5"
        width="3.5"
        height="18.5"
        rx="1.75"
        className="fill-current opacity-90"
      />
      <circle cx="12" cy="7" r="0.65" className="fill-[var(--bg-card)]" />
      <circle cx="12" cy="9.75" r="0.65" className="fill-[var(--bg-card)]" />
      <circle cx="12" cy="12.5" r="0.65" className="fill-[var(--bg-card)]" />
      <circle cx="12" cy="15.25" r="0.65" className="fill-[var(--bg-card)]" />
      <path
        d="M12 2.5c1.8 0 3.25 1.1 3.25 2.45"
        className="stroke-current"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <ellipse
        cx="15.1"
        cy="5.2"
        rx="1.35"
        ry="0.9"
        className="fill-current opacity-75"
      />
    </svg>
  );
}

type CompositorMelodicInstrumentIconProps = {
  instrumentId: CompositorMelodicInstrumentId;
  className?: string;
};

export function CompositorMelodicInstrumentIcon({
  instrumentId,
  className = "size-6",
}: CompositorMelodicInstrumentIconProps) {
  if (instrumentId === "viento") {
    return <CompositorFluteIcon className={className} />;
  }

  const Icon = instrumentId === "piano" ? Piano : Guitar;
  return <Icon className={className} aria-hidden="true" />;
}
