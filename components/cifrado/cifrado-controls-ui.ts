import type { NotacionAcordes } from "@/lib/notacion-acordes";

/** Paleta alineada al Compositor (config celeste + superficies oscuras). */
export const CIFRADO_COMPOSITOR_ACTIVE_CLASS = "bg-compositor-config text-white";

export const CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS = "text-compositor-config";

/** Estilos compartidos entre CifradoViewerModal (expandido) y CifradoEditor. */
export const CIFRADO_CONTROLS_INPUT_CLASS =
  "min-h-10 w-full rounded-[10px] border border-border bg-bg-dark/60 px-3 text-sm text-text-primary outline-none focus:border-compositor-config-border";

export const CIFRADO_CONTROLS_SECTION_LABEL_CLASS =
  "mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-compositor-config";

export const CIFRADO_CONTROLS_SEGMENTED_CLASS =
  "h-[44px] flex w-full gap-1 rounded-full border border-border bg-bg-darker p-1";

export const CIFRADO_CONTROLS_PANEL_BOX_CLASS =
  "rounded-[10px] border border-border/70 bg-bg-dark/60 px-3 py-3";

export const CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS =
  "w-full rounded-[10px] border border-border bg-bg-card py-2.5 text-sm font-semibold text-text-secondary";

export const NOTACION_TAB_LABEL: Record<NotacionAcordes, string> = {
  es: "Do/Re/Mi",
  en: "C/D/E",
  numero: "Num",
};

export function cifradoSegmentedButtonClass(active: boolean): string {
  return `flex-1 h-full rounded-full px-3 text-xs font-bold transition-all flex items-center justify-center ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

export function cifradoSegmentedIconButtonClass(active: boolean): string {
  return `flex flex-1 h-full items-center justify-center gap-1 rounded-full px-3 text-xs font-bold transition-all ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

/** Selector de notación compacto (debajo del BPM). */
export const CIFRADO_NOTACION_LABEL_CLASS =
  "mb-1 block text-[9px] font-bold uppercase tracking-wide text-compositor-config";

export const CIFRADO_NOTACION_SEGMENTED_CLASS =
  "h-[36px] flex gap-0.5 rounded-full border border-border bg-bg-darker p-0.5";

export function cifradoNotacionButtonClass(active: boolean): string {
  return `flex-1 h-full rounded-full px-2 text-[10px] font-bold transition-all flex items-center justify-center ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

/** Toolbar compacto del editor (modo edición / compás). */
export const CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS =
  "mb-0.5 block text-[10px] font-bold uppercase leading-none tracking-wide text-compositor-config";

export const CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS =
  "h-[44px] flex w-full gap-1 rounded-full border border-border bg-bg-darker p-1";

export function cifradoEditorToolbarSegmentedButtonClass(active: boolean): string {
  return `flex-1 h-full rounded-full px-3 text-xs font-bold transition-all flex items-center justify-center ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

export const CIFRADO_EDITOR_COMPAS_PANEL_CLASS =
  "shrink-0 rounded-[12px] border border-compositor-config-border bg-compositor-config-bg px-3 py-2";

export const CIFRADO_EDITOR_CYCLE_TOOL_BOX_CLASS =
  "rounded-[10px] border border-border/70 bg-bg-card/90 px-3 py-2.5";

/** Toolbar de escritorio (alineado a Compositor / Práctica). */
export const CIFRADO_EDITOR_PC_TOOLBAR_SHELL_CLASS =
  "shrink-0 border-b border-border/80 bg-bg-darker";

export const CIFRADO_EDITOR_PC_COMPAS_STRIP_CLASS =
  "border-t border-border/60 bg-[color-mix(in_srgb,var(--compositor-config)_5%,var(--bg-card))] px-4 py-3";

export const CIFRADO_EDITOR_PC_LABEL_CLASS =
  "mb-1.5 text-[11px] font-bold uppercase tracking-wide text-compositor-config";

export function cifradoEditorPcTabClass(active: boolean): string {
  return `shrink-0 h-full inline-flex items-center rounded-full px-3.5 text-xs font-bold leading-none transition-all ${
    active
      ? "bg-compositor-config text-white shadow-sm"
      : "text-text-muted hover:bg-bg-card/70 hover:text-text-primary"
  }`;
}

export const CIFRADO_EDITOR_PC_SHELL_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-border bg-bg-card";

/** Fondo de la hoja que contiene todos los renglones (sutilmente más oscuro que cada renglón). */
export const CIFRADO_EDITOR_SHEET_BG_CLASS = "bg-[var(--cifrado-editor-sheet-bg)]";

/** Fondo de cada renglón (blanco, sobre la hoja gris). */
export const CIFRADO_EDITOR_LINE_BG_CLASS = "bg-letra-bg";

export const CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-compositor-config py-3 text-sm font-bold text-white disabled:opacity-50";

export const CIFRADO_EDITOR_PLAY_BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-full bg-compositor-config text-white shadow-lg";

export const CIFRADO_INTENSIDAD_PATTERN_CLASS =
  "flex min-w-[8.5rem] items-end justify-center gap-1 rounded-[10px] border border-border/70 bg-bg-card/90 px-2 py-1.5 sm:min-w-[10rem]";

export const CIFRADO_INTENSIDAD_PATTERN_FLUID_CLASS =
  "flex w-full min-w-0 items-end justify-center gap-0.5 rounded-[10px] border border-border/70 bg-bg-card/90 px-2 py-1.5";

export const CIFRADO_EDITOR_LINE_FAB_CLASS =
  "relative z-[30] mt-2 mb-3 rounded-[10px] border border-border/70 bg-bg-card/90 px-2 py-2 shadow-sm";

export const CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-full border border-border bg-bg-dark px-3 py-1.5 text-xs font-medium text-text-secondary";

export const CIFRADO_EDITOR_LINE_FAB_DELETE_PRIMARY_CLASS =
  "flex items-center gap-1.5 rounded-full border border-red-500/55 bg-red-500/25 px-3 py-1.5 text-xs font-semibold text-red-400";

export const CIFRADO_EDITOR_LINE_FAB_DELETE_SECONDARY_CLASS =
  "flex items-center gap-1.5 rounded-full border border-red-500/50 bg-transparent px-3 py-1.5 text-xs font-medium text-red-400";

export const CIFRADO_EDITOR_LINE_FAB_DIVIDER_CLASS =
  "mx-0.5 h-5 w-px shrink-0 self-center bg-white/20";

/** Casillas de compás a la derecha de la letra: ancho fijo (1ch). Sin flex-1. */
export const CIFRADO_LINE_LANE_SLOT_CLASS = "inline-block min-w-[1ch]";

export const CIFRADO_LINE_LANE_CONTAINER_CLASS = "inline-flex min-w-0 flex-1";

/** @deprecated Solo compatibilidad visual; usar CIFRADO_LINE_LANE_* */
export const CIFRADO_COMPAS_EXTENSION_SLOT_CLASS = CIFRADO_LINE_LANE_SLOT_CLASS;

/** @deprecated Solo compatibilidad visual; usar CIFRADO_LINE_LANE_* */
export const CIFRADO_COMPAS_EXTENSION_CONTAINER_CLASS = CIFRADO_LINE_LANE_CONTAINER_CLASS;
