"use client";

import CifraClubEmbedHelpModal from "@/components/salas/CifraClubEmbedHelpModal";
import { TapButton } from "@/components/ui/TapFeedback";
import {
  LECTURA_AUTO_SCROLL_BOTTOM_PX,
  LECTURA_TOP_CHROME_SIDE_PX,
} from "@/lib/sala-layout";
import { HelpCircle } from "lucide-react";
import { useState } from "react";

type CifraClubEmbedBadgeProps = {
  /** control: margen superior izquierdo; lectura: margen inferior izquierdo. */
  placement?: "control" | "lectura";
};

export default function CifraClubEmbedBadge({
  placement = "control",
}: CifraClubEmbedBadgeProps) {
  const [helpOpen, setHelpOpen] = useState(false);

  const wrapperStyle =
    placement === "lectura"
      ? {
          left: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-left, 0px))`,
          bottom: `calc(${LECTURA_AUTO_SCROLL_BOTTOM_PX}px + env(safe-area-inset-bottom, 0px))`,
        }
      : undefined;

  return (
    <>
      <div
        className={`pointer-events-none absolute z-10 ${
          placement === "control" ? "left-4 top-2" : ""
        }`}
        style={wrapperStyle}
      >
        <TapButton
          type="button"
          aria-label="¿Por qué se ve como página web?"
          onClick={() => setHelpOpen(true)}
          className="pointer-events-auto flex items-center gap-1 rounded-full border py-0.5 pl-2 pr-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-[6px]"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--bg-card) 78%, transparent)",
            borderColor: "var(--voz-config-border)",
          }}
        >
        <span
          className="select-none text-[9px] font-semibold tracking-tight sm:text-[10px]"
          style={{ color: "var(--voz-config)" }}
        >
          www.cifraclub.com
        </span>
        <HelpCircle
          className="size-3 shrink-0 text-text-primary"
          strokeWidth={2.75}
          aria-hidden="true"
        />
        </TapButton>
      </div>

      <CifraClubEmbedHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
