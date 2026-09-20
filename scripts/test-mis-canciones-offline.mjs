import assert from "node:assert/strict";
import { build } from "esbuild";
import { test } from "node:test";

const bundled = await build({
  entryPoints: ["lib/mis-canciones.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  plugins: [{
    name: "favoritas-local-fixture",
    setup(builder) {
      builder.onResolve({ filter: /offline\/mis-canciones-store$/ }, () => ({
        path: "store", namespace: "fixture",
      }));
      builder.onLoad({ filter: /store/, namespace: "fixture" }, () => ({
        contents: `
          const rows = user => globalThis.favoritesFixture.local.get(user) ?? [];
          export async function getMisCancionesLocal(user) { return structuredClone(rows(user)); }
          export async function replaceMisCancionesLocal(user, items) { globalThis.favoritesFixture.local.set(user, structuredClone(items)); }
          export async function putMiCancionLocal(user, item) {
            const next = rows(user).filter(row => row.id !== item.id);
            next.push(structuredClone(item));
            globalThis.favoritesFixture.local.set(user, next);
          }
          export async function deleteMiCancionLocal(user, id) {
            globalThis.favoritesFixture.local.set(user, rows(user).filter(row => row.id !== id));
          }
        `,
      }));
    },
  }],
});

const service = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

function favorite(id, userId, name = `Favorita ${id}`) {
  return {
    id,
    user_id: userId,
    cancion_guardada_id: id,
    url_letra: null,
    nombre: name,
    artista: "Artista",
    created_at: "2026-09-01T00:00:00.000Z",
  };
}

function fakeSupabase(userId, initial = []) {
  const remote = new Map(initial.map((row) => [row.id, structuredClone(row)]));
  let nextId = 100;
  class Query {
    constructor() { this.operation = "select"; this.values = null; this.id = null; }
    select() { return this; }
    order() { return this; }
    insert(values) { this.operation = "insert"; this.values = values; return this; }
    delete() { this.operation = "delete"; return this; }
    eq(_column, value) { this.id = value; return this; }
    single() { return this.execute(true); }
    then(resolve, reject) { return this.execute(false).then(resolve, reject); }
    async execute(single) {
      if (this.operation === "insert") {
        const row = {
          ...structuredClone(this.values),
          id: nextId++,
          created_at: new Date().toISOString(),
        };
        remote.set(row.id, row);
        return { data: single ? row : [row], error: null };
      }
      if (this.operation === "delete") {
        remote.delete(this.id);
        return { data: null, error: null };
      }
      return { data: [...remote.values()], error: null };
    }
  }
  return {
    remote,
    auth: { getSession: async () => ({ data: { session: { user: { id: userId } } } }) },
    from: () => new Query(),
  };
}

function setOnline(value) {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { onLine: value },
  });
}

function resetFixture() {
  globalThis.favoritesFixture = { local: new Map() };
}

test("descarga Favoritas y conserva el listado sin conexión", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a", [favorite(1, "user-a")]);
  setOnline(true);
  assert.equal((await service.getMisCanciones(supabase)).length, 1);
  supabase.remote.clear();
  setOnline(false);
  const offline = await service.getMisCanciones(supabase);
  assert.equal(offline.length, 1);
  assert.equal(offline[0].nombre, "Favorita 1");
});

test("las Favoritas locales quedan separadas por cuenta", async () => {
  resetFixture();
  const a = fakeSupabase("user-a", [favorite(1, "user-a", "Solo A")]);
  const b = fakeSupabase("user-b", [favorite(2, "user-b", "Solo B")]);
  setOnline(true);
  await service.getMisCanciones(a);
  await service.getMisCanciones(b);
  setOnline(false);
  assert.equal((await service.getMisCanciones(a))[0].nombre, "Solo A");
  assert.equal((await service.getMisCanciones(b))[0].nombre, "Solo B");
});

test("agregar y quitar online actualiza la copia del celular", async () => {
  resetFixture();
  const supabase = fakeSupabase("user-a");
  setOnline(true);
  await service.agregarAMisCanciones(supabase, {
    nombre: "Nueva",
    artista: "Artista",
    cancion_guardada_id: 8,
  });
  setOnline(false);
  const local = await service.getMisCanciones(supabase);
  assert.equal(local.length, 1);
  setOnline(true);
  await service.eliminarDeMisCanciones(supabase, local[0].id);
  setOnline(false);
  assert.equal((await service.getMisCanciones(supabase)).length, 0);
});
