/**
 * Modelo de anotaciones puntuales del Entrenador de canciones.
 * Se anclan a la letra por { lineIndex, charOffset } (igual que los acordes)
 * y se guardan en la columna `anotaciones` (jsonb) de `canciones_practica`.
 *
 * El tipo es un string abierto en la base, pero la app maneja este set fijo.
 */

export type AnotacionTipo =
  | "nota"
  | "intensidad"
  | "texto"
  | "respirar"
  | "exigencia";

/** Dos niveles hacia arriba y dos hacia abajo. */
export type IntensidadNivel = "up1" | "up2" | "down1" | "down2";

/** Colores (claros) del resaltado de Exigencia. */
export type ExigenciaColor = "amarillo" | "naranja" | "rojo";

export type Anotacion = {
  id: string;
  tipo: AnotacionTipo;
  lineIndex: number;
  charOffset: number;
  /** Nota (sin límite) o Texto corto (≤ 20). Vacío en intensidad/respirar. */
  texto?: string;
  /** Solo intensidad. */
  nivel?: IntensidadNivel;
  /** Solo exigencia (rango): fin del rango en el mismo renglón. charOffset = inicio. */
  charEnd?: number;
  /** Solo exigencia: color del resaltado. */
  color?: ExigenciaColor;
};

export const ANOTACION_TIPOS: AnotacionTipo[] = [
  "nota",
  "intensidad",
  "texto",
  "respirar",
  "exigencia",
];

/** Largo máximo del "texto" corto que se muestra bajo el renglón. */
export const ANOTACION_TEXTO_MAX = 20;

export const INTENSIDAD_NIVELES: IntensidadNivel[] = [
  "up2",
  "up1",
  "down1",
  "down2",
];

export const EXIGENCIA_COLORES: ExigenciaColor[] = [
  "amarillo",
  "naranja",
  "rojo",
];

/** Tonos claros; se aplican con blend "multiply" sobre la letra. */
export const EXIGENCIA_COLOR_CSS: Record<ExigenciaColor, string> = {
  amarillo: "#fde68a",
  naranja: "#fdba74",
  rojo: "#fca5a5",
};

/**
 * Alto del bloque de exigencia (px). El amarillo es la referencia actual;
 * naranja y rojo suben muy poco, sin acercarse a la fila de acordes.
 */
export const EXIGENCIA_ALTURA_PX: Record<ExigenciaColor, number> = {
  amarillo: 15,
  naranja: 17,
  rojo: 19,
};

export const EXIGENCIA_COLOR_LABEL: Record<ExigenciaColor, string> = {
  amarillo: "Amarillo",
  naranja: "Naranja",
  rojo: "Rojo",
};

export type AnotacionVisibility = Record<AnotacionTipo, boolean>;

export const DEFAULT_ANOTACION_VISIBILITY: AnotacionVisibility = {
  nota: true,
  intensidad: true,
  texto: true,
  respirar: true,
  exigencia: true,
};

export const ANOTACION_TIPO_LABEL: Record<AnotacionTipo, string> = {
  nota: "Anotaciones",
  intensidad: "Intensidad",
  texto: "Texto",
  respirar: "Respirar",
  exigencia: "Exigencia",
};

export const INTENSIDAD_NIVEL_LABEL: Record<IntensidadNivel, string> = {
  up2: "Mucho más fuerte",
  up1: "Más fuerte",
  down1: "Más suave",
  down2: "Mucho más suave",
};

/** Intensidad y Respirar van arriba de la letra (suben la fila de acordes). */
export function anotacionVaArriba(tipo: AnotacionTipo): boolean {
  return tipo === "intensidad" || tipo === "respirar";
}

/** Nota (!) y Texto van debajo del renglón (empujan los compases). */
export function anotacionVaAbajo(tipo: AnotacionTipo): boolean {
  return tipo === "nota" || tipo === "texto";
}

/** Exigencia es un rango que resalta el fondo de la letra (no un punto). */
export function anotacionEsRango(tipo: AnotacionTipo): boolean {
  return tipo === "exigencia";
}

function isAnotacionTipo(value: unknown): value is AnotacionTipo {
  return (
    value === "nota" ||
    value === "intensidad" ||
    value === "texto" ||
    value === "respirar" ||
    value === "exigencia"
  );
}

function isIntensidadNivel(value: unknown): value is IntensidadNivel {
  return (
    value === "up1" || value === "up2" || value === "down1" || value === "down2"
  );
}

function isExigenciaColor(value: unknown): value is ExigenciaColor {
  return value === "amarillo" || value === "naranja" || value === "rojo";
}

let idCounter = 0;

export function crearAnotacionId(): string {
  idCounter += 1;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `anot-${Date.now()}-${idCounter}`;
}

/** Normaliza el jsonb crudo a un arreglo de anotaciones válido. */
export function parseAnotaciones(value: unknown): Anotacion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: Anotacion[] = [];

  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }

    const item = raw as Record<string, unknown>;

    if (
      !isAnotacionTipo(item.tipo) ||
      typeof item.lineIndex !== "number" ||
      typeof item.charOffset !== "number"
    ) {
      continue;
    }

    const anotacion: Anotacion = {
      id: typeof item.id === "string" ? item.id : crearAnotacionId(),
      tipo: item.tipo,
      lineIndex: Math.max(0, Math.round(item.lineIndex)),
      charOffset: Math.max(0, Math.round(item.charOffset)),
    };

    if (typeof item.texto === "string") {
      anotacion.texto =
        item.tipo === "texto"
          ? item.texto.slice(0, ANOTACION_TEXTO_MAX)
          : item.texto;
    }

    if (item.tipo === "intensidad" && isIntensidadNivel(item.nivel)) {
      anotacion.nivel = item.nivel;
    }

    if (item.tipo === "exigencia") {
      // Rango: requiere charEnd válido. Se normaliza inicio ≤ fin.
      if (typeof item.charEnd !== "number") {
        continue;
      }

      const start = Math.max(0, Math.round(item.charOffset));
      const end = Math.max(0, Math.round(item.charEnd));

      anotacion.charOffset = Math.min(start, end);
      anotacion.charEnd = Math.max(start, end);
      anotacion.color = isExigenciaColor(item.color) ? item.color : "amarillo";
    }

    result.push(anotacion);
  }

  return result;
}

/** Inserta o reemplaza (por id). */
export function upsertAnotacion(
  items: Anotacion[],
  anotacion: Anotacion,
): Anotacion[] {
  const exists = items.some((item) => item.id === anotacion.id);

  if (exists) {
    return items.map((item) =>
      item.id === anotacion.id ? anotacion : item,
    );
  }

  return [...items, anotacion];
}

export function removeAnotacion(
  items: Anotacion[],
  id: string,
): Anotacion[] {
  return items.filter((item) => item.id !== id);
}

/** Elimina las anotaciones de un renglón (al borrar/mover renglones). */
export function removeAnotacionesDeLinea(
  items: Anotacion[],
  lineIndex: number,
): Anotacion[] {
  return items.filter((item) => item.lineIndex !== lineIndex);
}

export function anotacionesDeLinea(
  items: Anotacion[],
  lineIndex: number,
): Anotacion[] {
  return items.filter((item) => item.lineIndex === lineIndex);
}
