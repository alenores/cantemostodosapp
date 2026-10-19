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
  | "exigencia"
  | "rasgueo"
  | "punteo";

/** Golpe de un rasgueo viejo, de izquierda a derecha: 1 y 2 y 3 y 4 y. */
export type RasgueoGolpe = "vacio" | "abajo" | "arriba" | "apagado";

/** Cuánto dura un golpe. El más angosto es el más corto. */
export type DuracionTrazo =
  | "semicorchea"
  | "corchea"
  | "negra"
  | "blanca"
  | "redonda";

export const DURACIONES_TRAZO: DuracionTrazo[] = [
  "semicorchea",
  "corchea",
  "negra",
  "blanca",
  "redonda",
];

/** En negras. Una corchea es medio tiempo. */
export const DURACION_TRAZO_NEGRAS: Record<DuracionTrazo, number> = {
  semicorchea: 0.25,
  corchea: 0.5,
  negra: 1,
  blanca: 2,
  redonda: 4,
};

export type DedosRasgueo = 1 | 2 | 3 | 4;

/** Un momento del punteo que vive dentro de un rasgueo. */
export type PasoPunteoRasgueo = {
  duracion: DuracionTrazo;
  /** La cuerda 1 (aguda) va primero. */
  cuerdas: (DedoPunteo | null)[];
};

/** Un golpe del rasgueo, de izquierda a derecha. */
export type TrazoRasgueo =
  | { tipo: "pulgar"; duracion: DuracionTrazo }
  | {
      tipo: "rasgueo";
      dedos: DedosRasgueo;
      direccion: "abajo" | "arriba";
      duracion: DuracionTrazo;
    }
  | { tipo: "silencio"; duracion: DuracionTrazo }
  | { tipo: "apagado"; duracion: DuracionTrazo }
  | { tipo: "punteo"; pasos: PasoPunteoRasgueo[] };

/** Dedo de la mano que puntea. */
export type DedoPunteo = "P" | "I" | "M" | "A";

/** Color de un rasgueo, para reconocerlo en la letra. */
export type RasgueoColor = "verde" | "azul" | "violeta" | "rosa";

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
  /** Rasgueo: identifica el dibujo. Varias marcas pueden compartir el mismo. */
  patronId?: string;
  /** Rasgueo: esta marca corta el tramo (desde acá no hay rasgueo). */
  corte?: boolean;
  /** Rasgueo: color del tramo. */
  rasgueoColor?: RasgueoColor;
  /** Rasgueo: los golpes, en orden. El ancho de cada uno es su duración. */
  trazos?: TrazoRasgueo[];
  /** Punteo del apartado Punteo: cada momento, con su duración. */
  pasos?: PasoPunteoRasgueo[];
  /** Punteo: 6 cuerdas × 8 golpes. La cuerda 1 (aguda) va primero. */
  dedos?: (DedoPunteo | null)[];
  /** Definición armada en el panel. No se muestra en la letra hasta colocarla. */
  catalogo?: boolean;
};

export const ANOTACION_TIPOS: AnotacionTipo[] = [
  "nota",
  "intensidad",
  "texto",
  "respirar",
  "exigencia",
];

/** Marcas de cuerdas. No entran en el menú de Canto. */
export const CUERDAS_TIPOS: AnotacionTipo[] = ["rasgueo", "punteo"];

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
  rasgueo: true,
  punteo: true,
};

export const ANOTACION_TIPO_LABEL: Record<AnotacionTipo, string> = {
  nota: "Anotaciones",
  intensidad: "Intensidad",
  texto: "Texto",
  respirar: "Respirar",
  exigencia: "Exigencia",
  rasgueo: "Rasgueo",
  punteo: "Punteo",
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
    value === "exigencia" ||
    value === "rasgueo" ||
    value === "punteo"
  );
}

const RASGUEO_GOLPES_VALIDOS: RasgueoGolpe[] = [
  "vacio",
  "abajo",
  "arriba",
  "apagado",
];

const DEDOS_VALIDOS: DedoPunteo[] = ["P", "I", "M", "A"];

const RASGUEO_COLORES_VALIDOS: RasgueoColor[] = [
  "verde",
  "azul",
  "violeta",
  "rosa",
];

export const RASGUEO_COLUMNAS = 8;
export const PUNTEO_CUERDAS = 6;
export const PUNTEO_CELDAS = PUNTEO_CUERDAS * RASGUEO_COLUMNAS;

export function esAnotacionCuerda(tipo: AnotacionTipo): boolean {
  return tipo === "rasgueo" || tipo === "punteo";
}

export function golpesVacios(): RasgueoGolpe[] {
  return Array.from({ length: RASGUEO_COLUMNAS }, () => "vacio");
}

export function dedosVacios(): (DedoPunteo | null)[] {
  return Array.from({ length: PUNTEO_CELDAS }, () => null);
}

export function normalizarGolpes(value: unknown): RasgueoGolpe[] {
  const golpes = golpesVacios();

  if (!Array.isArray(value)) {
    return golpes;
  }

  for (let index = 0; index < RASGUEO_COLUMNAS; index += 1) {
    const golpe = value[index];

    if (
      typeof golpe === "string" &&
      RASGUEO_GOLPES_VALIDOS.includes(golpe as RasgueoGolpe)
    ) {
      golpes[index] = golpe as RasgueoGolpe;
    }
  }

  return golpes;
}

function esDuracionTrazo(value: unknown): value is DuracionTrazo {
  return (
    value === "semicorchea" ||
    value === "corchea" ||
    value === "negra" ||
    value === "blanca" ||
    value === "redonda"
  );
}

function duracionTrazoDe(value: unknown): DuracionTrazo {
  return esDuracionTrazo(value) ? value : "corchea";
}

function cuerdasPasoDe(value: unknown): (DedoPunteo | null)[] {
  const cuerdas: (DedoPunteo | null)[] = Array.from(
    { length: PUNTEO_CUERDAS },
    () => null,
  );

  if (!Array.isArray(value)) {
    return cuerdas;
  }

  for (let index = 0; index < PUNTEO_CUERDAS; index += 1) {
    const dedo = value[index];

    if (dedo === "P" || dedo === "I" || dedo === "M" || dedo === "A") {
      cuerdas[index] = dedo;
    }
  }

  return cuerdas;
}

function trazoDesdeViejo(golpe: RasgueoGolpe): TrazoRasgueo {
  if (golpe === "abajo" || golpe === "arriba") {
    return { tipo: "rasgueo", dedos: 1, direccion: golpe, duracion: "corchea" };
  }

  if (golpe === "apagado") {
    return { tipo: "apagado", duracion: "corchea" };
  }

  return { tipo: "silencio", duracion: "corchea" };
}

function trazoDe(value: unknown): TrazoRasgueo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value as Record<string, unknown>;
  const duracion = duracionTrazoDe(item.duracion);

  if (item.tipo === "pulgar" || item.tipo === "silencio" || item.tipo === "apagado") {
    return { tipo: item.tipo, duracion };
  }

  if (item.tipo === "rasgueo") {
    const dedos: DedosRasgueo =
      item.dedos === 2 || item.dedos === 3 || item.dedos === 4 ? item.dedos : 1;

    return {
      tipo: "rasgueo",
      dedos,
      direccion: item.direccion === "arriba" ? "arriba" : "abajo",
      duracion,
    };
  }

  if (item.tipo === "punteo" && Array.isArray(item.pasos)) {
    const pasos = item.pasos.flatMap((paso) => {
      if (!paso || typeof paso !== "object") {
        return [];
      }

      const crudo = paso as Record<string, unknown>;

      return [
        {
          duracion: duracionTrazoDe(crudo.duracion),
          cuerdas: cuerdasPasoDe(crudo.cuerdas),
        },
      ];
    });

    if (pasos.length === 0) {
      return null;
    }

    return { tipo: "punteo", pasos };
  }

  return null;
}

export function normalizarTrazos(value: unknown): TrazoRasgueo[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  if (typeof value[0] === "string") {
    const golpes = normalizarGolpes(value);

    if (golpes.every((golpe) => golpe === "vacio")) {
      return [];
    }

    return golpes.map(trazoDesdeViejo);
  }

  return value.flatMap((item) => {
    const trazo = trazoDe(item);
    return trazo ? [trazo] : [];
  });
}

export function duracionDeTrazo(trazo: TrazoRasgueo): number {
  if (trazo.tipo === "punteo") {
    return trazo.pasos.reduce(
      (total, paso) => total + DURACION_TRAZO_NEGRAS[paso.duracion],
      0,
    );
  }

  return DURACION_TRAZO_NEGRAS[trazo.duracion];
}

export function moverDuracionTrazo(
  duracion: DuracionTrazo,
  delta: -1 | 1,
): DuracionTrazo {
  const index = DURACIONES_TRAZO.indexOf(duracion);
  const next = Math.min(
    DURACIONES_TRAZO.length - 1,
    Math.max(0, index + delta),
  );

  return DURACIONES_TRAZO[next];
}

export function normalizarDedos(value: unknown): (DedoPunteo | null)[] {
  const dedos = dedosVacios();

  if (!Array.isArray(value)) {
    return dedos;
  }

  for (let index = 0; index < PUNTEO_CELDAS; index += 1) {
    const dedo = value[index];

    if (
      typeof dedo === "string" &&
      DEDOS_VALIDOS.includes(dedo as DedoPunteo)
    ) {
      dedos[index] = dedo as DedoPunteo;
    }
  }

  return dedos;
}

export function normalizarPasosPunteo(
  pasos: unknown,
  dedos: unknown,
): PasoPunteoRasgueo[] {
  if (Array.isArray(pasos) && pasos.length > 0) {
    const parsed = pasos.flatMap((paso) => {
      if (!paso || typeof paso !== "object") {
        return [];
      }

      const crudo = paso as Record<string, unknown>;

      return [
        {
          duracion: duracionTrazoDe(crudo.duracion),
          cuerdas: cuerdasPasoDe(crudo.cuerdas),
        },
      ];
    });

    if (parsed.length > 0) {
      return parsed;
    }
  }

  if (Array.isArray(dedos)) {
    const flat = normalizarDedos(dedos);

    return Array.from({ length: RASGUEO_COLUMNAS }, (_, columna) => ({
      duracion: "corchea" as const,
      cuerdas: Array.from(
        { length: PUNTEO_CUERDAS },
        (_, cuerda) => flat[cuerda * RASGUEO_COLUMNAS + columna] ?? null,
      ),
    }));
  }

  return [
    {
      duracion: "corchea",
      cuerdas: Array.from({ length: PUNTEO_CUERDAS }, () => null),
    },
  ];
}

function isRasgueoColor(value: unknown): value is RasgueoColor {
  return (
    typeof value === "string" &&
    RASGUEO_COLORES_VALIDOS.includes(value as RasgueoColor)
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

    if (item.tipo === "rasgueo") {
      anotacion.corte = item.corte === true;

      if (!anotacion.corte) {
        if (typeof item.patronId !== "string" || item.patronId.length === 0) {
          continue;
        }

        anotacion.patronId = item.patronId;
        anotacion.rasgueoColor = isRasgueoColor(item.rasgueoColor)
          ? item.rasgueoColor
          : "verde";
        anotacion.trazos = normalizarTrazos(
          Array.isArray(item.trazos) ? item.trazos : item.golpes,
        );

        if (typeof anotacion.texto === "string") {
          anotacion.texto = anotacion.texto.slice(0, 24);
        }

        if (item.catalogo === true) {
          anotacion.catalogo = true;
        }
      }
    }

    if (item.tipo === "punteo") {
      anotacion.pasos = normalizarPasosPunteo(item.pasos, item.dedos);
      anotacion.patronId =
        typeof item.patronId === "string" && item.patronId.length > 0
          ? item.patronId
          : anotacion.id;

      if (typeof anotacion.texto === "string") {
        anotacion.texto = anotacion.texto.slice(0, 24);
      }

      if (item.catalogo === true) {
        anotacion.catalogo = true;
      }
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
