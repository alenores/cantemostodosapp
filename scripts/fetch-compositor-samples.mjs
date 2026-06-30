/**
 * Descarga samples del Compositor (Tonejs/audio, uso en demos).
 * Ejecutar: node scripts/fetch-compositor-samples.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "samples", "compositor");

const TONEJS_RAW =
  "https://raw.githubusercontent.com/Tonejs/audio/master";

const SAMPLES = [
  {
    file: "piano-c4.mp3",
    url: `${TONEJS_RAW}/salamander/C4.mp3`,
  },
  {
    file: "kick.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/kick.mp3`,
  },
  {
    file: "snare.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/snare.mp3`,
  },
  {
    file: "hihat.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/hihat.mp3`,
  },
  {
    file: "guitar-note.mp3",
    url: `${TONEJS_RAW}/berklee/guitar_LowEstring1.mp3`,
  },
  {
    file: "guitar-strum.mp3",
    url: `${TONEJS_RAW}/berklee/guitar_chord1.mp3`,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const sample of SAMPLES) {
    const response = await fetch(sample.url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${sample.url}: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const target = path.join(OUT_DIR, sample.file);
    await writeFile(target, buffer);
    console.log(`Saved ${sample.file} (${buffer.length} bytes)`);
  }

  console.log("Compositor samples ready.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
