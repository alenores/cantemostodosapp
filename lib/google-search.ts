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

export async function buscarLetras(query: string): Promise<ResultadoBusqueda[]> {
  const params = new URLSearchParams({ exp: query });
  const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-AR,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; CantemosTodosApp/1.0; +https://cantemostodosapp.vercel.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `La Cuerda respondió con status ${response.status} al buscar "${query}"`,
    );
  }

  const html = await response.text();
  return parseLaCuerdaSearchHtml(html);
}
