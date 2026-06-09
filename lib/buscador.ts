import { extractSitio } from "@/lib/google-search";
import type { CancionBusquedaLocal } from "@/lib/sala-data";
import type { FuenteBusqueda, ResultadoBusquedaBuscador } from "@/types";

export function mapCancionLocalAResultado(
  cancion: CancionBusquedaLocal,
  fuente: Extract<FuenteBusqueda, "cancionero" | "link-guardado">,
): ResultadoBusquedaBuscador {
  const url =
    fuente === "cancionero"
      ? `cancionero://${cancion.id}`
      : cancion.url_letra;

  return {
    id: cancion.id,
    titulo: cancion.nombre,
    artista: cancion.artista ?? "",
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
