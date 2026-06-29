import { TapButton } from "@/components/ui/TapFeedback";
import { ListMusic } from "lucide-react";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";

type ColaFilaFloatButtonProps = {
  pendientesCount: number;
  colaAviso: string | null;
  colaAvisoExiting: boolean;
  onClick: () => void;
};

export default function ColaFilaFloatButton({
  pendientesCount,
  colaAviso,
  colaAvisoExiting,
  onClick,
}: ColaFilaFloatButtonProps) {
  const showAviso = Boolean(colaAviso);

  return (
    <TapButton
      type="button"
      onClick={onClick}
      className={`sala-fila-float-btn flex max-w-[calc(100vw-2rem)] items-center overflow-hidden py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY} ${
        showAviso ? "pr-4 pl-3" : "px-4"
      }`}
    >
      <span
        role={showAviso ? "status" : undefined}
        aria-live={showAviso ? "polite" : undefined}
        className={`sala-fila-aviso-slot ${
          !showAviso
            ? "sala-fila-aviso-slot--idle"
            : colaAvisoExiting
              ? "sala-fila-aviso-slot--out"
              : "sala-fila-aviso-slot--in"
        }`}
      >
        <span
          className={`sala-fila-aviso-text block min-w-0 overflow-hidden whitespace-nowrap text-[12px] font-semibold text-accent ${
            showAviso
              ? colaAvisoExiting
                ? "sala-fila-aviso-text-out"
                : "sala-fila-aviso-text-in"
              : ""
          }`}
        >
          {colaAviso}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        <ListMusic className="size-4" aria-hidden="true" />
        <span>Fila · {pendientesCount}</span>
      </span>
    </TapButton>
  );
}
