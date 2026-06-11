import { isUsefulExtractedLetra } from "@/lib/letra-extract";

export type LetraSourceKind =
  | "acordesdcanciones"
  | "cifraclub"
  | "lacuerda"
  | "desconocido";

export type LetraDisplayMode = "texto" | "embed";

export type LetraContenido =
  | { mode: "texto"; texto: string }
  | { mode: "embed"; url: string };

export function getLetraSourceKind(url: string): LetraSourceKind {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname.includes("acordesdcanciones")) {
      return "acordesdcanciones";
    }

    if (hostname.includes("cifraclub")) {
      return "cifraclub";
    }

    if (hostname.includes("lacuerda")) {
      return "lacuerda";
    }

    return "desconocido";
  } catch {
    return "desconocido";
  }
}

/** Fuentes donde priorizamos texto extraído (hoja blanca). Cifra Club va directo a iframe. */
export function shouldPreferTextExtract(url: string): boolean {
  const kind = getLetraSourceKind(url);
  return kind === "acordesdcanciones" || kind === "lacuerda" || kind === "desconocido";
}

/** Iframe embebido con recorte inicial (Cifra Club activa; preview con página web). */
export function shouldApplyEmbedInitialOffset(url: string): boolean {
  const kind = getLetraSourceKind(url);
  return kind === "cifraclub" || kind === "acordesdcanciones";
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
