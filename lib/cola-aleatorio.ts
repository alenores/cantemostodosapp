import type { CancionInput } from "@/lib/cola-logic";
import type { CancionCancionero, EstadoCola } from "@/types";

export const COLA_ALEATORIO_PENDIENTES_MIN = 4;
export const COLA_ALEATORIO_CARGA_INICIAL = 4;

/** Marca en agregado_avatar_url: canción sumada por modo aleatorio (sin columna nueva). */
export const COLA_AGREGADO_ALEATORIO_AVATAR = "aleatorio://";
export const COLA_AGREGADO_ALEATORIO_NOMBRE = "Aleatorio";

export function isColaAgregadoAleatorio(item: {
  agregado_avatar_url?: string | null;
}): boolean {
  return item.agregado_avatar_url === COLA_AGREGADO_ALEATORIO_AVATAR;
}

export type ColaAleatorioItem = {
  nombre: string;
  artista: string | null;
  url_letra?: string | null;
  letra_texto?: string | null;
  estado: EstadoCola;
};

function songKey(item: {
  nombre: string;
  url_letra?: string | null;
}): string {
  const url = (item.url_letra ?? "").trim();
  if (url) {
    return `url:${url}`;
  }
  return `nombre:${item.nombre.trim().toLowerCase()}`;
}

function toCancionInputFromCola(item: ColaAleatorioItem): CancionInput {
  return {
    nombre: item.nombre,
    artista: item.artista,
    url_letra: (item.url_letra ?? "").trim(),
    letra_texto: item.letra_texto ?? null,
  };
}

function toCancionInputFromCancionero(cancion: CancionCancionero): CancionInput {
  return {
    nombre: cancion.nombre,
    artista: cancion.artista,
    url_letra: `cancionero://${cancion.id}`,
    letra_texto: cancion.letra ?? null,
  };
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/**
 * Elige canciones al azar para el modo aleatorio.
 * Orden de pools: cancionero (no en fila), tocadas, pendientes.
 * Sin avisos; permite repetir si hace falta.
 */
export function pickCancionesAleatorias(
  cancionero: CancionCancionero[],
  cola: ColaAleatorioItem[],
  count: number,
): CancionInput[] {
  if (count <= 0) {
    return [];
  }

  const picked: CancionInput[] = [];
  const pickedKeys = new Set<string>();

  const keysEnFila = new Set(cola.map(songKey));
  const tocadas = cola.filter((item) => item.estado === "tocada");
  const pendientes = cola.filter((item) => item.estado === "pendiente");

  const fresh = shuffleInPlace(
    cancionero.filter((cancion) => {
      const key = songKey({
        nombre: cancion.nombre,
        url_letra: `cancionero://${cancion.id}`,
      });
      return !keysEnFila.has(key);
    }),
  );

  for (const cancion of fresh) {
    if (picked.length >= count) {
      break;
    }
    const input = toCancionInputFromCancionero(cancion);
    const key = songKey(input);
    if (pickedKeys.has(key)) {
      continue;
    }
    pickedKeys.add(key);
    picked.push(input);
  }

  if (picked.length < count && tocadas.length > 0) {
    const tocadasShuffled = shuffleInPlace([...tocadas]);
    for (const item of tocadasShuffled) {
      if (picked.length >= count) {
        break;
      }
      const input = toCancionInputFromCola(item);
      const key = songKey(input);
      if (pickedKeys.has(key)) {
        continue;
      }
      pickedKeys.add(key);
      picked.push(input);
    }
  }

  if (picked.length < count && pendientes.length > 0) {
    const pendientesShuffled = shuffleInPlace([...pendientes]);
    for (const item of pendientesShuffled) {
      if (picked.length >= count) {
        break;
      }
      const input = toCancionInputFromCola(item);
      const key = songKey(input);
      if (pickedKeys.has(key)) {
        continue;
      }
      pickedKeys.add(key);
      picked.push(input);
    }
  }

  // Último recurso: repetir de tocadas / pendientes / cancionero completo
  while (picked.length < count) {
    const fallbackPools: CancionInput[] = [
      ...shuffleInPlace(tocadas.map(toCancionInputFromCola)),
      ...shuffleInPlace(pendientes.map(toCancionInputFromCola)),
      ...shuffleInPlace(cancionero.map(toCancionInputFromCancionero)),
    ].filter((input) => Boolean(input.url_letra.trim()) || Boolean(input.nombre.trim()));

    if (fallbackPools.length === 0) {
      break;
    }

    const choice =
      fallbackPools[Math.floor(Math.random() * fallbackPools.length)]!;
    picked.push(choice);
  }

  return picked;
}
