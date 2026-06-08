import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const logoPath = join(root, "public", "logo.svg");
const iconsDir = join(root, "public", "icons");

const svg = readFileSync(logoPath);

mkdirSync(iconsDir, { recursive: true });

async function writePng(size, outputPath) {
  await sharp(svg).resize(size, size).png().toFile(outputPath);
  console.log(`Generated ${outputPath}`);
}

const favicon32 = await sharp(svg).resize(32, 32).png().toBuffer();
writeFileSync(join(root, "public", "favicon.ico"), await toIco([favicon32]));

await writePng(180, join(root, "public", "apple-touch-icon.png"));
await writePng(192, join(root, "public", "icons", "icon-192.png"));
await writePng(512, join(root, "public", "icons", "icon-512.png"));

console.log("Generated public/favicon.ico");
console.log("Icon generation complete.");
