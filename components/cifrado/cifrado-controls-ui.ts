import type { NotacionAcordes } from "@/lib/notacion-acordes";

/** Estilos compartidos entre CifradoViewerModal (expandido) y CifradoEditor. */
export const CIFRADO_CONTROLS_INPUT_CLASS =
  "min-h-10 w-full rounded-[10px] border border-border bg-[#3a3a3a] px-3 text-sm text-text-primary outline-none focus:border-accent";

export const CIFRADO_CONTROLS_SECTION_LABEL_CLASS =
  "mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-text-muted";

export const CIFRADO_CONTROLS_SEGMENTED_CLASS =
  "flex rounded-lg border border-border bg-bg-dark p-0.5";

export const CIFRADO_CONTROLS_PANEL_BOX_CLASS =
  "rounded-[10px] border border-border bg-bg-dark p-3";

export const CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS =
  "w-full rounded-[10px] border border-border bg-bg-card py-2.5 text-sm font-semibold text-text-secondary";

export const NOTACION_TAB_LABEL: Record<NotacionAcordes, string> = {
  es: "Do/Re/Mi",
  en: "C/D/E",
  numero: "Num",
};

export function cifradoSegmentedButtonClass(active: boolean): string {
  return `flex-1 rounded-md px-1 py-2 text-xs font-semibold transition-colors ${
    active ? "bg-accent text-white" : "text-text-secondary"
  }`;
}

export function cifradoSegmentedIconButtonClass(active: boolean): string {
  return `flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors ${
    active ? "bg-accent text-white" : "text-text-secondary"
  }`;
}

/** Selector de notación compacto (debajo del BPM). */
export const CIFRADO_NOTACION_LABEL_CLASS =
  "mb-1 block text-[9px] font-medium uppercase tracking-wide text-text-faint";

export const CIFRADO_NOTACION_SEGMENTED_CLASS =
  "flex rounded-md border border-border/35 bg-bg-app/40 p-0.5";

export function cifradoNotacionButtonClass(active: boolean): string {
  return `flex-1 rounded px-0.5 py-1 text-[10px] font-medium transition-colors ${
    active
      ? "bg-accent/15 text-accent"
      : "text-text-faint hover:text-text-muted"
  }`;
}

/** Toolbar compacto del editor (modo edición / compás). */
export const CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS =
  "mb-0.5 block text-[9px] font-semibold uppercase tracking-wide text-text-muted";

export const CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS =
  "inline-flex max-w-full rounded-md border border-border bg-bg-dark p-px";

export function cifradoEditorToolbarSegmentedButtonClass(active: boolean): string {
  return `rounded-[5px] px-1.5 py-0.5 text-[10px] font-semibold leading-tight transition-colors ${
    active ? "bg-accent text-white" : "text-text-secondary"
  }`;
}
