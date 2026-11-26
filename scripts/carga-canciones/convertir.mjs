#!/usr/bin/env node
/**
 * Herramienta del agente que carga canciones (docs/agente-carga-canciones.md).
 *
 * Convierte el texto de una página de acordes (acordes en el renglón de arriba de la letra) al
 * formato del Cancionero, con el MISMO convertidor que usa el editor de la app al pegar una letra
 * (`parseLetraTradicional` de lib/cifrado-import.ts). Así lo que carga el agente queda igual que lo
 * que carga una persona: bajo (LAm/SOL), notas agregadas (DO₉) y la misma reducción de acordes.
 *
 * Uso:
 *   node scripts/carga-canciones/convertir.mjs cancion.txt
 *       → muestra letra, acordes, tonalidad, modo y avisos (JSON).
 *   node scripts/carga-canciones/convertir.mjs cancion.txt --sql \
 *       --nombre "Callejero de Boedo" --artista "Callejeros" --artista-id <uuid> \
 *       --url <url de la fuente> [--youtube <url>] [--user-id <uuid>]
 *       → además arma el INSERT listo para ejecutar (una sola sentencia).
 *
 * Sale con código 1 si hay errores (sin acordes, acordes dentro de la letra, datos faltantes).
 * Los avisos no frenan, pero hay que leerlos e informarlos.
 */
import { createJiti } from "jiti";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const jiti = createJiti(import.meta.url, { alias: { "@": RAIZ } });
const { parseLetraTradicional, getPrimerAcordeOrdenado, isChordLine } = await jiti.import(
  join(RAIZ, "lib/cifrado-import.ts"),
);
const { parseAcordeToken } = await jiti.import(join(RAIZ, "lib/notacion-acordes.ts"));

/** Dueño de la app (Ale): autor de lo que carga el agente salvo que venga de una solicitud. */
const USER_ID_DUENO = "fa5ae382-2b22-4812-a486-a00ddc82d994";

/** Siempre el mismo para lo que carga el agente. */
const COMPAS_CONFIG = {
  bpm: 120,
  barras: [],
  tipoCompas: "4-4",
  cycleGolpes: 4,
  barrasVersion: 2,
  intensidadPlantilla: ["fuerte", "medio", "medio", "medio"],
};

/** Letras cirílicas que se ven latinas (vienen pegadas en algunas fuentes). */
const CIRILICAS = { "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T", "Х": "X", "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x", "і": "i" };

function limpiarTexto(texto) {
  return texto
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[‘’\u0091\u0092´`]/g, "'")
    .replace(/[“”\u0093\u0094]/g, '"')
    .replace(/\u0085|…/g, "...")
    .replace(/ /g, " ")
    .replace(/\t/g, "    ")
    .replace(/[АВЕКМНОРСТХаеорсухі]/g, (c) => CIRILICAS[c] ?? c)
    .split("\n")
    // Tablatura (e|---3---|) y renglones de cuerdas: no son letra ni acordes.
    .filter((linea) => !/^\s*[eBGDAEbgdae]\s*[|:]-*[\d\-|hpbr/\\~x ]*$/.test(linea) || !/-{3,}/.test(linea))
    .join("\n");
}

/** Marca invisible para que la app no tome «SOLO:» como rótulo suelto (se borra al final). */
const MARCA = "\u2063";

/**
 * «SOLO:  SI FA# DO#» (rótulo y acordes en el mismo renglón): el convertidor de la app no lo
 * reconoce. Se parte en un renglón de acordes (en las mismas columnas) y el rótulo abajo, así los
 * acordes quedan sobre el rótulo, como en las cargas anteriores.
 */
function separarRotulosConAcordes(texto) {
  const salida = [];
  for (const linea of texto.split("\n")) {
    const m = linea.match(/^(\s*[\p{L}][\p{L} ]{1,20}:)(\s+.+)$/u);
    const tokens = m ? m[2].trim().split(/\s+/).filter((t) => !/^\(?x\s*\d+\)?$/i.test(t)) : [];
    if (m && tokens.length > 0 && tokens.every((t) => parseAcordeToken(t))) {
      salida.push(" ".repeat(m[1].length) + m[2]);
      salida.push(MARCA + m[1].trimStart() + MARCA);
    } else {
      salida.push(linea);
    }
  }
  return salida.join("\n");
}

function leerOpciones(argv) {
  const opciones = { archivo: null, sql: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--sql") opciones.sql = true;
    else if (arg.startsWith("--")) opciones[arg.slice(2)] = argv[(i += 1)];
    else opciones.archivo = arg;
  }
  return opciones;
}

/** Renglones de la letra que todavía parecen tener acordes adentro (no deberían). */
function acordesEnLaLetra(letra) {
  const avisos = [];
  letra.split("\n").forEach((linea, i) => {
    const sinRotulo = linea.replace(/^\s*[\p{L} ]{2,20}:\s*/u, "");
    const tokens = sinRotulo.split(/\s+/).filter((t) => t && !/^\(?x\s*\d+\)?$/i.test(t));
    if (tokens.length === 0) return;
    const acordes = tokens.filter((t) => parseAcordeToken(t.replace(/[(),]/g, "")));
    if (isChordLine(linea) || (acordes.length >= 1 && acordes.length >= tokens.length * 0.6)) {
      avisos.push(`Renglón ${i}: parece tener acordes dentro del texto → «${linea.trim()}»`);
    }
  });
  return avisos;
}

function literalSql(valor) {
  return valor == null ? "null" : `'${String(valor).replace(/'/g, "''")}'`;
}

const opciones = leerOpciones(process.argv.slice(2));
if (!opciones.archivo) {
  console.error("Falta el archivo de texto con la canción. Ver el uso al principio de este archivo.");
  process.exit(1);
}

const original = readFileSync(opciones.archivo, "utf8");
const convertido = parseLetraTradicional(separarRotulosConAcordes(limpiarTexto(original)));
const resultado = { ...convertido, letra: convertido.letra.replaceAll(MARCA, "") };
const acordes = resultado.cifrado.acordes;
const primero = getPrimerAcordeOrdenado(acordes);
const tonalidad = primero ? primero.noteIndex : null;
const modo = primero && primero.modifier.startsWith("m") && !primero.modifier.startsWith("maj") ? "menor" : "mayor";

const errores = [];
const avisos = [...resultado.warnings];
if (acordes.length === 0) errores.push("No se reconoció ningún acorde: la canción no se carga sin acordes.");
for (const aviso of acordesEnLaLetra(resultado.letra)) errores.push(aviso);
if (resultado.letra.includes("$L$")) errores.push("La letra contiene «$L$»: cambiar el delimitador del INSERT.");
if (acordes.length > 0 && acordes.length < 10) avisos.push(`Pocos acordes (${acordes.length}): revisar que no falten.`);

const salida = {
  letra: resultado.letra,
  cifrado: resultado.cifrado,
  tonalidad_default: tonalidad,
  modo_tonal_default: modo,
  cantidad_acordes: acordes.length,
  renglones: resultado.stats.lyricLines,
  avisos,
  errores,
};

if (opciones.sql) {
  for (const campo of ["nombre", "artista", "artista-id", "url"]) {
    if (!opciones[campo]) errores.push(`Para armar el INSERT falta --${campo}.`);
  }
  if (errores.length === 0) {
    salida.sql = [
      "insert into public.canciones_guardadas",
      " (nombre, artista, artista_id, url_letra, letra, cifrado, compas_config, tiene_cifrado_avanzado,",
      "  tonalidad_default, modo_tonal_default, youtube_url, user_id)",
      "values (",
      ` ${literalSql(opciones.nombre)}, ${literalSql(opciones.artista)}, ${literalSql(opciones["artista-id"])}, ${literalSql(opciones.url)},`,
      ` $L$${resultado.letra}$L$,`,
      ` $J$${JSON.stringify(resultado.cifrado)}$J$::jsonb,`,
      ` $J$${JSON.stringify(COMPAS_CONFIG)}$J$::jsonb,`,
      ` true, ${tonalidad}, '${modo}', ${literalSql(opciones.youtube ?? null)}, ${literalSql(opciones["user-id"] ?? USER_ID_DUENO)}`,
      ")",
      "returning id, nombre, jsonb_array_length(cifrado->'acordes') as acordes, md5(letra) as md5_letra;",
    ].join("\n");
  }
}

console.log(JSON.stringify(salida, null, 2));
process.exit(errores.length > 0 ? 1 : 0);
