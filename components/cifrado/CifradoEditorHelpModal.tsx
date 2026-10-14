"use client";

import { HelpCircle } from "lucide-react";

export function CifradoEditorHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label="Ayuda del editor de canciones"
      className="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-accent/15"
      style={{
        borderColor:
          "color-mix(in srgb, var(--accent) 35%, var(--border))",
        color: "var(--accent)",
        backgroundColor:
          "color-mix(in srgb, var(--accent) 10%, transparent)",
      }}
    >
      <HelpCircle className="size-4" strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
