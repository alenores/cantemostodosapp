"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Music2 } from "lucide-react";

type LecturaCompasToggleIconProps = {
  compasesOcultos: boolean;
  onToggle: () => void;
};

export default function LecturaCompasToggleIcon({
  compasesOcultos,
  onToggle,
}: LecturaCompasToggleIconProps) {
  return (
    <TapButton
      type="button"
      onClick={onToggle}
      aria-label={
        compasesOcultos ? "Mostrar compases" : "Ocultar compases"
      }
      aria-pressed={!compasesOcultos}
      className="flex size-9 items-center justify-center rounded-full border border-border/50 bg-bg-dark/90 text-text-primary shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md"
    >
      <span className="relative inline-flex size-4 items-center justify-center">
        <Music2 className="size-4" aria-hidden="true" />
        {!compasesOcultos ? (
          <span
            className="pointer-events-none absolute left-1/2 top-1/2 h-px w-[140%] -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-current"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </TapButton>
  );
}
