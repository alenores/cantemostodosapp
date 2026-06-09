import type { ResultadoBusqueda } from "@/types";

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const MAX_RESULTS_TOTAL = 8;
const MAX_ACORDES_RESULTS = 5;
const MAX_CIFRA_RESULTS = 4;

const TITLE_SUFFIX_PATTERN =
  /\s*[\|·]\s*(La Cuerda|Cifra Club|Acordes de Canciones|Ultimate Guitar).*$/i;
const PARENTHETICAL_PATTERN = /\s*\([^)]*\)\s*$/;

type BraveWebResult = {
  title: string;
  url: string;
};

type BraveSearchResponse = {
  web?: {
    results?: BraveWebResult[];
  };
  message?: string;
};

function getBraveApiKey(): string {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;

  if (!apiKey) {
    throw new Error("Falta BRAVE_SEARCH_API_KEY en el entorno");
  }

  return apiKey;
}

export function extractSitio(url: string): string {
  const hostname = new URL(url).hostname.replace(/^www\./i, "");

  if (hostname.includes("acordesdcanciones")) {
    return "acordesdcanciones";
  }

  if (hostname.includes("cifraclub")) {
    return "cifraclub";
  }

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

function mapBraveResult(item: BraveWebResult): ResultadoBusqueda {
  const { titulo, artista } = parseTituloArtista(item.title);

  return {
    titulo,
    artista,
    url: item.url,
    sitio: extractSitio(item.url),
  };
}

function mergeResultados(
  acordes: ResultadoBusqueda[],
  cifra: ResultadoBusqueda[],
): ResultadoBusqueda[] {
  const seen = new Set<string>();
  const merged: ResultadoBusqueda[] = [];

  for (const item of [...acordes, ...cifra]) {
    if (seen.has(item.url)) {
      continue;
    }

    seen.add(item.url);
    merged.push(item);

    if (merged.length >= MAX_RESULTS_TOTAL) {
      break;
    }
  }

  return merged;
}

async function buscarEnSitio(
  query: string,
  site: string,
  count: number,
  apiKey: string,
): Promise<ResultadoBusqueda[]> {
  const params = new URLSearchParams({
    q: `${query} site:${site}`,
    count: String(count),
    search_lang: "es",
    country: "AR",
  });

  const response = await fetch(`${BRAVE_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Brave Search respondió con status ${response.status}`;

    try {
      const errorBody = (await response.json()) as BraveSearchResponse;
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // Mantener mensaje genérico si el cuerpo no es JSON.
    }

    throw new Error(message);
  }

  const data = (await response.json()) as BraveSearchResponse;

  if (!data.web?.results?.length) {
    return [];
  }

  return data.web.results.slice(0, count).map(mapBraveResult);
}

export async function buscarLetras(query: string): Promise<ResultadoBusqueda[]> {
  const apiKey = getBraveApiKey();

  const [acordesSettled, cifraSettled] = await Promise.allSettled([
    buscarEnSitio(
      query,
      "acordesdcanciones.com",
      MAX_ACORDES_RESULTS,
      apiKey,
    ),
    buscarEnSitio(query, "cifraclub.com", MAX_CIFRA_RESULTS, apiKey),
  ]);

  const acordes =
    acordesSettled.status === "fulfilled" ? acordesSettled.value : [];
  const cifra =
    cifraSettled.status === "fulfilled" ? cifraSettled.value : [];

  if (
    acordesSettled.status === "rejected" &&
    cifraSettled.status === "rejected"
  ) {
    const reason = acordesSettled.reason;
    throw reason instanceof Error ? reason : new Error("Error al buscar letras");
  }

  return mergeResultados(acordes, cifra);
}
