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
    "rounded-lg px-1 py-1.5 text-center transition-all disabled:opacity-50";

  if (isActive) {
    return accent === "compositor"
      ? `${base} bg-compositor-config font-bold text-white shadow-sm`
      : `${base} bg-gradient-to-b from-cyan-400 to-sky-500 font-black text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.7)] border border-cyan-200/60 scale-[1.03]`;
  }

  if (options?.inScale ?? true) {
    return `${base} border border-cyan-500/20 bg-bg-dark/70 font-bold text-text-primary hover:border-cyan-500/40`;
  }

  return `${base} border border-transparent bg-bg-dark/30 font-normal text-text-muted opacity-70`;
}

export const TOOL_NOTE_LABEL_CLASS = "block truncate text-[11px] leading-none";
