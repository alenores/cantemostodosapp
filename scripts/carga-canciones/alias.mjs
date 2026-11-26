#!/usr/bin/env node
/**
 * Arma el `alias_norm` de otro nombre de artista igual que la app (lib/artistas-match.ts).
 *   node scripts/carga-canciones/alias.mjs "Indio Solari" <artista_id>
 * Devuelve el INSERT para `artistas_alias`. Antes de ejecutarlo, revisar que no esté repetido
 * (consulta en docs/agente-carga-canciones.md, sección 4).
 */
import { createJiti } from "jiti";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const jiti = createJiti(import.meta.url, { alias: { "@": RAIZ } });
const { normalizarNombreArtista } = await jiti.import(join(RAIZ, "lib/artistas-match.ts"));

const [alias, artistaId] = process.argv.slice(2);
if (!alias?.trim() || !artistaId) {
  console.error('Uso: node scripts/carga-canciones/alias.mjs "<otro nombre>" <artista_id>');
  process.exit(1);
}

const norm = normalizarNombreArtista(alias);
const q = (v) => `'${v.replace(/'/g, "''")}'`;
console.log(
  JSON.stringify(
    {
      alias: alias.trim(),
      alias_norm: norm,
      sql: `insert into public.artistas_alias (artista_id, alias, alias_norm) values (${q(artistaId)}, ${q(alias.trim())}, ${q(norm)}) on conflict (alias_norm) do nothing returning id, alias;`,
    },
    null,
    2,
  ),
);
