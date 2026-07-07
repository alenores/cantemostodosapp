/** Estilos compartidos para distinguir modo edición (amarillo) de creación (celeste). */

export function compositorBlockTitleClass(mode: "create" | "edit"): string {
  return `text-[10px] font-bold uppercase tracking-wide ${
    mode === "edit" ? "text-compositor-block-edit" : "text-compositor-config"
  }`;
}

export function compositorBlockFieldGroupClass(mode: "create" | "edit"): string {
  const base = "rounded-md px-2 py-2";

  if (mode === "edit") {
    return `${base} border border-compositor-block-edit-border bg-[color-mix(in_srgb,var(--compositor-block-edit)_6%,var(--bg-card))]`;
  }

  return `${base} border border-border/30 bg-[color-mix(in_srgb,var(--bg-card)_88%,white_8%)]`;
}

export function compositorBlockFieldLabelClass(mode: "create" | "edit"): string {
  return `mb-1.5 text-[10px] font-bold uppercase tracking-wide ${
    mode === "edit" ? "text-compositor-block-edit" : "text-compositor-config"
  }`;
}

export function compositorBlockSegmentActiveClass(mode: "create" | "edit"): string {
  return mode === "edit"
    ? "bg-compositor-block-edit text-[#1a1a1a]"
    : "bg-compositor-config text-white";
}

export function compositorBlockOptionActiveClass(mode: "create" | "edit"): string {
  return mode === "edit"
    ? "border-compositor-block-edit-border bg-[color-mix(in_srgb,var(--compositor-block-edit)_18%,var(--bg-card))] text-compositor-block-edit"
    : "border-compositor-config bg-compositor-config-bg text-compositor-config";
}

export function compositorBlockMelodicNoteActiveClass(mode: "create" | "edit"): string {
  return mode === "edit"
    ? "border border-compositor-block-edit-border bg-compositor-block-edit text-[#1a1a1a]"
    : "bg-compositor-config text-white";
}

export function compositorBlockPillActiveClass(mode: "create" | "edit"): string {
  return mode === "edit"
    ? "bg-compositor-block-edit font-bold text-[#1a1a1a]"
    : "bg-compositor-config font-bold text-white";
}
