import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
const bundle = await build({ stdin: { contents: 'export * from "./lib/cola-individual-guest"; export * from "./lib/cola-offline";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false });
const { avanzarGuestCola, cancionDisponibleOffline } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const local = { id: 1, nombre: "Local", artista: null, url_letra: "cancionero://10", letra_texto: null, estado: "activa", orden: 1 };
const external = { ...local, id: 2, nombre: "Externa", url_letra: "https://www.cifraclub.com/prueba/", estado: "pendiente", orden: 2 };
const next = { ...local, id: 3, estado: "pendiente", orden: 3 };
const disponible = item => cancionDisponibleOffline(item, new Set([10]));
test("saltea enlaces sin borrar ni marcar tocados; online siguen disponibles", () => {
  const rows = [local, external, next];
  const result = avanzarGuestCola(rows, disponible);
  assert.equal(result.find(row => row.estado === "activa").id, 3);
  assert.equal(result.find(row => row.id === 2).estado, "pendiente");
  assert.equal(rows[0].estado, "activa");
  assert.equal(avanzarGuestCola(rows).find(row => row.estado === "activa").id, 2);
});
test("si no queda ninguna disponible conserva la lista y la activa", () => {
  const rows = [local, external];
  assert.deepEqual(avanzarGuestCola(rows, disponible), rows);
});
test("activa externa pendiente para cuando vuelva internet, no tocada", () => {
  const result = avanzarGuestCola([{ ...external, estado: "activa" }, next], disponible);
  assert.equal(result.find(row => row.id === 2).estado, "pendiente");
  assert.equal(result.find(row => row.id === 3).estado, "activa");
});
test("referencias sin descarga no alcanzan; texto local sí", () => {
  assert.equal(cancionDisponibleOffline(local, new Set()), false);
  assert.equal(disponible(external), false);
  assert.equal(disponible({ letra_texto: "Letra guardada" }), true);
});
