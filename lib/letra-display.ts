import { isCancioneroUrl } from "@/lib/cancionero-url";
import { isUsefulExtractedLetra } from "@/lib/letra-extract";
import {
  ACORDESDCANCIONES_EMBED_BOTTOM_CLIP_PX,
  ACORDESDCANCIONES_EMBED_TOP_CLIP_PX,
  CIFRACLUB_EMBED_BOTTOM_CLIP_PX,
  CIFRACLUB_EMBED_TOP_CLIP_PX,
} from "@/lib/sala-layout";

export type LetraSourceKind =
  | "acordesdcanciones"
  | "cifraclub"
  | "desconocido";

export type LetraDisplayMode = "texto" | "embed";

export type LetraContenido =
  | { mode: "texto"; texto: string }
  | { mode: "embed"; url: string };

export function isCifraClubEmbed(url: string): boolean {
  return getLetraSourceKind(url) === "cifraclub";
}

export function getLetraSourceKind(url: string): LetraSourceKind {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname.includes("acordesdcanciones")) {
      return "acordesdcanciones";
    }

    if (hostname.includes("cifraclub")) {
      return "cifraclub";
    }

    return "desconocido";
  } catch {
    return "desconocido";
  }
}

/** Fuentes donde priorizamos texto extraído (hoja blanca). Cifra Club va directo a iframe. */
export function shouldPreferTextExtract(url: string): boolean {
  if (isCancioneroUrl(url)) {
    return false;
  }

  const kind = getLetraSourceKind(url);
  return kind === "acordesdcanciones" || kind === "desconocido";
}

/** Iframe embebido con recorte inicial (Cifra Club activa; preview con página web). */
export function shouldApplyEmbedInitialOffset(url: string): boolean {
  const kind = getLetraSourceKind(url);
  return kind === "cifraclub" || kind === "acordesdcanciones";
}

/** Recorte inferior del iframe (propagandas y controles flotantes). */
export function shouldApplyEmbedBottomClip(url: string): boolean {
  const kind = getLetraSourceKind(url);
  return kind === "cifraclub" || kind === "acordesdcanciones";
}

/** Píxeles de recorte superior según el sitio embebido. */
export function getEmbedTopClipPx(url: string): number | undefined {
  const kind = getLetraSourceKind(url);

  if (kind === "cifraclub") {
    return CIFRACLUB_EMBED_TOP_CLIP_PX;
  }

  if (kind === "acordesdcanciones") {
    return ACORDESDCANCIONES_EMBED_TOP_CLIP_PX;
  }

  return undefined;
}

/** Píxeles de recorte inferior según el sitio embebido (igual en control y lectura). */
export function getEmbedBottomClipPx(url: string): number | undefined {
  const kind = getLetraSourceKind(url);

  if (kind === "cifraclub") {
    return CIFRACLUB_EMBED_BOTTOM_CLIP_PX;
  }

  if (kind === "acordesdcanciones") {
    return ACORDESDCANCIONES_EMBED_BOTTOM_CLIP_PX;
  }

  return undefined;
}

export function resolveLetraContenido(input: {
  letraTexto?: string | null;
  urlLetra?: string | null;
  extractedText?: string | null;
}): LetraContenido | null {
  const manual = input.letraTexto?.trim();

  if (manual) {
    return { mode: "texto", texto: manual };
  }

  const url = input.urlLetra?.trim();

  if (!url) {
    return null;
  }

  if (isCancioneroUrl(url)) {
    return null;
  }

  const extracted = input.extractedText?.trim();

  if (
    extracted &&
    shouldPreferTextExtract(url) &&
    isUsefulExtractedLetra(extracted)
  ) {
    return { mode: "texto", texto: extracted };
  }

  return { mode: "embed", url };
}
