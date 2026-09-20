import assert from "node:assert/strict";
import { build } from "esbuild";
import { test } from "node:test";

// Ejecuta el servicio real con red y almacenamiento controlados, sin tocar producción.
const bundled = await build({
  entryPoints: ["lib/offline/cancionero-sync.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  plugins: [{
    name: "offline-store-fixture",
    setup(builder) {
      builder.onResolve({ filter: /offline\/cancionero-store$/ }, () => ({
        path: "fixture", namespace: "fixture",
      }));
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
        contents: [
          "export const getCancioneroLocalAll = async () => globalThis.offlineFixture.rows;",
          "export const getCancioneroLocalMeta = async () => globalThis.offlineFixture.meta;",
          "export const mergeCancioneroLocalUpdates = async (rows, meta) => globalThis.offlineFixture.merge(rows, meta);",
        ].join("\n"),
      }));
    },
  }],
});
const { checkCancioneroUpdates, downloadCancioneroUpdates } = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const before = "2026-09-01T00:00:00.000Z";
const after = "2026-09-19T00:00:00.000Z";
const song = (id, updated_at = before) => ({
  id, nombre: `Canción ${id}`, artista: "Artista", updated_at,
  letra: `Letra ${id} ${updated_at}`, url_letra: "",
  tiene_cifrado_avanzado: true, cifrado: { version: 1, acordes: [] },
  compas_config: null, tonalidad_default: 0, modo_tonal_default: "mayor", bpm_default: 90,
});

function fixture(rows) {
  const state = {
    rows: structuredClone(rows), merges: 0,
    meta: { syncedAt: before, contentVersion: 2, lastRemoteCount: rows.length,
      lastRemoteUpdatedAt: rows.length ? before : null },
    async merge(records, meta) {
      state.merges++;
      const byId = new Map(state.rows.map((row) => [row.id, row]));
      for (const row of records) byId.set(row.id, row);
      state.rows = [...byId.values()];
      state.meta = meta;
    },
  };
  globalThis.offlineFixture = state;
  return state;
}

function client(rows, { failBatch = 0, truncateBatch = 0 } = {}) {
  const requests = [];
  let batches = 0;
  return {
    requests,
    from(table) {
      assert.equal(table, "canciones_guardadas");
      const request = { columns: "", head: false, ids: null, range: null, single: false };
      const chain = {
        select(columns, options) { request.columns = columns; request.head = !!options?.head; return chain; },
        is(column, value) { assert.equal(column, "sala_id"); assert.equal(value, null); return chain; },
        order() { return chain; },
        limit() { return chain; },
        maybeSingle() { request.single = true; return chain; },
        range(from, to) { request.range = [from, to]; return chain; },
        in(column, ids) { assert.equal(column, "id"); request.ids = ids; return chain; },
        then(resolve, reject) {
          requests.push(request);
          let selected = rows;
          const full = request.columns.split(", ").includes("letra");
          if (full && ++batches === failBatch) {
            return Promise.resolve({ data: null, error: new Error("Sin red") }).then(resolve, reject);
          }
          if (request.ids) selected = selected.filter((row) => request.ids.includes(row.id));
          if (request.range) selected = selected.slice(request.range[0], request.range[1] + 1);
          if (full && batches === truncateBatch) selected = selected.slice(1);
          const columns = request.columns.split(", ");
          const data = request.head ? null : request.single
            ? { updated_at: rows.reduce((max, row) => row.updated_at > max ? row.updated_at : max, before) }
            : selected.map((row) => Object.fromEntries(columns.map((key) => [key, row[key]])));
          return Promise.resolve({ data, error: null, count: rows.length }).then(resolve, reject);
        },
      };
      return chain;
    },
  };
}

await test("4000 canciones: consultar no descarga letras; aceptar solo baja 2 nuevas y 1 modificada", async () => {
  const state = fixture(Array.from({ length: 4000 }, (_, i) => song(i + 1)));
  const original = structuredClone(state.rows[0]);
  const remote = state.rows.map((row) => row.id === 7 ? song(7, after) : row);
  remote.push(song(4001, after), song(4002, after));
  const supabase = client(remote);
  const plan = await checkCancioneroUpdates(supabase);
  assert.deepEqual(plan.songs.map((row) => row.id).sort((a, b) => a - b), [7, 4001, 4002]);
  assert.equal(plan.songs.filter((row) => row.kind === "new").length, 2);
  assert.ok(supabase.requests.every((r) => !r.columns.split(", ").includes("letra")));
  assert.equal(state.merges, 0);
  assert.equal(state.rows.length, 4000);
  assert.equal(await downloadCancioneroUpdates(supabase, plan), 3);
  const downloads = supabase.requests.filter((r) => r.columns.split(", ").includes("letra"));
  assert.deepEqual(downloads.flatMap((r) => r.ids).sort((a, b) => a - b), [7, 4001, 4002]);
  assert.deepEqual(state.rows[0], original);
  assert.equal(state.rows.length, 4002);
  assert.equal(state.merges, 1);
  assert.equal((await checkCancioneroUpdates(client(remote))).songs.length, 0);
});

await test("sin novedades solo consulta cantidad y fecha", async () => {
  const state = fixture([song(1)]);
  const supabase = client(state.rows);
  assert.equal((await checkCancioneroUpdates(supabase)).songs.length, 0);
  assert.equal(supabase.requests.length, 2);
  assert.equal(state.merges, 0);
});

await test("descarga inicial también espera confirmación y pagina más de 1000 canciones", async () => {
  const state = fixture([]);
  const supabase = client(Array.from({ length: 1201 }, (_, i) => song(i + 1)));
  const plan = await checkCancioneroUpdates(supabase);
  assert.equal(plan.songs.length, 1201);
  assert.ok(plan.songs.every((row) => row.kind === "new"));
  assert.equal(state.rows.length, 0);
  assert.ok(supabase.requests.every((r) => !r.columns.split(", ").includes("letra")));
  assert.equal(await downloadCancioneroUpdates(supabase, plan), 1201);
});

await test("si falla el segundo lote se conserva íntegra la copia anterior", async () => {
  const state = fixture([song(1)]);
  const original = structuredClone(state.rows);
  const remote = [song(1), ...Array.from({ length: 101 }, (_, i) => song(i + 2, after))];
  const supabase = client(remote, { failBatch: 2 });
  const plan = await checkCancioneroUpdates(supabase);
  await assert.rejects(downloadCancioneroUpdates(supabase, plan), /Sin red/);
  assert.equal(state.merges, 0);
  assert.deepEqual(state.rows, original);
});

await test("respuesta incompleta no se guarda", async () => {
  const state = fixture([song(1)]);
  const supabase = client([song(1), song(2, after)], { truncateBatch: 1 });
  const plan = await checkCancioneroUpdates(supabase);
  await assert.rejects(downloadCancioneroUpdates(supabase, plan), /incompleta/);
  assert.equal(state.merges, 0);
});

await test("no incluye canciones aparecidas después de mostrar el listado aceptado", async () => {
  fixture([song(1)]);
  const remote = [song(1), song(2, after)];
  const supabase = client(remote);
  const plan = await checkCancioneroUpdates(supabase);
  remote.push(song(3, after));
  await downloadCancioneroUpdates(supabase, plan);
  assert.deepEqual(supabase.requests.filter((r) => r.columns.split(", ").includes("letra")).flatMap((r) => r.ids), [2]);
  assert.equal((await checkCancioneroUpdates(supabase)).songs[0].id, 3);
});

await test("si otra pestaña ya descargó la versión, no se vuelve a transferir", async () => {
  const state = fixture([song(1)]);
  const supabase = client([song(1), song(2, after)]);
  const plan = await checkCancioneroUpdates(supabase);
  state.rows.push(song(2, after));
  assert.equal(await downloadCancioneroUpdates(supabase, plan), 0);
  assert.ok(supabase.requests.every((r) => !r.columns.split(", ").includes("letra")));
});

if (process.argv.includes("--live")) {
  const { default: nextEnv } = await import("@next/env");
  const { createClient } = await import("@supabase/supabase-js");
  nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  fixture([]);
  const plan = await checkCancioneroUpdates(supabase);
  console.log("Consulta real de solo lectura:", plan.songs.length, "novedades; sin descargas ni escrituras.");
  if (plan.songs.length) {
    // Verifica la consulta filtrada del primer registro con almacenamiento de prueba en memoria.
    await downloadCancioneroUpdates(supabase, { ...plan, songs: plan.songs.slice(0, 1) });
    console.log("Consulta filtrada de una canción: correcta; sin escrituras remotas.");
  }
}
