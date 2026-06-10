"use client";

import { SkipForward } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

type ColaSiguienteButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void;
};

export default function ColaSiguienteButton({
  onClick,
  onPointerDown,
}: ColaSiguienteButtonProps) {
  return (
    <button
      type="button"
      aria-label="Finalizar y pasar a la siguiente"
      onClick={onClick}
      onPointerDown={onPointerDown}
      className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-letra-bg text-bg-darker shadow-sm active:scale-95"
    >
      <SkipForward
        className="size-5 fill-bg-darker text-bg-darker"
        aria-hidden="true"
      />
    </button>
  );
}
