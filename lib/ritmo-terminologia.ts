/**
 * Nomenclatura canónica de ritmo y compositor.
 * Usar en UI, AGENTS.md y conversaciones de producto.
 *
 * Intensidad: silencio / suave / medio / fuerte por golpe o evento (`lib/voz-intensidad.ts`,
 * pestaña `intensidad`, `RITMO_LABEL_INTENSIDAD`).
 */

export const RITMO_LABEL_TEMPO = "Tempo";
export const RITMO_LABEL_TEMPO_PULSA_TAB = "pulsa";
export const RITMO_HELP_TEMPO_PULSA = "pulsa el tiempo manualmente";
export const RITMO_LABEL_COMPAS = "Compás";
export const RITMO_LABEL_CICLO = "Ciclo";
export const RITMO_LABEL_GOLPES_TAB = "Golpes";
export const RITMO_LABEL_FIGURA = "Figura";
export const RITMO_LABEL_INTENSIDAD = "Intensidad";
export const RITMO_LABEL_GOLPE = "Golpe";
export const RITMO_LABEL_CAPAS = "Capas";
export const RITMO_LABEL_NOTA = "Nota";
export const RITMO_LABEL_NOTAS = "Notas";
export const RITMO_LABEL_SONIDO = "Sonido";
export const RITMO_LABEL_TIMBRE = "Timbre";
export const RITMO_LABEL_SUSTENTO = "Sustento";
export const RITMO_LABEL_POSICION = "Posición";
export const RITMO_LABEL_REJILLA = "Rejilla rítmica";

export const RITMO_HELP_CICLO = "Cuántos golpes tiene cada ciclo.";

export const RITMO_HELP_SELECCIONAR_GOLPE = "Seleccioná un golpe en el gráfico.";

export const RITMO_HELP_FIGURA =
  "La figura de cada golpe (negra, corchea…): define la rejilla, es decir cuándo cae el siguiente golpe.";

export const RITMO_HELP_FIGURA_UNIFORME =
  "La figura aplica a todos los golpes del ciclo (negra, corchea…).";

export const RITMO_HELP_FIGURA_COMPOSITOR =
  "Figura de cada golpe (negra, corchea…). La rejilla es compartida por todas las capas.";

export const RITMO_HELP_INTENSIDAD =
  "Qué tan fuerte suena cada golpe (volumen).";

export const RITMO_HELP_INTENSIDAD_COMPOSITOR =
  "Intensidad de la capa que estás editando en cada golpe. Cada instrumento puede tener la suya.";

export const RITMO_HELP_NOTA =
  "Qué nota suena en el golpe seleccionado (capa activa).";

export const RITMO_HELP_NOTAS_PATRON =
  "Elegí la nota de cada golpe en el gráfico.";

export const RITMO_HELP_SONIDO_GOLPE =
  "Para cada golpe elegís si hay que cantar o callar.";

export const RITMO_HELP_TIMBRE_GUITARRA =
  "Cómo se ataca la nota en este golpe (púa, rasguido o dedo).";

export const RITMO_HELP_TIMBRE_BATERIA =
  "Qué elemento de batería suena en este golpe (bombo, caja, hi-hat, platillos…).";

export const RITMO_HELP_TIMBRE_PIANO =
  "El piano usa un timbre fijo por ahora (mejora futura).";

export const COMPOSITOR_HELP_CAPAS =
  "Activá capas y elegí cuál editás. Al reproducir, suenan juntas con el mismo tempo y compás.";

export const COMPOSITOR_HELP_CAPA_EDITAR =
  "Elegí qué capa editás. Cada una tiene su propia línea de tiempo dentro del ciclo compartido.";

export const COMPOSITOR_HELP_CAPAS_REPRODUCIR =
  "Elegí qué capas querés escuchar. Es independiente de la capa que estés editando.";

export const COMPOSITOR_HELP_GOLPE_NOTA =
  "Elegí el golpe cuya nota querés editar.";

export const COMPOSITOR_HELP_GOLPE_TIMBRE =
  "Elegí el golpe cuyo timbre querés editar.";

export const COMPOSITOR_HELP_EVENTO_POSICION =
  "En qué paso del ciclo empieza este sonido.";

export const COMPOSITOR_HELP_EVENTO_SUSTENTO =
  "Cuántos pasos suena este bloque (piano y guitarra usan toda esta duración).";

export const COMPOSITOR_LABEL_SONIDO_SELECCIONADO = "Sonido seleccionado";

export const COMPOSITOR_LABEL_CICLO_COMPARTIDO = "CICLO (Compartido)";

export const COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS = "CAPAS (Instrumentos)";

export const COMPOSITOR_LABEL_AGREGAR_BLOQUE = "Agregar bloque";

export const COMPOSITOR_LABEL_AGREGAR_BLOQUE_NOTA = "Agregar bloque/nota";

export const COMPOSITOR_LABEL_ESCUCHAR_CAPA = "Escuchar capa";

export const COMPOSITOR_LABEL_RESET_ZONA = "Dejar todo en cero";

export const COMPOSITOR_LABEL_PLANTILLAS = "Plantillas";

export const COMPOSITOR_TAB_CICLO = "Ciclo";

export const COMPOSITOR_TAB_TEMPO = "Tempo";

export const COMPOSITOR_TAB_BATERIA = "Batería";

export const COMPOSITOR_TAB_TONALIDAD = "Tonalidad";

export const COMPOSITOR_TAB_MELODIAS = "Melodías";

export const COMPOSITOR_HELP_TONALIDAD_COMPOSICION =
  "Tónica de referencia para las melodías del ciclo. Al usar el ciclo en una canción, las notas se transponen desde acá.";

export const COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE =
  "Cambiar golpes o figura puede mover o recortar eventos ya colocados en batería y melodías. ¿Continuar?";

export const COMPOSITOR_LABEL_MIS_CICLOS = "Mis ciclos";

export const COMPOSITOR_LABEL_EDITOR = "Editor";

export const COMPOSITOR_LABEL_NUEVO_CICLO = "Nuevo ciclo";

export const COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR = "Nuevo ciclo (sin guardar)";

export const COMPOSITOR_LABEL_EDITANDO_CICLO = (nombre: string) =>
  `Editando: ${nombre}`;

export const COMPOSITOR_LABEL_GUARDAR_CICLO = "Guardar ciclo";

export const COMPOSITOR_LABEL_GUARDAR_CAMBIOS = "Guardar cambios";

export const COMPOSITOR_LABEL_GUARDAR_COMO = "Guardar como…";

export const COMPOSITOR_LABEL_DESCARTAR_CAMBIOS = "Descartar cambios";

export const COMPOSITOR_LABEL_ABRIR_CICLO = "Abrir";

export const COMPOSITOR_LABEL_ACTUALIZAR_CICLO = "Actualizar ciclo";

export const COMPOSITOR_HELP_MIS_CICLOS =
  "Tu biblioteca de patrones. Abrí uno para editarlo o creá uno nuevo.";

export const COMPOSITOR_HELP_EDITOR_VACIO =
  "Elegí un ciclo guardado o creá uno nuevo desde Mis ciclos.";

export const COMPOSITOR_CONFIRM_LEAVE_EDITOR_MESSAGE =
  "Hay cambios sin guardar. ¿Salir del editor sin guardar?";

export const COMPOSITOR_CONFIRM_DESCARTAR_CAMBIOS_MESSAGE =
  "¿Descartar los cambios y volver a la última versión guardada?";

export const CIFRADO_LABEL_CICLO_RITMO = "Ciclo de batería";

export const CIFRADO_LABEL_SIN_CICLO = "Click (sin ciclo)";

export const CIFRADO_HELP_CICLO_RITMO =
  "Elegí un ciclo guardado del Compositor para este compás. Si no elegís ninguno, suena el click.";

export const CIFRADO_HELP_SIN_CICLOS =
  "No hay ciclos guardados. Creá uno en el Compositor (Mis ciclos) y volvé acá.";

export const CIFRADO_LABEL_COMPONER_CICLO = "Componer";

export const CIFRADO_LABEL_CICLO_GUARDADO = "Guardado";

export const CIFRADO_LABEL_CICLOS_GUARDADOS = "Ciclos guardados";

export const CIFRADO_LABEL_ACTIVAR_BORRADOR = "Activar borrador";

export const CIFRADO_LABEL_GUARDAR_Y_ACTIVAR = "Guardar y activar";

export const CIFRADO_LABEL_COLOCANDO = (nombre: string) => `Colocando: ${nombre}`;

export const CIFRADO_HELP_COLOCAR_CICLO =
  "Elegí o componé un ciclo arriba. Después tocá la letra para colocarlo.";

export const COMPOSITOR_CONFIRM_LOAD_CYCLE_MESSAGE = (nombre: string) =>
  `¿Cargar el ciclo "${nombre}"? Se reemplazará la composición actual.`;

export const COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE = (nombre: string) =>
  `¿Eliminar el ciclo "${nombre}"? Esta acción no se puede deshacer.`;

export const COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE = (label: string) =>
  `¿Cargar la plantilla "${label}"? Se reemplazará la composición actual.`;

export const COMPOSITOR_CONFIRM_RESET_MESSAGE =
  "Se va a restablecer todo el compositor: ciclo compartido, tempo y bloques de batería, guitarra, piano y viento. Las capas activas quedan en su estado inicial. ¿Continuar?";

export const RITMO_CONFIG_SUBTITLE =
  "Elegí el ciclo, la figura y la intensidad de cada golpe, y el tempo en BPM.";

export const RITMO_CONFIG_SUBTITLE_WITH_NOTE =
  "Elegí la nota, el ciclo, la figura y la intensidad de cada golpe, y el tempo en BPM.";

export const RITMO_PATTERN_CONFIG_TITLE = "Intensidad de cada golpe";

export const RITMO_PATTERN_CONFIG_HINT =
  "Tocá cada barra: silencio → suave → medio → fuerte";

export const RITMO_COMPAS_SETUP_TITLE = "Golpes del ciclo";

export type RitmoUiVariant = "default" | "compositor";

export function formatGolpeLabel(slotIndex: number): string {
  return `${RITMO_LABEL_GOLPE} ${slotIndex + 1}`;
}

export function getRitmoHelpFigura(
  variant: RitmoUiVariant = "default",
  uniform = false,
): string {
  if (uniform) {
    return RITMO_HELP_FIGURA_UNIFORME;
  }
  return variant === "compositor"
    ? RITMO_HELP_FIGURA_COMPOSITOR
    : RITMO_HELP_FIGURA;
}

export function getRitmoHelpIntensidad(variant: RitmoUiVariant = "default"): string {
  return variant === "compositor"
    ? RITMO_HELP_INTENSIDAD_COMPOSITOR
    : RITMO_HELP_INTENSIDAD;
}

export function getRitmoHelpNota(): string {
  return RITMO_HELP_NOTA;
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
