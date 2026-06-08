import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 15_000;

const ALLOWED_HOST_SUFFIXES = ["lacuerda.net", "cifraclub.com", "cifraclub.com.br"];

const FETCH_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export function isAllowedLetraUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();

    return ALLOWED_HOST_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

function cleanLetraText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractFromSelectors(
  $: cheerio.CheerioAPI,
  selectors: string[],
): string | null {
  for (const selector of selectors) {
    const element = $(selector).first();

    if (element.length === 0) {
      continue;
    }

    const text = cleanLetraText(element.text());

    if (text.length > 0) {
      return text;
    }
  }

  return null;
}

function extractLaCuerdaLetra($: cheerio.CheerioAPI): string | null {
  const fromSelectors = extractFromSelectors($, [".letra", "#letra", ".txt"]);

  if (fromSelectors) {
    return fromSelectors;
  }

  const pres = $("pre");

  if (pres.length === 0) {
    return null;
  }

  return cleanLetraText(pres.last().text());
}

function extractCifraClubLetra($: cheerio.CheerioAPI): string | null {
  return extractFromSelectors($, [
    "#ct_cifra",
    "pre#ct_cifra",
    ".cifra_cnt",
    ".cifra-container pre",
    "[class*='cifra'] pre",
  ]);
}

function extractLetraFromHtml(html: string, url: string): string | null {
  const $ = cheerio.load(html);
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("lacuerda")) {
    return extractLaCuerdaLetra($);
  }

  if (hostname.includes("cifraclub")) {
    return extractCifraClubLetra($);
  }

  return extractLaCuerdaLetra($) ?? extractCifraClubLetra($);
}

export async function obtenerLetraDesdeUrl(url: string): Promise<string> {
  if (!isAllowedLetraUrl(url)) {
    throw new Error("URL no permitida");
  }

  const pageUrl = new URL(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        ...FETCH_HEADERS,
        Referer: `${pageUrl.origin}/`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`El sitio respondió con status ${response.status}`);
    }

    const html = await response.text();
    const letra = extractLetraFromHtml(html, url);

    if (!letra) {
      throw new Error("No se pudo extraer la letra del HTML");
    }

    return letra;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al obtener la letra");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
