import { extractSitio, parseTituloArtista } from "@/lib/brave-search";
import type { CancionBusquedaLocal } from "@/lib/sala-data";
import type { FuenteBusqueda, ResultadoBusquedaBuscador } from "@/types";

export function resolverNombreArtistaDisplay(
  nombre: string,
  artista?: string | null,
): { nombre: string; artista: string } {
  const nombreTrim = nombre.trim();
  const artistaTrim = artista?.trim() ?? "";

  if (artistaTrim) {
    return { nombre: nombreTrim, artista: artistaTrim };
  }

  const parsed = parseTituloArtista(nombreTrim);

  return {
    nombre: parsed.titulo,
    artista: parsed.artista,
  };
}

export function mapCancionLocalAResultado(
  cancion: CancionBusquedaLocal,
  fuente: Extract<FuenteBusqueda, "cancionero" | "link-guardado">,
): ResultadoBusquedaBuscador {
  const url =
    fuente === "cancionero"
      ? `cancionero://${cancion.id}`
      : cancion.url_letra;

  const { nombre, artista } = resolverNombreArtistaDisplay(
    cancion.nombre,
    cancion.artista,
  );

  return {
    id: cancion.id,
    titulo: nombre,
    artista,
    url,
    sitio:
      fuente === "cancionero"
        ? "cancionero"
        : extractSitio(cancion.url_letra),
    fuente,
    letra: cancion.letra,
  };
}

export function resultadoKey(resultado: ResultadoBusquedaBuscador): string {
  if (resultado.fuente === "cancionero") {
    return `cancionero-${resultado.id}`;
  }

  if (resultado.fuente === "link-guardado") {
    return `link-${resultado.id}`;
  }

  return resultado.url;
}

export function esAcordesDeCanciones(sitio: string, url: string): boolean {
  return (
    sitio === "acordesdcanciones" ||
    url.includes("acordesdcanciones.com")
  );
}

export function esCifraClub(sitio: string, url: string): boolean {
  return sitio === "cifraclub" || url.includes("cifraclub");
}

export type ResultadoIconoTipo = "cancionero" | "acordes" | "cifra";

export function getResultadoIconoTipo(
  resultado: ResultadoBusquedaBuscador,
): ResultadoIconoTipo {
  if (resultado.fuente === "cancionero") {
    return "cancionero";
  }

  if (esAcordesDeCanciones(resultado.sitio, resultado.url)) {
    return "acordes";
  }

  return "cifra";
}

export function getColaItemIconoTipo(item: {
  url_letra: string;
  letra_texto?: string | null;
}): ResultadoIconoTipo {
  if (item.letra_texto?.trim()) {
    return "cancionero";
  }

  const url = item.url_letra?.trim() ?? "";

  if (!url) {
    return "cancionero";
  }

  if (esAcordesDeCanciones(extractSitio(url), url)) {
    return "acordes";
  }

  return "cifra";
}
