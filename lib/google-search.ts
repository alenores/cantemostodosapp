import type { ResultadoBusqueda } from "@/types";
import * as cheerio from "cheerio";

const BASE_URL = "https://acordes.lacuerda.net";
const SEARCH_URL = `${BASE_URL}/busca.php`;
const MAX_RESULTS = 8;
const SHTML_URL_PATTERN = /['"]([^'"]+\.shtml(?:\?[^'"]*)?)['"]/i;

function toLaCuerdaSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeSongUrl(rawUrl: string, artistSlug: string): string | null {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.split("#")[0];
  }

  if (trimmed.startsWith("/")) {
    return `${BASE_URL}${trimmed.split("#")[0]}`;
  }

  if (trimmed.includes(".shtml")) {
    if (trimmed.includes("/")) {
      return `${BASE_URL}/${trimmed.replace(/^\/+/, "").split("#")[0]}`;
    }

    return `${BASE_URL}/${artistSlug}/${trimmed.split("#")[0]}`;
  }

  return null;
}

function extractArtistSlug(href: string): string | null {
  try {
    const url = new URL(href, BASE_URL);
    const [slug] = url.pathname.split("/").filter(Boolean);

    if (!slug || slug.includes(".") || slug === "busca") {
      return null;
    }

    return slug;
  } catch {
    return null;
  }
}

type SongAnchor = {
  href: string;
  onclick: string;
  text: string;
};

function extractSongUrl(anchor: SongAnchor, artistSlug: string): string | null {
  const href = anchor.href.trim();

  if (href.includes(".shtml")) {
    return normalizeSongUrl(href, artistSlug);
  }

  const onclick = anchor.onclick;
  const onclickMatch = onclick.match(SHTML_URL_PATTERN);

  if (onclickMatch) {
    return normalizeSongUrl(onclickMatch[1], artistSlug);
  }

  const songName = anchor.text.trim();

  if (
    songName &&
    (href.startsWith("javascript") || href === "#" || href === "")
  ) {
    const slug = toLaCuerdaSlug(songName);

    if (slug) {
      return `${BASE_URL}/${artistSlug}/${slug}.shtml`;
    }
  }

  return null;
}

function isNavigationLink(text: string, href: string): boolean {
  const lowered = text.toLowerCase();

  return (
    !text ||
    lowered === "pertinencia" ||
    lowered === "canción" ||
    lowered === "cancion" ||
    lowered === "artista" ||
    href.includes("javascript:s") ||
    href.includes("javascript:S")
  );
}

export function parseLaCuerdaSearchHtml(html: string): ResultadoBusqueda[] {
  const $ = cheerio.load(html);
  const results: ResultadoBusqueda[] = [];
  const seenUrls = new Set<string>();

  $("table tr").each((_, row) => {
    const $row = $(row);
    const $artistLink = $row
      .find(`a[href*="${BASE_URL}/"], a[href^="/"]`)
      .filter((_, anchor) => {
        const href = $(anchor).attr("href") ?? "";
        return Boolean(extractArtistSlug(href));
      })
      .first();

    const artistHref = $artistLink.attr("href");

    if (!artistHref) {
      return;
    }

    const artistSlug = extractArtistSlug(artistHref);

    if (!artistSlug) {
      return;
    }

    const artista = $artistLink.text().trim();

    $row.find("a").each((_, anchor) => {
      if (results.length >= MAX_RESULTS) {
        return false;
      }

      const $anchor = $(anchor);
      const href = $anchor.attr("href") ?? "";
      const text = $anchor.text().trim();

      if ($anchor.is($artistLink) || isNavigationLink(text, href)) {
        return;
      }

      const url = extractSongUrl(
        {
          href,
          onclick: $anchor.attr("onclick") ?? $anchor.attr("onClick") ?? "",
          text,
        },
        artistSlug,
      );

      if (!url || !url.includes(".shtml") || seenUrls.has(url)) {
        return;
      }

      seenUrls.add(url);
      results.push({
        titulo: text,
        artista,
        url,
        sitio: "lacuerda",
      });
    });
  });

  if (results.length > 0) {
    return results.slice(0, MAX_RESULTS);
  }

  $(`a[href*=".shtml"]`).each((_, anchor) => {
    if (results.length >= MAX_RESULTS) {
      return false;
    }

    const $anchor = $(anchor);
    const href = $anchor.attr("href") ?? "";
    const url = normalizeSongUrl(href, "");

    if (!url || seenUrls.has(url)) {
      return;
    }

    const artistSlug = extractArtistSlug(url);

    if (!artistSlug) {
      return;
    }

    const titulo = $anchor.text().trim();

    if (!titulo) {
      return;
    }

    seenUrls.add(url);
    results.push({
      titulo,
      artista: "",
      url,
      sitio: "lacuerda",
    });
  });

  return results.slice(0, MAX_RESULTS);
}

const LA_CUERDA_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  Referer: `${BASE_URL}/`,
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
};

function formatFetchError(error: unknown, query: string): string {
  if (!(error instanceof Error)) {
    return `Error de red al buscar "${query}" en La Cuerda`;
  }

  const cause = error.cause as { code?: string; message?: string } | undefined;
  const code = cause?.code ?? "";

  if (code === "UND_ERR_CONNECT_TIMEOUT" || code === "ETIMEDOUT") {
    return `La Cuerda no respondió (timeout${code ? `: ${code}` : ""}). Posible bloqueo de IP de datacenter al buscar "${query}"`;
  }

  if (code === "ECONNREFUSED" || code === "UND_ERR_CONNECT") {
    return `Conexión rechazada por La Cuerda (${code}) al buscar "${query}"`;
  }

  if (cause?.message) {
    return `Error de red al buscar "${query}": ${cause.message}`;
  }

  return error.message || `Error de red al buscar "${query}" en La Cuerda`;
}

export async function buscarLetras(query: string): Promise<ResultadoBusqueda[]> {
  const params = new URLSearchParams({ exp: query });
  const searchUrl = `${SEARCH_URL}?${params.toString()}`;

  let response: Response;

  try {
    response = await fetch(searchUrl, {
      headers: LA_CUERDA_HEADERS,
      cache: "no-store",
    });
  } catch (error) {
    console.error("[lacuerda] fetch failed:", {
      query,
      url: searchUrl,
      error: error instanceof Error ? error.message : error,
      cause:
        error instanceof Error && error.cause
          ? error.cause
          : undefined,
    });
    throw new Error(formatFetchError(error, query));
  }

  if (!response.ok) {
    throw new Error(
      `La Cuerda respondió con status ${response.status} al buscar "${query}"`,
    );
  }

  const html = await response.text();
  return parseLaCuerdaSearchHtml(html);
}
