#!/usr/bin/env node
/**
 * Prueba de la herramienta de carga (correr antes de cada tanda y después de tocar el convertidor):
 *   node scripts/carga-canciones/probar.mjs
 *
 * 1. «Callejero de Boedo» (ejemplos/): tiene que dar exactamente lo guardado en la canción 4575.
 * 2. Bajo, nota agregada, acorde reducido y rótulo con acordes en el mismo renglón.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const fallos = [];

function convertir(archivo) {
  try {
    return JSON.parse(execFileSync("node", [join(AQUI, "convertir.mjs"), archivo], { encoding: "utf8" }));
  } catch (error) {
    return JSON.parse(error.stdout);
  }
}

function afirmar(condicion, mensaje) {
  if (!condicion) fallos.push(mensaje);
}

// 1. Canción real.
const boedo = convertir(join(AQUI, "ejemplos", "callejero-de-boedo.txt"));
afirmar(boedo.errores.length === 0, `Boedo: errores ${JSON.stringify(boedo.errores)}`);
afirmar(boedo.cantidad_acordes === 47, `Boedo: ${boedo.cantidad_acordes} acordes (esperados 47)`);
afirmar(boedo.tonalidad_default === 6 && boedo.modo_tonal_default === "mayor", "Boedo: tonalidad distinta de FA# mayor");
afirmar(boedo.letra.split("\n")[14] === "SOLO:", "Boedo: el rótulo SOLO no quedó en el renglón 14");
afirmar(
  boedo.cifrado.acordes.some((a) => a.lineIndex === 14 && a.charOffset === 6 && a.noteIndex === 11),
  "Boedo: falta el SI del solo sobre el rótulo",
);

// 2. Casos chicos.
const carpeta = mkdtempSync(join(tmpdir(), "carga-canciones-"));
const archivo = join(carpeta, "casos.txt");
writeFileSync(archivo, "INTRO: Am  G\n\nAm/G      C9    F#m7b5\nHola que tal como andas\n");
const casos = convertir(archivo);
const [conBajo, agregada, reducido] = casos.cifrado.acordes.filter((a) => a.lineIndex === casos.letra.split("\n").indexOf("Hola que tal como andas"));
afirmar(casos.letra.startsWith("INTRO:"), "Casos: el rótulo INTRO no quedó como texto");
afirmar(conBajo?.bassNoteIndex === 7 && conBajo?.modifier === "m", "Casos: LAm/SOL no guardó el bajo");
afirmar(agregada?.agregada === 9, "Casos: DO9 no guardó la nota agregada");
afirmar(reducido?.modifier === "m7", "Casos: FA#m7b5 no se redujo a FA#m7");
afirmar(casos.tonalidad_default === 9 && casos.modo_tonal_default === "menor", "Casos: tonalidad distinta de LA menor");

if (fallos.length > 0) {
  console.error(`✗ ${fallos.length} fallas:\n- ${fallos.join("\n- ")}`);
  process.exit(1);
}
console.log("✓ La herramienta de carga da lo esperado.");
