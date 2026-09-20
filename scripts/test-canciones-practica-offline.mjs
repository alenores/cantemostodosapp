import assert from "node:assert/strict";
import { build } from "esbuild";
import { test } from "node:test";

const bundled = await build({
  entryPoints: ["lib/canciones-practica.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  plugins: [{
    name: "practica-local-fixture",
    setup(builder) {
      builder.onResolve({ filter: /offline\/canciones-practica-store$/ }, () => ({
        path: "store", namespace: "fixture",
      }));
      builder.onResolve({ filter: /offline\/canciones-practica-events$/ }, () => ({
        path: "events", namespace: "fixture",
      }));
      builder.onLoad({ filter: /events/, namespace: "fixture" }, () => ({
        contents: "export const dispatchCancionesPracticaLocalChange = () => {};",
      }));
      builder.onLoad({ filter: /store/, namespace: "fixture" }, () => ({
        contents: `
          const key = (user, id) => user + ':' + id;
          export const practicaLocalKey = key;
          export async function getCancionesPracticaLocalRecords(user, options) {
            return [...globalThis.practiceFixture.local.values()]
              .filter(row => row.owner_user_id === user)
              .filter(row => options?.includeDeleted || row.sync_state !== 'pending-delete')
              .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
          }
          export async function getCancionPracticaLocalRecord(user, id) {
            return globalThis.practiceFixture.local.get(key(user, id)) ?? null;
          }
          export async function putCancionPracticaLocalRecord(row) {
            globalThis.practiceFixture.local.set(row.local_key, structuredClone(row));
          }
          export async function deleteCancionPracticaLocalRecord(user, id) {
            globalThis.practiceFixture.local.delete(key(user, id));
          }
          export async function createCancionPracticaTempId(user) {
            return globalThis.practiceFixture.nextTemp--;
          }
          export async function mergeCancionesPracticaRemoteSnapshot(user, remote) {
            const existing = await getCancionesPracticaLocalRecords(user, { includeDeleted: true });
            const remoteIds = new Set(remote.map(row => row.remote_id));
            for (const row of remote) {
              const local = existing.find(item => item.remote_id === row.remote_id);
              if (local && local.sync_state !== 'synced') continue;
              const id = local?.local_id ?? row.local_id;
              globalThis.practiceFixture.local.set(key(user, id), {
                ...structuredClone(row), local_id: id, local_key: key(user, id),
              });
            }
            for (const row of existing) {
              if (row.sync_state === 'synced' && row.remote_id != null && !remoteIds.has(row.remote_id)) {
                globalThis.practiceFixture.local.delete(row.local_key);
              }
            }
          }
        `,
      }));
    },
  }],
});

const service = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

function remoteSong(id, user, name = `Práctica ${id}`) {
  return {
    id, user_id: user, origen_cancion_id: null, nombre: name, artista: "Artista",
    letra: "Letra", cifrado: { version: 1, acordes: [] }, compas_config: null,
    tonalidad_default: 0, modo_tonal_default: "mayor", bpm_default: 90,
    tiene_cifrado_avanzado: true, nota_general: null, anotaciones: [], dominio: null,
    created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z",
  };
}

function fakeSupabase(userId, initial = []) {
  const remote = new Map(initial.map((row) => [row.id, structuredClone(row)]));
  let nextId = 100;
  class Query {
    constructor() { this.operation = "select"; this.values = null; this.filters = []; }
    select() { return this; }
    order() { return this; }
    eq(column, value) { this.filters.push([column, value]); return this; }
    insert(values) { this.operation = "insert"; this.values = values; return this; }
    update(values) { this.operation = "update"; this.values = values; return this; }
    delete() { this.operation = "delete"; return this; }
    maybeSingle() { return this.execute(true); }
    single() { return this.execute(true); }
    then(resolve, reject) { return this.execute(false).then(resolve, reject); }
    matches(row) { return this.filters.every(([column, value]) => row[column] === value); }
    async execute(single) {
      if (this.operation === "insert") {
        const id = nextId++;
        const now = new Date().toISOString();
        const row = { ...structuredClone(this.values), id, created_at: now, updated_at: now };
        remote.set(id, row);
        return { data: single ? row : [row], error: null };
      }
      if (this.operation === "update") {
        const row = [...remote.values()].find(item => item.user_id === userId && this.matches(item));
        if (!row) return { data: null, error: new Error("not found") };
        Object.assign(row, structuredClone(this.values), { updated_at: new Date().toISOString() });
        return { data: single ? row : [row], error: null };
      }
      if (this.operation === "delete") {
        for (const [id, row] of remote) {
          if (row.user_id === userId && this.matches(row)) remote.delete(id);
        }
        return { data: null, error: null };
      }
      const rows = [...remote.values()].filter(row => row.user_id === userId && this.matches(row));
      return { data: single ? (rows[0] ?? null) : rows, error: null };
    }
  }
  return {
    remote,
    auth: { getSession: async () => ({ data: { session: { user: { id: userId } } } }) },
    from: () => new Query(),
  };
}

function resetFixture() {
  globalThis.practiceFixture = { local: new Map(), nextTemp: -1 };
}

function setOnline(value) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true, value: { onLine: value },
  });
}

const payload = {
  nombre: "Nueva práctica", artista: "Yo", letra: "Letra local",
  cifrado: { version: 1, acordes: [] }, compas_config: null,
  tonalidad_default: 0, modo_tonal_default: "mayor", bpm_default: 100,
  anotaciones: [],
};

test("descarga la práctica privada y la abre sin conexión", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a", [remoteSong(1, "user-a")]);
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  setOnline(false);
  const list = await service.listCancionesPractica(supabase);
  assert.equal(list.length, 1);
  assert.equal((await service.getCancionPractica(supabase, 1)).nombre, "Práctica 1");
});

test("edita anotaciones y nota offline y las sincroniza al reconectar", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a", [remoteSong(1, "user-a")]);
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  setOnline(false);
  await service.updateCancionPractica(supabase, 1, {
    ...payload, nombre: "Práctica editada", anotaciones: [{ id: "a1", tipo: "respirar", linea: 0 }],
  });
  await service.updateCancionPracticaNota(supabase, 1, "Respirar antes del estribillo");
  assert.equal((await service.getCancionPractica(supabase, 1)).nota_general, "Respirar antes del estribillo");
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  assert.equal(supabase.remote.get(1).nombre, "Práctica editada");
  assert.equal(supabase.remote.get(1).nota_general, "Respirar antes del estribillo");
  assert.equal(supabase.remote.get(1).anotaciones.length, 1);
});

test("crea offline, conserva el enlace local y sube la canción después", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a");
  setOnline(false);
  const localId = await service.insertCancionPractica(supabase, payload);
  assert.ok(localId < 0);
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  assert.equal(supabase.remote.size, 1);
  assert.equal((await service.getCancionPractica(supabase, localId)).nombre, "Nueva práctica");
});

test("borra offline y elimina en la nube al reconectar", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a", [remoteSong(1, "user-a")]);
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  setOnline(false);
  await service.deleteCancionPractica(supabase, 1);
  assert.equal((await service.listCancionesPractica(supabase)).length, 0);
  setOnline(true);
  await service.syncCancionesPractica(supabase);
  assert.equal(supabase.remote.size, 0);
});

test("las copias locales quedan separadas por cuenta", async () => {
  resetFixture();
  const a = fakeSupabase("user-a");
  const b = fakeSupabase("user-b");
  setOnline(false);
  await service.insertCancionPractica(a, { ...payload, nombre: "Solo A" });
  assert.equal((await service.listCancionesPractica(a)).length, 1);
  assert.equal((await service.listCancionesPractica(b)).length, 0);
});

