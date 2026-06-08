"use client";

import type { ResultadoBusqueda } from "@/types";

const BASE_URL = "https://acordes.lacuerda.net";
const SEARCH_URL = `${BASE_URL}/busca.php`;
const CORS_PROXY_PREFIX = "https://corsproxy.io/?";
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

  const onclickMatch = anchor.onclick.match(SHTML_URL_PATTERN);

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

function readAnchor(anchor: HTMLAnchorElement): SongAnchor {
  return {
    href: anchor.getAttribute("href") ?? "",
    onclick:
      anchor.getAttribute("onclick") ?? anchor.getAttribute("onClick") ?? "",
    text: anchor.textContent?.trim() ?? "",
  };
}

export function parseLaCuerdaSearchHtml(html: string): ResultadoBusqueda[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const results: ResultadoBusqueda[] = [];
  const seenUrls = new Set<string>();

  for (const row of doc.querySelectorAll("table tr")) {
    const artistLink = Array.from(row.querySelectorAll("a")).find((anchor) => {
      const href = anchor.getAttribute("href") ?? "";
      return Boolean(extractArtistSlug(href));
    });

    if (!artistLink) {
      continue;
    }

    const artistHref = artistLink.getAttribute("href") ?? "";
    const artistSlug = extractArtistSlug(artistHref);

    if (!artistSlug) {
      continue;
    }

    const artista = artistLink.textContent?.trim() ?? "";

    for (const anchor of row.querySelectorAll("a")) {
      if (results.length >= MAX_RESULTS) {
        break;
      }

      if (anchor === artistLink) {
        continue;
      }

      const { href, onclick, text } = readAnchor(anchor);

      if (isNavigationLink(text, href)) {
        continue;
      }

      const url = extractSongUrl({ href, onclick, text }, artistSlug);

      if (!url || !url.includes(".shtml") || seenUrls.has(url)) {
        continue;
      }

      seenUrls.add(url);
      results.push({
        titulo: text,
        artista,
        url,
        sitio: "lacuerda",
      });
    }
  }

  if (results.length > 0) {
    return results.slice(0, MAX_RESULTS);
  }

  for (const anchor of doc.querySelectorAll('a[href*=".shtml"]')) {
    if (results.length >= MAX_RESULTS) {
      break;
    }

    const href = anchor.getAttribute("href") ?? "";
    const url = normalizeSongUrl(href, "");

    if (!url || seenUrls.has(url)) {
      continue;
    }

    const artistSlug = extractArtistSlug(url);

    if (!artistSlug) {
      continue;
    }

    const titulo = anchor.textContent?.trim() ?? "";

    if (!titulo) {
      continue;
    }

    seenUrls.add(url);
    results.push({
      titulo,
      artista: "",
      url,
      sitio: "lacuerda",
    });
  }

  return results.slice(0, MAX_RESULTS);
}

export function buildLaCuerdaProxyUrl(query: string): string {
  const params = new URLSearchParams({ exp: query });
  const targetUrl = `${SEARCH_URL}?${params.toString()}`;
  return `${CORS_PROXY_PREFIX}${targetUrl}`;
}

function formatFetchError(error: unknown, query: string): string {
  if (!(error instanceof Error)) {
    return `Error de red al buscar "${query}" en La Cuerda`;
  }

  return error.message || `Error de red al buscar "${query}" en La Cuerda`;
}

export async function buscarLetras(query: string): Promise<ResultadoBusqueda[]> {
  const proxyUrl = buildLaCuerdaProxyUrl(query);

  let response: Response;

  try {
    response = await fetch(proxyUrl);
  } catch (error) {
    console.error("[lacuerda] fetch failed:", {
      query,
      url: proxyUrl,
      error: error instanceof Error ? error.message : error,
    });
    throw new Error(formatFetchError(error, query));
  }

  if (!response.ok) {
    let detail = "";

    try {
      detail = await response.text();
    } catch {
      // Ignorar error al leer el cuerpo.
    }

    throw new Error(
      `El proxy CORS respondió con status ${response.status} al buscar "${query}"${detail ? `: ${detail.slice(0, 120)}` : ""}`,
    );
  }

  const html = await response.text();
  return parseLaCuerdaSearchHtml(html);
}
