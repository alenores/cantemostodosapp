/**
 * Nomenclatura canónica de ritmo y compositor.
 * Usar en UI, AGENTS.md y conversaciones de producto.
 */

export const RITMO_LABEL_TEMPO = "Tempo";
export const RITMO_LABEL_TEMPO_PULSA_TAB = "pulsa";
export const RITMO_HELP_TEMPO_PULSA = "pulsa el tiempo manualmente";
export const RITMO_LABEL_COMPAS = "Compás";
export const RITMO_LABEL_CICLO = "Ciclo";
export const RITMO_LABEL_GOLPES_TAB = "Golpes";
export const RITMO_LABEL_FIGURA = "Figura";
export const RITMO_LABEL_DINAMICA = "Dinámica";
export const RITMO_LABEL_GOLPE = "Golpe";
export const RITMO_LABEL_CAPAS = "Capas";
export const RITMO_LABEL_CONTENIDO = "Contenido";
export const RITMO_LABEL_TIMBRE = "Timbre";
export const RITMO_LABEL_SUSTENTO = "Sustento";
export const RITMO_LABEL_REJILLA = "Rejilla rítmica";

export const RITMO_HELP_CICLO = "Cuántos golpes tiene cada ciclo.";

export const RITMO_HELP_SELECCIONAR_GOLPE = "Seleccioná un golpe en el gráfico.";

export const RITMO_HELP_FIGURA =
  "La figura de cada golpe (negra, corchea…): define la rejilla, es decir cuándo cae el siguiente golpe.";

export const RITMO_HELP_FIGURA_COMPOSITOR =
  "Figura de cada golpe (negra, corchea…). La rejilla es compartida por todas las capas.";

export const RITMO_HELP_DINAMICA =
  "Qué tan fuerte suena cada golpe (volumen).";

export const RITMO_HELP_DINAMICA_COMPOSITOR =
  "Dinámica de la capa que estás editando en cada golpe. Cada instrumento puede tener la suya.";

export const RITMO_HELP_CONTENIDO_NOTA =
  "Qué nota suena en el golpe seleccionado (capa activa).";

export const RITMO_HELP_TIMBRE_GUITARRA =
  "Cómo se ataca la nota en este golpe (púa o rasguido).";

export const RITMO_HELP_TIMBRE_BATERIA =
  "Qué elemento de batería suena en este golpe (bombo, caja, hi-hat…).";

export const RITMO_HELP_TIMBRE_PIANO =
  "El piano usa un timbre fijo por ahora (mejora futura).";

export const COMPOSITOR_HELP_CAPAS =
  "Activá capas y elegí cuál editás. Al reproducir, suenan juntas con el mismo tempo y compás.";

export const COMPOSITOR_HELP_CAPA_EDITAR =
  "Elegí qué capa editás. Cada una tiene su propia línea de tiempo dentro del ciclo compartido.";

export const COMPOSITOR_HELP_CAPAS_REPRODUCIR =
  "Elegí qué capas querés escuchar. Es independiente de la capa que estés editando.";

export const COMPOSITOR_HELP_GOLPE_CONTENIDO =
  "Elegí el golpe cuyo contenido querés editar (nota).";

export const COMPOSITOR_HELP_GOLPE_TIMBRE =
  "Elegí el golpe cuyo timbre querés editar.";

export const RITMO_CONFIG_SUBTITLE =
  "Elegí el ciclo, la figura y la dinámica de cada golpe, y el tempo en BPM.";

export const RITMO_CONFIG_SUBTITLE_WITH_NOTE =
  "Elegí la nota, el ciclo, la figura y la dinámica de cada golpe, y el tempo en BPM.";

export const RITMO_PATTERN_CONFIG_TITLE = "Dinámica de cada golpe";

export const RITMO_PATTERN_CONFIG_HINT =
  "Tocá cada barra: silencio → suave → medio → fuerte";

export const RITMO_COMPAS_SETUP_TITLE = "Golpes del ciclo";

export type RitmoUiVariant = "default" | "compositor";

export function formatGolpeLabel(slotIndex: number): string {
  return `${RITMO_LABEL_GOLPE} ${slotIndex + 1}`;
}

export function getRitmoHelpFigura(variant: RitmoUiVariant = "default"): string {
  return variant === "compositor"
    ? RITMO_HELP_FIGURA_COMPOSITOR
    : RITMO_HELP_FIGURA;
}

export function getRitmoHelpDinamica(variant: RitmoUiVariant = "default"): string {
  return variant === "compositor"
    ? RITMO_HELP_DINAMICA_COMPOSITOR
    : RITMO_HELP_DINAMICA;
}

export function getRitmoHelpContenido(): string {
  return RITMO_HELP_CONTENIDO_NOTA;
}

export function getRitmoHelpTimbre(
  instrumentId: "guitarra" | "bateria",
): string {
  return instrumentId === "bateria"
    ? RITMO_HELP_TIMBRE_BATERIA
    : RITMO_HELP_TIMBRE_GUITARRA;
}

export function formatRitmoConfigSummary(
  patternLength: number,
  durationSummary: string,
  bpm: number,
): string {
  return `Ciclo de ${patternLength} golpes · ${durationSummary} · ${bpm} BPM`;
}
