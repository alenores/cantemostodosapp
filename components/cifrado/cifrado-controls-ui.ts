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
  "flex gap-0.5 rounded-full border border-border bg-bg-darker p-0.5";

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
  return `flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition-colors ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

export function cifradoSegmentedIconButtonClass(active: boolean): string {
  return `flex flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-xs font-bold transition-colors ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

/** Selector de notación compacto (debajo del BPM). */
export const CIFRADO_NOTACION_LABEL_CLASS =
  "mb-1 block text-[9px] font-bold uppercase tracking-wide text-compositor-config";

export const CIFRADO_NOTACION_SEGMENTED_CLASS =
  "flex gap-0.5 rounded-full border border-border bg-bg-darker p-0.5";

export function cifradoNotacionButtonClass(active: boolean): string {
  return `flex-1 rounded-full px-1.5 py-1 text-[10px] font-bold transition-colors ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

/** Toolbar compacto del editor (modo edición / compás). */
export const CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS =
  "mb-0.5 block text-[10px] font-bold uppercase leading-none tracking-wide text-compositor-config";

export const CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS =
  "inline-flex max-w-full gap-0.5 rounded-full border border-border bg-bg-darker p-0.5";

export function cifradoEditorToolbarSegmentedButtonClass(active: boolean): string {
  return `min-w-0 rounded-full px-2 py-1 text-[10px] font-bold leading-none transition-colors ${
    active
      ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
      : "text-text-muted hover:text-text-primary"
  }`;
}

export const CIFRADO_EDITOR_COMPAS_PANEL_CLASS =
  "shrink-0 rounded-[12px] border border-compositor-config-border bg-compositor-config-bg px-3 py-2";

export const CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-compositor-config py-3 text-sm font-bold text-white disabled:opacity-50";

export const CIFRADO_EDITOR_PLAY_BUTTON_CLASS =
  "flex size-11 items-center justify-center rounded-full bg-compositor-config text-white shadow-lg";

export const CIFRADO_INTENSIDAD_PATTERN_CLASS =
  "flex min-w-[8.5rem] items-end justify-center gap-1 rounded-[10px] border border-border/70 bg-bg-card/90 px-2 py-1.5 sm:min-w-[10rem]";

export const CIFRADO_EDITOR_LINE_FAB_CLASS =
  "mt-1.5 rounded-[10px] border border-border/70 bg-bg-card/90 px-2 py-2 shadow-sm";

export const CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS =
  "flex items-center gap-1.5 rounded-full border border-border bg-bg-dark px-3 py-1.5 text-xs font-medium text-text-secondary";
