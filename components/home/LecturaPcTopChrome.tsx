"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { getLecturaTopChromeTopCss } from "@/lib/sala-layout";
import { AudioLines, Minimize2 } from "lucide-react";

const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";

type LecturaPcTopChromeProps = {
  fixedRightCss: string;
  /** Si se omite, no se muestra "Contraer" (p. ej. entrenador usa su flecha). */
  onContraer?: () => void;
  onAfinador: () => void;
};

/** Chips flotantes de escritorio en modo lectura: Contraer + Afinador. Compartido. */
export default function LecturaPcTopChrome({
  fixedRightCss,
  onContraer,
  onAfinador,
}: LecturaPcTopChromeProps) {
  return (
    <div
      className="fixed z-50 hidden flex-col items-end gap-2 lg:flex"
      style={{
        top: getLecturaTopChromeTopCss(),
        right: fixedRightCss,
      }}
    >
      {onContraer ? (
        <TapButton
          type="button"
          aria-label="Contraer"
          onClick={onContraer}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${LECTURA_TOP_CHIP}`}
        >
          <Minimize2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="text-text-primary">Contraer</span>
        </TapButton>
      ) : null}
      <TapButton
        type="button"
        aria-label="Afinador"
        onClick={onAfinador}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${LECTURA_TOP_CHIP}`}
      >
        <AudioLines className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <span className="text-text-primary">Afinador</span>
      </TapButton>
    </div>
  );
}
