/** Estilos compartidos para grillas de notas (Compositor, Entrenador vocal, etc.). */

export const TOOL_NOTE_GRID_CLASS = "grid grid-cols-6 gap-1";

export const TOOL_NOTE_GRID_WIDE_CLASS = "grid grid-cols-6 gap-1 sm:grid-cols-12";

export type ToolNoteAccent = "compositor" | "voz";

export function getToolNoteButtonClass(
  isActive: boolean,
  accent: ToolNoteAccent,
  options?: { inScale?: boolean },
): string {
  const base =
    "rounded-lg px-1 py-1.5 text-center transition-colors disabled:opacity-50";

  if (isActive) {
    return accent === "compositor"
      ? `${base} bg-compositor-config font-bold text-white`
      : `${base} bg-voz-config font-bold text-white`;
  }

  if (options?.inScale ?? true) {
    return `${base} border border-border/70 bg-bg-dark/35 font-semibold text-text-primary`;
  }

  return `${base} border border-transparent bg-bg-dark/25 font-normal text-text-muted opacity-70`;
}

export const TOOL_NOTE_LABEL_CLASS = "block truncate text-[11px] leading-none";
