import {
  crearAnotacionId,
  DURACION_TRAZO_NEGRAS,
  normalizarPasosPunteo,
  normalizarTrazos,
  PUNTEO_CUERDAS,
  RASGUEO_COLUMNAS,
  removeAnotacion,
  upsertAnotacion,
  type Anotacion,
  type DedoPunteo,
  type PasoPunteoRasgueo,
  type RasgueoColor,
  type RasgueoGolpe,
  type TrazoRasgueo,
} from "@/lib/anotaciones-practica";
import type { TipoCompas } from "@/lib/cifrado";

export const RASGUEO_CONTEO = ["1", "y", "2", "y", "3", "y", "4", "y"] as const;

export const RASGUEO_COLORES: RasgueoColor[] = [
  "verde",
  "azul",
  "violeta",
  "rosa",
];

export const RASGUEO_COLOR_CSS: Record<RasgueoColor, string> = {
  verde: "#4ade80",
  azul: "#60a5fa",
  violeta: "#c4b5fd",
  rosa: "#f472b6",
};

export const RASGUEO_COLOR_LABEL: Record<RasgueoColor, string> = {
  verde: "Verde",
  azul: "Azul",
  violeta: "Violeta",
  rosa: "Rosa",
};

export const DEDOS_PUNTEO: DedoPunteo[] = ["P", "I", "M", "A"];

export const DEDO_PUNTEO_LABEL: Record<DedoPunteo, string> = {
  P: "Pulgar",
  I: "Índice",
  M: "Medio",
  A: "Anular",
};

export const DEDO_PUNTEO_CSS: Record<DedoPunteo, string> = {
  P: "#d97706",
  I: "#0284c7",
  M: "#059669",
  A: "#7c3aed",
};

/** La 1 es la más aguda y va arriba, como en una tablatura. */
export const PUNTEO_CUERDA_LABEL = ["1", "2", "3", "4", "5", "6"] as const;

export type RasgueoPatron = {
  id: string;
  nombre: string;
  color: RasgueoColor;
  trazos: TrazoRasgueo[];
};

export type PunteoPatron = {
  id: string;
  nombre: string;
  pasos: PasoPunteoRasgueo[];
};

export function nombreRasgueo(anotacion: Anotacion): string {
  const nombre = anotacion.texto?.trim();
  return nombre && nombre.length > 0 ? nombre : "Rasgueo";
}

export function nombrePunteo(anotacion: Anotacion): string {
  const nombre = anotacion.texto?.trim();
  return nombre && nombre.length > 0 ? nombre : "Punteo";
}

function patronRasgueoDesde(item: Anotacion): RasgueoPatron {
  return {
    id: item.patronId ?? "",
    nombre: nombreRasgueo(item),
    color: item.rasgueoColor ?? "verde",
    trazos: normalizarTrazos(item.trazos),
  };
}

export function patronesRasgueo(items: Anotacion[]): RasgueoPatron[] {
  const orden: string[] = [];
  const datos = new Map<string, RasgueoPatron>();

  for (const item of items) {
    if (item.tipo !== "rasgueo" || item.corte || !item.patronId || item.catalogo) {
      continue;
    }

    if (!datos.has(item.patronId)) {
      orden.push(item.patronId);
      datos.set(item.patronId, patronRasgueoDesde(item));
    }
  }

  for (const item of items) {
    if (item.tipo !== "rasgueo" || item.corte || !item.patronId || !item.catalogo) {
      continue;
    }

    if (!datos.has(item.patronId)) {
      orden.push(item.patronId);
    }

    datos.set(item.patronId, patronRasgueoDesde(item));
  }

  return orden.map((id) => datos.get(id)!);
}

function patronPunteoDesde(item: Anotacion): PunteoPatron {
  return {
    id: item.patronId ?? "",
    nombre: nombrePunteo(item),
    pasos: normalizarPasosPunteo(item.pasos, item.dedos),
  };
}

export function patronesPunteo(items: Anotacion[]): PunteoPatron[] {
  const orden: string[] = [];
  const datos = new Map<string, PunteoPatron>();

  for (const item of items) {
    if (item.tipo !== "punteo" || !item.patronId || item.catalogo) {
      continue;
    }

    if (!datos.has(item.patronId)) {
      orden.push(item.patronId);
      datos.set(item.patronId, patronPunteoDesde(item));
    }
  }

  for (const item of items) {
    if (item.tipo !== "punteo" || !item.patronId || !item.catalogo) {
      continue;
    }

    if (!datos.has(item.patronId)) {
      orden.push(item.patronId);
    }

    datos.set(item.patronId, patronPunteoDesde(item));
  }

  return orden.map((id) => datos.get(id)!);
}

/** Color del tramo en cada renglón. null = ese renglón no tiene rasgueo. */
export function colorTramoPorLinea(
  items: Anotacion[],
  lineCount: number,
): (string | null)[] {
  const marcas = items
    .filter((item) => item.tipo === "rasgueo" && !item.catalogo)
    .sort(
      (a, b) => a.lineIndex - b.lineIndex || a.charOffset - b.charOffset,
    );

  const colores: (string | null)[] = Array.from(
    { length: lineCount },
    () => null,
  );
  let actual: string | null = null;
  let indice = 0;

  for (let line = 0; line < lineCount; line += 1) {
    while (indice < marcas.length && marcas[indice].lineIndex < line) {
      indice += 1;
    }

    while (indice < marcas.length && marcas[indice].lineIndex === line) {
      const marca = marcas[indice];
      actual = marca.corte
        ? null
        : RASGUEO_COLOR_CSS[marca.rasgueoColor ?? "verde"];
      indice += 1;
    }

    colores[line] = actual;
  }

  return colores;
}

export function siguienteGolpe(golpe: RasgueoGolpe): RasgueoGolpe {
  if (golpe === "vacio") {
    return "abajo";
  }

  if (golpe === "abajo") {
    return "arriba";
  }

  if (golpe === "arriba") {
    return "apagado";
  }

  return "vacio";
}

export function siguienteColorLibre(cantidad: number): RasgueoColor {
  return RASGUEO_COLORES[cantidad % RASGUEO_COLORES.length];
}

function quitarEnPunto(
  items: Anotacion[],
  tipo: "rasgueo" | "punteo",
  lineIndex: number,
  charOffset: number,
): Anotacion[] {
  return items.filter(
    (item) =>
      !(
        item.tipo === tipo &&
        !item.catalogo &&
        item.lineIndex === lineIndex &&
        item.charOffset === charOffset
      ),
  );
}

export function colocarMarcaRasgueo(
  items: Anotacion[],
  marca: {
    id?: string;
    lineIndex: number;
    charOffset: number;
    patronId: string;
    nombre: string;
    color: RasgueoColor;
    trazos: TrazoRasgueo[];
  },
): Anotacion[] {
  const anotacion: Anotacion = {
    id: marca.id ?? crearAnotacionId(),
    tipo: "rasgueo",
    lineIndex: marca.lineIndex,
    charOffset: marca.charOffset,
    patronId: marca.patronId,
    texto: marca.nombre.slice(0, 24),
    rasgueoColor: marca.color,
    trazos: normalizarTrazos(marca.trazos),
  };

  return upsertAnotacion(
    quitarEnPunto(items, "rasgueo", marca.lineIndex, marca.charOffset),
    anotacion,
  );
}

export function colocarCorteRasgueo(
  items: Anotacion[],
  lineIndex: number,
  charOffset: number,
  id?: string,
): Anotacion[] {
  const anotacion: Anotacion = {
    id: id ?? crearAnotacionId(),
    tipo: "rasgueo",
    lineIndex,
    charOffset,
    corte: true,
  };

  return upsertAnotacion(
    quitarEnPunto(items, "rasgueo", lineIndex, charOffset),
    anotacion,
  );
}

export function colocarPunteo(
  items: Anotacion[],
  marca: {
    id?: string;
    lineIndex: number;
    charOffset: number;
    patronId: string;
    nombre: string;
    pasos: PasoPunteoRasgueo[];
  },
): Anotacion[] {
  const anotacion: Anotacion = {
    id: marca.id ?? crearAnotacionId(),
    tipo: "punteo",
    lineIndex: marca.lineIndex,
    charOffset: marca.charOffset,
    patronId: marca.patronId,
    texto: marca.nombre.slice(0, 24),
    pasos: normalizarPasosPunteo(marca.pasos, undefined),
  };

  return upsertAnotacion(
    quitarEnPunto(items, "punteo", marca.lineIndex, marca.charOffset),
    anotacion,
  );
}

export function guardarCatalogoRasgueo(
  items: Anotacion[],
  patron: {
    patronId: string;
    nombre: string;
    color: RasgueoColor;
    trazos: TrazoRasgueo[];
  },
): Anotacion[] {
  const existente = items.find(
    (item) =>
      item.tipo === "rasgueo" &&
      item.catalogo &&
      item.patronId === patron.patronId,
  );
  const anotacion: Anotacion = {
    id: existente?.id ?? crearAnotacionId(),
    tipo: "rasgueo",
    lineIndex: 0,
    charOffset: 0,
    catalogo: true,
    patronId: patron.patronId,
    texto: patron.nombre.slice(0, 24),
    rasgueoColor: patron.color,
    trazos: normalizarTrazos(patron.trazos),
  };

  if (!existente) {
    return [...items, anotacion];
  }

  return items.map((item) => (item.id === existente.id ? anotacion : item));
}

export function guardarCatalogoPunteo(
  items: Anotacion[],
  patron: {
    patronId: string;
    nombre: string;
    pasos: PasoPunteoRasgueo[];
  },
): Anotacion[] {
  const existente = items.find(
    (item) =>
      item.tipo === "punteo" &&
      item.catalogo &&
      item.patronId === patron.patronId,
  );
  const anotacion: Anotacion = {
    id: existente?.id ?? crearAnotacionId(),
    tipo: "punteo",
    lineIndex: 0,
    charOffset: 0,
    catalogo: true,
    patronId: patron.patronId,
    texto: patron.nombre.slice(0, 24),
    pasos: normalizarPasosPunteo(patron.pasos, undefined),
  };

  if (!existente) {
    return [...items, anotacion];
  }

  return items.map((item) => (item.id === existente.id ? anotacion : item));
}

export function actualizarPatronRasgueo(
  items: Anotacion[],
  patronId: string,
  patch: { nombre?: string; color?: RasgueoColor; trazos?: TrazoRasgueo[] },
): Anotacion[] {
  return items.map((item) => {
    if (item.tipo !== "rasgueo" || item.patronId !== patronId) {
      return item;
    }

    return {
      ...item,
      texto:
        patch.nombre !== undefined ? patch.nombre.slice(0, 24) : item.texto,
      rasgueoColor: patch.color ?? item.rasgueoColor,
      trazos: patch.trazos ? normalizarTrazos(patch.trazos) : item.trazos,
    };
  });
}

export function borrarPatronRasgueo(
  items: Anotacion[],
  patronId: string,
): Anotacion[] {
  return items.filter(
    (item) => !(item.tipo === "rasgueo" && item.patronId === patronId),
  );
}

export function actualizarPatronPunteo(
  items: Anotacion[],
  patronId: string,
  patch: { nombre?: string; pasos?: PasoPunteoRasgueo[] },
): Anotacion[] {
  return items.map((item) => {
    if (item.tipo !== "punteo" || item.patronId !== patronId) {
      return item;
    }

    return {
      ...item,
      texto:
        patch.nombre !== undefined ? patch.nombre.slice(0, 24) : item.texto,
      pasos: patch.pasos
        ? normalizarPasosPunteo(patch.pasos, undefined)
        : item.pasos,
    };
  });
}

export function borrarPatronPunteo(
  items: Anotacion[],
  patronId: string,
): Anotacion[] {
  return items.filter(
    (item) => !(item.tipo === "punteo" && item.patronId === patronId),
  );
}

export function quitarMarcaCuerda(
  items: Anotacion[],
  id: string,
): Anotacion[] {
  return removeAnotacion(items, id);
}

export function pasosDePunteo(anotacion: Anotacion): PasoPunteoRasgueo[] {
  return normalizarPasosPunteo(anotacion.pasos, anotacion.dedos);
}

export function trazosDeRasgueo(anotacion: Anotacion): TrazoRasgueo[] {
  return normalizarTrazos(anotacion.trazos ?? []);
}

/** Cuántas negras entran en un compás. En 6/8 son tres. */
export function negrasPorCompas(tipo?: TipoCompas): number {
  if (tipo === "3-4" || tipo === "6-8") {
    return 3;
  }

  return 4;
}

export { DURACION_TRAZO_NEGRAS, PUNTEO_CUERDAS, RASGUEO_COLUMNAS };
