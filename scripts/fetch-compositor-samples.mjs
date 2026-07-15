/**
 * Descarga samples del Compositor (packs densos, calidad de producción).
 * Ejecutar: node scripts/fetch-compositor-samples.mjs
 *
 * Fuentes:
 * - Piano: Salamander (Tonejs/audio) — muestreo cada 3ª menor C2–C6
 * - Guitarra acústica: multisample cromático de University of Iowa
 * - Guitarra nylon: multisample de Freesound
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
const TONEJS_INSTRUMENTS =
  "https://raw.githubusercontent.com/Makefully-Studios/tonejs-instruments/main/samples";

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

/** Cada nota cromática del registro útil: no se fabrican acordes desde 6 cuerdas al aire. */
const ACOUSTIC_GUITAR_NOTES = [
  "E2", "F2", "Fs2", "G2", "Gs2", "A2", "As2", "B2",
  "C3", "Cs3", "D3", "Ds3", "E3", "F3", "Fs3", "G3", "Gs3", "A3", "As3", "B3",
  "C4", "Cs4", "D4", "Ds4", "E4", "F4", "Fs4", "G4", "Gs4", "A4", "As4", "B4",
  "C5",
];

/** Muestras de nylon independientes para ejecución con dedo. */
const NYLON_GUITAR_NOTES = [
  "E2", "Fs2", "Gs2", "A2", "B2", "Cs3", "D3", "E3", "Fs3", "G3", "A3",
  "B3", "Cs4", "Ds4", "E4", "Fs4", "Gs4", "A4", "B4", "Cs5", "D5", "E5",
];

const SAMPLES = [
  ...PIANO_NOTES.map((note) => ({
    file: `piano/${note.toLowerCase()}.mp3`,
    url: `${TONEJS_RAW}/salamander/${note}.mp3`,
  })),
  ...ACOUSTIC_GUITAR_NOTES.map((note) => ({
    file: `guitar/acoustic/${note.toLowerCase()}.mp3`,
    url: `${TONEJS_INSTRUMENTS}/guitar-acoustic/mp3/${note}.mp3`,
  })),
  ...NYLON_GUITAR_NOTES.map((note) => ({
    file: `guitar/nylon/${note.toLowerCase()}.mp3`,
    url: `${TONEJS_INSTRUMENTS}/guitar-nylon/mp3/${note}.mp3`,
  })),
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
