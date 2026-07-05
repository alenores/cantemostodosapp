/**
 * Descarga samples del Compositor.
 * Ejecutar: node scripts/fetch-compositor-samples.mjs
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "samples", "compositor");

const TONEJS_RAW =
  "https://raw.githubusercontent.com/Tonejs/audio/master";
const TONEJS_INSTRUMENTS_RAW =
  "https://raw.githubusercontent.com/Makefully-Studios/tonejs-instruments/main/samples/flute/mp3";

const SAMPLES = [
  {
    file: "piano/c2.mp3",
    url: `${TONEJS_RAW}/salamander/C2.mp3`,
  },
  {
    file: "piano/c3.mp3",
    url: `${TONEJS_RAW}/salamander/C3.mp3`,
  },
  {
    file: "piano/c4.mp3",
    url: `${TONEJS_RAW}/salamander/C4.mp3`,
  },
  {
    file: "piano/c5.mp3",
    url: `${TONEJS_RAW}/salamander/C5.mp3`,
  },
  {
    file: "piano/c6.mp3",
    url: `${TONEJS_RAW}/salamander/C6.mp3`,
  },
  {
    file: "guitar/pua.mp3",
    url: `${TONEJS_RAW}/berklee/guitar_LowEstring1.mp3`,
  },
  {
    file: "guitar/rasguido.mp3",
    url: `${TONEJS_RAW}/berklee/guitar_chord1.mp3`,
  },
  {
    file: "guitar/dedo.mp3",
    url: `${TONEJS_RAW}/berklee/guitar_Astring.mp3`,
  },
  {
    file: "drums/kick.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/kick.mp3`,
  },
  {
    file: "drums/snare.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/snare.mp3`,
  },
  {
    file: "drums/hihat.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/hihat.mp3`,
  },
  {
    file: "drums/hihat-open.mp3",
    url: `${TONEJS_RAW}/drum-samples/Stark/hihat.mp3`,
  },
  {
    file: "drums/crash.mp3",
    url: `${TONEJS_RAW}/drum-samples/acoustic-kit/tom3.mp3`,
  },
  {
    file: "drums/ride.mp3",
    url: `${TONEJS_RAW}/drum-samples/hihat-short.mp3`,
  },
  {
    file: "viento/c4.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/C4.mp3`,
  },
  {
    file: "viento/e4.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/E4.mp3`,
  },
  {
    file: "viento/a4.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/A4.mp3`,
  },
  {
    file: "viento/c5.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/C5.mp3`,
  },
  {
    file: "viento/e5.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/E5.mp3`,
  },
  {
    file: "viento/a5.mp3",
    url: `${TONEJS_INSTRUMENTS_RAW}/A5.mp3`,
  },
];

async function main() {
  let totalBytes = 0;

  await rm(path.join(OUT_DIR, "viento"), { recursive: true, force: true });

  for (const sample of SAMPLES) {
    const response = await fetch(sample.url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${sample.url}: ${response.status} ${response.statusText}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const target = path.join(OUT_DIR, sample.file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);
    totalBytes += buffer.length;
    console.log(`Saved ${sample.file} (${buffer.length} bytes)`);
  }

  console.log(
    `Compositor samples ready (${SAMPLES.length} files, ~${(totalBytes / 1024 / 1024).toFixed(2)} MB).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
