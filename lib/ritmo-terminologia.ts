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
export const RITMO_LABEL_FIGURA_DESKTOP = "FIGURA";
export const RITMO_DESKTOP_CLICK_HINT = "Click para cambiar";
export const RITMO_LABEL_INTENSIDAD = "Intensidad";
export const RITMO_LABEL_GOLPE = "Golpe";
export const RITMO_LABEL_CAPAS = "Capas";
export const RITMO_LABEL_NOTA = "Nota";
export const RITMO_LABEL_NOTAS = "Notas";
export const RITMO_LABEL_SONIDO = "Sonido";
export const RITMO_LABEL_TIMBRE = "Timbre";
export const RITMO_LABEL_ACORDE = "Acorde";
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
  "Cómo se ataca la nota en este golpe (púa, rasguido ↓/↑, dedo…).";

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

export const COMPOSITOR_LABEL_BLOQUE_SELECCIONADO = "Bloque seleccionado";

export const COMPOSITOR_LABEL_BLOQUES_SELECCIONADOS = "Bloques seleccionados";

export const COMPOSITOR_LABEL_CREAR_BLOQUE = "Crear bloque";

export const COMPOSITOR_LABEL_EDITAR_BLOQUE = "Editar bloque";

export const COMPOSITOR_LABEL_ARRASTRAR_GRAFICO = "Arrastrá al gráfico";

export const COMPOSITOR_LABEL_CICLO_COMPARTIDO = "CICLO (Compartido)";

export const COMPOSITOR_LABEL_CAPAS_INSTRUMENTOS = "CAPAS (Instrumentos)";

export const COMPOSITOR_LABEL_AGREGAR_BLOQUE = "Agregar bloque";

export const COMPOSITOR_LABEL_CANTIDAD_BLOQUES = "Cantidad";

export const COMPOSITOR_LABEL_OCTAVA = "Octava";

export const COMPOSITOR_LABEL_AGREGAR_BLOQUE_NOTA = "Agregar bloque/nota";

export const COMPOSITOR_LABEL_ESCUCHAR_CAPA = "Escuchar capa";

export const COMPOSITOR_LABEL_RESET_ZONA = "Dejar todo en cero";

export const COMPOSITOR_LABEL_RESET_BLOQUE = "Reiniciar bloque";

export const COMPOSITOR_CONFIRM_DELETE_BLOCKS_MESSAGE = (count: number) =>
  count === 1
    ? "¿Eliminar el bloque seleccionado?"
    : `¿Eliminar los ${count} bloques seleccionados?`;

export const COMPOSITOR_LABEL_PLANTILLAS = "Plantillas";

export const COMPOSITOR_LABEL_RITMOS_BATERIA = "Ritmos de batería";

export const COMPOSITOR_HELP_RITMOS_BATERIA =
  "Tocá play para escuchar tres ciclos. Elegí un ritmo para cargarlo en la batería.";

export const COMPOSITOR_ARIA_MODAL_RITMOS_BATERIA = "Elegir plantilla de batería";

export const COMPOSITOR_ARIA_PREVIEW_RITMO_BATERIA = (label: string) =>
  `Escuchar tres ciclos de ${label}`;

export const COMPOSITOR_ARIA_DETENER_PREVIEW_RITMO_BATERIA = (label: string) =>
  `Detener vista previa de ${label}`;

export const COMPOSITOR_CONFIRM_APLICAR_RITMO_BATERIA = (label: string) =>
  `¿Cargar el ritmo "${label}"? Se reemplazará la batería actual.`;

export const COMPOSITOR_LABEL_MELODIAS_PLANTILLA = "Melodías";

export const COMPOSITOR_LABEL_ACOMPANAMIENTO_PLANTILLA = "Acompañamiento";

export const COMPOSITOR_HELP_MELODIAS_PLANTILLA =
  "Tocá play para escuchar tres ciclos. Elegí una plantilla para cargarla en la capa activa.";

export const COMPOSITOR_ARIA_MODAL_MELODIAS = "Elegir plantilla de melodía o acompañamiento";

export const COMPOSITOR_ARIA_PREVIEW_MELODIA = (label: string) =>
  `Escuchar tres ciclos de ${label}`;

export const COMPOSITOR_ARIA_DETENER_PREVIEW_MELODIA = (label: string) =>
  `Detener vista previa de ${label}`;

export const COMPOSITOR_CONFIRM_APLICAR_MELODIA = (
  label: string,
  instrumentLabel: string,
) =>
  `¿Cargar la plantilla "${label}"? Se reemplazará ${instrumentLabel} actual.`;

export const COMPOSITOR_HELP_ACOMPANAMIENTO_PLANTILLA =
  "Bases para cantar encima (punteo y rasguido). Solo en guitarra.";

export const COMPOSITOR_TAB_CICLO = "Ciclo";

export const COMPOSITOR_TAB_TEMPO = "Tempo";

export const COMPOSITOR_TAB_BATERIA = "Batería";

export const COMPOSITOR_TAB_TONALIDAD = "Tonalidad";

export const COMPOSITOR_TAB_MELODIAS = "Melodías";

export const COMPOSITOR_TAB_PRACTICAR = "Escuchar";

export const COMPOSITOR_HELP_TONALIDAD_COMPOSICION =
  "Tónica de referencia para las melodías del ciclo. Al usar el ciclo en una canción, las notas se transponen desde acá.";

export const COMPOSITOR_CONFIRM_CYCLE_STRUCTURE_MESSAGE =
  "Cambiar golpes o figura puede mover o recortar eventos ya colocados en batería y melodías. ¿Continuar?";

export const COMPOSITOR_NOTICE_TRACK_AT_CAPACITY = (instrumentLabel: string) =>
  `Esta capa ya tiene el máximo de 24 bloques (${instrumentLabel}). Eliminá uno para agregar otro.`;

export const COMPOSITOR_NOTICE_CYCLE_FULL =
  "No hay más espacio en el ciclo para agregar bloques.";

export const COMPOSITOR_NOTICE_CELL_OCCUPIED =
  "Esa celda ya tiene un bloque. Elegí otra posición.";

export const COMPOSITOR_ERROR_TRACK_OVERFLOW_SAVE = (details: string) =>
  `No se puede guardar: ${details}.`;

export const COMPOSITOR_NOTICE_TRACK_OVERFLOW_LOAD = (details: string) =>
  `Este ciclo supera el límite de 24 bloques por capa: ${details} Eliminá bloques extras para poder guardar.`;

export const COMPOSITOR_LABEL_REVISION_MIDI = "Revisión de importación MIDI";

export const COMPOSITOR_LABEL_RECORTE_MIDI = "Recorte de importación MIDI";

export const COMPOSITOR_LABEL_CAPAS_CICLO_IMPORT = "Capas del ciclo";

export const COMPOSITOR_LABEL_VENTANA_RECORTE_MIDI = "Ventana en la canción";

export const COMPOSITOR_HELP_RECORTE_MIDI =
  "Elegí qué capas incluir y qué tramo de la canción convertir en ciclo. Podés crear varios ciclos del mismo archivo.";

export const COMPOSITOR_HELP_CAPAS_SIN_CONTENIDO_RECORTE =
  "Las capas atenuadas no tienen notas en este tramo de la canción.";

export const COMPOSITOR_HELP_CAPA_AUSENTE_ARCHIVO_MIDI =
  "No aparece en este archivo";

export const COMPOSITOR_HELP_CAPA_AUSENTE_TRAMO_MIDI =
  "No hay notas en este tramo";

export const COMPOSITOR_LABEL_CONTINUAR_REVISION_MIDI = "Continuar a revisión";

export const COMPOSITOR_LABEL_VOLVER_RECORTE_MIDI = "Volver al recorte";

export const COMPOSITOR_NOTICE_CICLO_GUARDADO_MIDI =
  "Ciclo guardado. Podés crear otro recorte del mismo archivo.";

export const COMPOSITOR_ERROR_RECORTE_DEMASIADOS_GOLPES = (maxGolpes: number) =>
  `El ciclo no puede superar ${maxGolpes} golpes. Ajustá la selección antes de continuar.`;

export const COMPOSITOR_LABEL_GOLPES_SELECCIONADOS = (count: number) =>
  `${count} golpe${count === 1 ? "" : "s"} seleccionado${count === 1 ? "" : "s"}`;

export const COMPOSITOR_LABEL_GOLPES_RECORTE_CON_LIMITE = (
  count: number,
  max: number,
) =>
  `${count}/${max} golpe${count === 1 ? "" : "s"} seleccionado${count === 1 ? "" : "s"}`;

export const COMPOSITOR_LABEL_ESCUCHAR_RECORTE_MIDI = "Escuchar selección";

export const COMPOSITOR_LABEL_DETENER_RECORTE_MIDI = "Detener";

export const COMPOSITOR_HELP_ESCUCHAR_RECORTE_MIDI =
  "Reproduce una vez el tramo y las capas elegidas.";

export const COMPOSITOR_LABEL_PISTAS_ARCHIVO = "Pistas del archivo";

export const COMPOSITOR_LABEL_CONFLICTOS_POR_CAPA = "Conflictos por capa";

export const COMPOSITOR_LABEL_VISTA_PREVIA_IMPORT = "Vista previa por capa";

export const COMPOSITOR_LABEL_DETALLE_BLOQUE_SELECCIONADO =
  "Bloque seleccionado";

export const COMPOSITOR_LABEL_BLOQUE_SIN_CONFLICTOS =
  "Este bloque no tiene conflictos. Podés editarlo o dejarlo así.";

export const COMPOSITOR_HELP_SELECCIONAR_BLOQUE_REVISION =
  "Tocá un bloque en el gráfico o un error de la lista para ver qué pasa y cómo resolverlo.";

export const COMPOSITOR_LABEL_GUARDAR_CICLO_IMPORT = "Guardar ciclo";

export const COMPOSITOR_LABEL_CANCELAR_IMPORT_MIDI = "Cancelar importación";

export const COMPOSITOR_CONFIRM_CANCELAR_IMPORT_MIDI =
  "Si salís, perdés esta importación. Tenés que volver a subir el archivo MIDI. ¿Continuar?";

export const COMPOSITOR_LABEL_SIN_ASIGNAR = "Sin asignar";

export const COMPOSITOR_HELP_IMPORT_MIDI =
  "Elegí un archivo .mid o .midi. Se procesa en tu dispositivo; el archivo original no se guarda.";

export const COMPOSITOR_LABEL_MIS_CICLOS = "Mis ciclos";

export const COMPOSITOR_LABEL_COMUNIDAD = "Comunidad";

export const COMPOSITOR_LABEL_COMPOSITOR = "Compositor";

export const COMPOSITOR_LABEL_NUEVO_CICLO = "Nuevo ciclo";

export const COMPOSITOR_LABEL_IMPORTAR_MIDI = "Importar MIDI";

export const COMPOSITOR_LABEL_NUEVO_CICLO_SIN_GUARDAR = "Nuevo ciclo (sin guardar)";

export const COMPOSITOR_PLACEHOLDER_NOMBRE_CICLO = "Ingresar nombre del ciclo";

export const COMPOSITOR_ERROR_NOMBRE_CICLO_REQUERIDO =
  "Escribí un nombre para el ciclo.";

export const COMPOSITOR_LABEL_EDITANDO_CICLO = (nombre: string) =>
  `Editando: ${nombre}`;

export const COMPOSITOR_LABEL_GUARDAR_CICLO = "Guardar ciclo";

export const COMPOSITOR_LABEL_GUARDAR_CAMBIOS = "Guardar cambios";

export const COMPOSITOR_LABEL_GUARDAR_EDICIONES = "Guardar ediciones";

export const COMPOSITOR_LABEL_ELIMINAR_CICLO = "Eliminar";

export const COMPOSITOR_LABEL_GUARDAR_COMO = "Guardar como…";

export const COMPOSITOR_LABEL_DESCARTAR_CAMBIOS = "Descartar cambios";

export const COMPOSITOR_LABEL_ABRIR_CICLO = "Abrir";

export const COMPOSITOR_LABEL_ESCUCHAR_CICLO = "Escuchar";

export const COMPOSITOR_LABEL_EDITAR_CICLO = "Editar";

export const COMPOSITOR_LABEL_ACTUALIZAR_CICLO = "Actualizar ciclo";

export const COMPOSITOR_HELP_MIS_CICLOS =
  "Tu biblioteca de patrones. Abrí uno para editarlo o creá uno nuevo.";

export const COMPOSITOR_HELP_COMUNIDAD =
  "Ciclos que otros usuarios compartieron con la comunidad. Podés agregarlos a tu biblioteca.";

export const COMPOSITOR_HELP_COMUNIDAD_SIN_SESION =
  "Iniciá sesión con conexión para explorar ciclos compartidos por la comunidad.";

export const COMPOSITOR_HELP_COMUNIDAD_OFFLINE =
  "Conectate a internet para ver los ciclos compartidos por la comunidad.";

export const COMPOSITOR_LABEL_AGREGAR_A_MIS_CICLOS = "Agregar a mis ciclos";

export const COMPOSITOR_LABEL_COMPARTIR_COMUNIDAD = "Compartir con la comunidad";

export const COMPOSITOR_LABEL_COMPARTIDO_COMUNIDAD = "Compartido con la comunidad";

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

export const CIFRADO_LABEL_APLICAR_NUMERO_CICLOS = "Aplicar número de ciclos";

export const CIFRADO_HELP_APLICAR_NUMERO_CICLOS =
  "Al tocar un renglón se reparten sobre la letra y lo que ya tenga (acordes/compás). Después podés arrastrar cada uno.";

export const CIFRADO_LABEL_APLICAR_CICLOS_TODOS_RENGLONES =
  "Aplicar a todos los renglones";

export function getCifradoConfirmAplicarCiclosTodosRenglonesMessage(
  cycleCount: number,
  lineCount: number,
  hasExistingCompases: boolean,
): string {
  const base = `¿Aplicar ${cycleCount} compase${cycleCount === 1 ? "" : "s"} en los ${lineCount} renglón${lineCount === 1 ? "" : "es"}?`;

  if (hasExistingCompases) {
    return `Algunos renglones ya tienen compases. Se reemplazarán en todos los renglones. ${base}`;
  }

  return base;
}

export const CIFRADO_CONFIRM_DELETE_LINE_MESSAGE =
  "¿Eliminar este renglón? Se borrará la letra, los acordes y los compases.";

export const CIFRADO_CONFIRM_DELETE_LINE_ACORDES_MESSAGE =
  "¿Eliminar todos los acordes de este renglón?";

export const CIFRADO_CONFIRM_DELETE_LINE_COMPASES_MESSAGE =
  "¿Eliminar todos los compases de este renglón?";

export const CIFRADO_LABEL_PEGAR_EN_RENGLON = "Pegar en renglón";

export const CIFRADO_LABEL_RENGLON_DESTINO = "¿En qué renglón querés pegarlo?";

export const CIFRADO_HELP_PEGAR_EN_RENGLON =
  "Se une a la derecha del renglón elegido. Acordes y compases quedan donde estaban.";

export const CIFRADO_LABEL_CONFIRMAR_UNION = "Unir renglones";

export const CIFRADO_LABEL_CANCELAR_UNION = "Cancelar";

export const CIFRADO_LABEL_PREVIEW_UNION = "Vista previa";

export const COMPOSITOR_CONFIRM_LOAD_CYCLE_MESSAGE = (nombre: string) =>
  `¿Cargar el ciclo "${nombre}"? Se reemplazará la composición actual.`;

export const COMPOSITOR_CONFIRM_DELETE_CYCLE_MESSAGE = (nombre: string) =>
  `¿Eliminar el ciclo "${nombre}"? Esta acción no se puede deshacer.`;

export const COMPOSITOR_CONFIRM_LOAD_PRESET_MESSAGE = (label: string) =>
  `¿Cargar la plantilla "${label}"? Se reemplazará la composición actual.`;

export const COMPOSITOR_CONFIRM_RESET_MESSAGE =
  "Se va a restablecer todo el compositor: ciclo compartido, tempo y las cuatro capas vacías, sin bloques. ¿Continuar?";

export const RITMO_CONFIG_SUBTITLE =
  "Elegí el ciclo, la figura y la intensidad de cada golpe, y el tempo en BPM.";

export const RITMO_CONFIG_SUBTITLE_WITH_NOTE =
  "Elegí la nota, el ciclo, la figura y la intensidad de cada golpe, y el tempo en BPM.";

export const RITMO_PATTERN_CONFIG_TITLE = "Intensidad de cada golpe";

export const RITMO_PATTERN_CONFIG_HINT = RITMO_DESKTOP_CLICK_HINT;

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
