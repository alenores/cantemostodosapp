import * as cheerio from "cheerio";
import { writeFileSync } from "fs";

const URL = "https://acordesdcanciones.com/los-piojos-tan-solo/";

const response = await fetch(URL, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
});

const html = await response.text();
const $ = cheerio.load(html);

const content = $(".entry-content.single-content").first();
console.log("entry-content children:", content.children().length);
console.log("entry-content html length:", content.html()?.length);

content.children().each((i, child) => {
  const tag = child.tagName;
  const className = $(child).attr("class") ?? "";
  const textLen = $(child).text().trim().length;
  const preview = $(child).text().trim().slice(0, 80).replace(/\s+/g, " ");
  console.log(`[${i}] <${tag} class="${className}"> len=${textLen} | ${preview}`);
});

// dump raw html of entry-content to file for inspection
writeFileSync(
  "scripts/acordes-sample.html",
  content.html() ?? "",
  "utf8",
);

console.log("\nWrote scripts/acordes-sample.html");
