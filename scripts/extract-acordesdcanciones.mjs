import * as cheerio from "cheerio";

const URL = "https://acordesdcanciones.com/los-piojos-tan-solo/";

const FETCH_HEADERS = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: "https://acordesdcanciones.com/",
};

function cleanLetraText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paragraphToText($, paragraph) {
  const clone = $(paragraph).clone();
  clone.find("script, style").remove();
  clone.find("br").replaceWith("\n");

  return clone
    .text()
    .split("\n")
    .map((line) => line.replace(/\s+$/g, "").replace(/^\s+/g, (spaces) => (spaces.length > 8 ? "" : spaces)))
    .join("\n");
}

function extractAcordesDeCancionesLetra(html) {
  const $ = cheerio.load(html);
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

  const blocks = [];
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

const response = await fetch(URL, { headers: FETCH_HEADERS, cache: "no-store" });
console.log("Fetch status:", response.status);

const html = await response.text();
const letra = extractAcordesDeCancionesLetra(html);

if (!letra) {
  console.error("No se pudo extraer la letra.");
  process.exit(1);
}

console.log("\n========== LETRA EXTRAÍDA ==========\n");
console.log(letra);
console.log("\n========== FIN ==========");
console.log(`\nCaracteres: ${letra.length} | Líneas: ${letra.split("\n").length}`);
