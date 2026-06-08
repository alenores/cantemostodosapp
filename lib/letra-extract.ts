import * as cheerio from "cheerio";

const FETCH_TIMEOUT_MS = 15_000;

const ALLOWED_HOST_SUFFIXES = [
  "acordesdcanciones.com",
  "lacuerda.net",
  "cifraclub.com",
  "cifraclub.com.br",
];

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
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
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

function paragraphToText(
  $: cheerio.CheerioAPI,
  paragraph: ReturnType<cheerio.CheerioAPI>,
): string {
  const clone = paragraph.clone();
  clone.find("script, style").remove();
  clone.find("br").replaceWith("\n");

  return clone
    .text()
    .split("\n")
    .map((line) =>
      line
        .replace(/\s+$/g, "")
        .replace(/^\s+/g, (spaces) => (spaces.length > 8 ? "" : spaces)),
    )
    .join("\n");
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

function extractAcordesDeCancionesLetra($: cheerio.CheerioAPI): string | null {
  const content = $(".entry-content.single-content").first();

  if (content.length === 0) {
    return null;
  }

  const heading = content
    .find("h2")
    .filter((_, el) => /letra\s+y\s+acordes/i.test($(el).text()))
    .first();

  if (heading.length === 0) {
    return null;
  }

  const blocks: string[] = [];
  let node = heading.next();

  while (node.length > 0) {
    const tag = node.prop("tagName")?.toLowerCase();

    if (tag === "h4") {
      break;
    }

    if (tag === "div") {
      const text = node.text().trim();
      if (/letra\s+y\s+música/i.test(text)) {
        blocks.push(text);
      }
    }

    if (tag === "p") {
      const text = paragraphToText($, node);
      if (text.trim()) {
        blocks.push(text);
      }
    }

    node = node.next();
  }

  if (blocks.length === 0) {
    return null;
  }

  let letra = blocks.join("\n\n");
  letra = letra.replace(
    /Transcripción x .+ para acordesdcanciones\.com\n*/gi,
    "",
  );

  return cleanLetraText(letra);
}

function extractLetraFromHtml(html: string, url: string): string | null {
  const $ = cheerio.load(html);
  const hostname = new URL(url).hostname.toLowerCase();

  if (hostname.includes("acordesdcanciones")) {
    return extractAcordesDeCancionesLetra($);
  }

  if (hostname.includes("lacuerda")) {
    return extractLaCuerdaLetra($);
  }

  if (hostname.includes("cifraclub")) {
    return extractCifraClubLetra($);
  }

  return (
    extractAcordesDeCancionesLetra($) ??
    extractLaCuerdaLetra($) ??
    extractCifraClubLetra($)
  );
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
