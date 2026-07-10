/**
 * Descarga samples del Compositor (packs densos, calidad de producción).
 * Ejecutar: node scripts/fetch-compositor-samples.mjs
 *
 * Fuentes:
 * - Piano: Salamander (Tonejs/audio) — muestreo cada 3ª menor C2–C6
 * - Guitarra: Berklee open strings + acorde (Tonejs/audio)
 * - Batería: Tonejs drum kits
 * - Viento: flauta tonejs-instruments (CC-BY 3.0) C4–A6
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "samples", "compositor");

const TONEJS_RAW = "https://raw.githubusercontent.com/Tonejs/audio/master";
const TONEJS_INSTRUMENTS_FLUTE =
  "https://raw.githubusercontent.com/Makefully-Studios/tonejs-instruments/main/samples/flute/mp3";

/** Salamander: C / Ds / Fs / A por octava (mismo set que Tone.Sampler). */
const PIANO_NOTES = [
  "C2",
  "Ds2",
  "Fs2",
  "A2",
  "C3",
  "Ds3",
  "Fs3",
  "A3",
  "C4",
  "Ds4",
  "Fs4",
  "A4",
  "C5",
  "Ds5",
  "Fs5",
  "A5",
  "C6",
];

const VIENTO_NOTES = [
  "C4",
  "E4",
  "A4",
  "C5",
  "E5",
  "A5",
  "C6",
  "E6",
  "A6",
];

/** Cuerdas al aire Berklee → multi-sample púa/dedo. */
const GUITAR_STRINGS = [
  { file: "guitar/e2.mp3", url: `${TONEJS_RAW}/berklee/guitar_LowEstring1.mp3` },
  { file: "guitar/a2.mp3", url: `${TONEJS_RAW}/berklee/guitar_Astring.mp3` },
  { file: "guitar/d3.mp3", url: `${TONEJS_RAW}/berklee/guitar_Dstring.mp3` },
  { file: "guitar/g3.mp3", url: `${TONEJS_RAW}/berklee/guitar_Gstring.mp3` },
  { file: "guitar/b3.mp3", url: `${TONEJS_RAW}/berklee/guitar_Bstring.mp3` },
  { file: "guitar/e4.mp3", url: `${TONEJS_RAW}/berklee/guitar_highEstring.mp3` },
];

const SAMPLES = [
  ...PIANO_NOTES.map((note) => ({
    file: `piano/${note.toLowerCase()}.mp3`,
    url: `${TONEJS_RAW}/salamander/${note}.mp3`,
  })),
  ...GUITAR_STRINGS,
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
  ...VIENTO_NOTES.map((note) => ({
    file: `viento/${note.toLowerCase()}.mp3`,
    url: `${TONEJS_INSTRUMENTS_FLUTE}/${note}.mp3`,
  })),
];

async function main() {
  let totalBytes = 0;

  await rm(path.join(OUT_DIR, "piano"), { recursive: true, force: true });
  await rm(path.join(OUT_DIR, "guitar"), { recursive: true, force: true });
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
