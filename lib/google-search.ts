import type { ResultadoBusqueda } from "@/types";

type GoogleSearchItem = {
  title: string;
  link: string;
};

type GoogleSearchResponse = {
  items?: GoogleSearchItem[];
  error?: {
    message?: string;
  };
};

const GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1";
const MAX_RESULTS = 8;

const TITLE_SUFFIX_PATTERN =
  /\s*[\|·]\s*(La Cuerda|Cifra Club|Ultimate Guitar).*$/i;
const PARENTHETICAL_PATTERN = /\s*\([^)]*\)\s*$/;

function getGoogleCredentials(): { apiKey: string; cseId: string } {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    throw new Error("Faltan GOOGLE_API_KEY o GOOGLE_CSE_ID en el entorno");
  }

  return { apiKey, cseId };
}

export function extractSitio(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./i, "");
  const parts = hostname.split(".");

  if (parts.length >= 3 && parts[0].length <= 3) {
    return parts[parts.length - 2];
  }

  return parts[0];
}

export function parseTituloArtista(title: string): {
  titulo: string;
  artista: string;
} {
  let cleaned = title.trim();
  cleaned = cleaned.replace(TITLE_SUFFIX_PATTERN, "");
  cleaned = cleaned.replace(PARENTHETICAL_PATTERN, "").trim();

  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    return {
      titulo: byMatch[1].trim(),
      artista: byMatch[2].trim(),
    };
  }

  const dashParts = cleaned.split(/\s+-\s+/);
  if (dashParts.length === 2) {
    return {
      titulo: dashParts[0].trim(),
      artista: dashParts[1].trim(),
    };
  }

  return {
    titulo: cleaned,
    artista: "",
  };
}

function mapGoogleItem(item: GoogleSearchItem): ResultadoBusqueda {
  const { titulo, artista } = parseTituloArtista(item.title);

  return {
    titulo,
    artista,
    url: item.link,
    sitio: extractSitio(item.link),
  };
}

export async function buscarLetras(query: string): Promise<ResultadoBusqueda[]> {
  const { apiKey, cseId } = getGoogleCredentials();

  const params = new URLSearchParams({
    key: apiKey,
    cx: cseId,
    q: query,
    num: String(MAX_RESULTS),
  });

  const response = await fetch(`${GOOGLE_SEARCH_URL}?${params.toString()}`);

  if (!response.ok) {
    let message = `Google Custom Search respondió con status ${response.status}`;

    try {
      const errorBody = (await response.json()) as GoogleSearchResponse;
      if (errorBody.error?.message) {
        message = errorBody.error.message;
      }
    } catch {
      // Mantener mensaje genérico si el cuerpo no es JSON.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as GoogleSearchResponse;

  if (!data.items?.length) {
    return [];
  }

  return data.items.map(mapGoogleItem);
}
