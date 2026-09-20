import assert from "node:assert/strict";
import { build } from "esbuild";
import { test } from "node:test";

const bundled = await build({
  stdin: {
    contents: `
      export { OFFLINE_NAVIGABLE_PATHS, OFFLINE_PREFETCH_ROUTES, isOfflineNavigableRoute } from "./lib/offline/offline-routes";
      export { OFFLINE_SHELL_URLS } from "./lib/offline/shell-urls";
    `,
    resolveDir: process.cwd(),
    sourcefile: "offline-navigation-test-entry.ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});

const routes = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);

const required = [
  "/",
  "/individual",
  "/canciones",
  "/canciones/cancionero",
  "/canciones/favoritas",
  "/practica",
  "/practica/metronomo",
  "/practica/entrenador-vocal",
  "/practica/compositor",
  "/practica/entrenador-canciones",
  "/practica/entrenador-canciones/editor",
  "/practica/entrenador-canciones/ver",
  "/herramientas/afinador",
];

test("todas las pantallas offline se guardan, precargan y navegan", () => {
  for (const path of required) {
    assert.ok(routes.OFFLINE_SHELL_URLS.includes(path), `falta guardar ${path}`);
    assert.ok(routes.OFFLINE_PREFETCH_ROUTES.includes(path), `falta precargar ${path}`);
    assert.ok(routes.OFFLINE_NAVIGABLE_PATHS.has(path), `falta navegar ${path}`);
  }
});

test("la navegación offline reconoce parámetros de canciones y edición", () => {
  assert.equal(routes.isOfflineNavigableRoute("/canciones/cancionero?seleccionar=1"), true);
  assert.equal(routes.isOfflineNavigableRoute("/practica/entrenador-canciones/ver?id=-123"), true);
  assert.equal(routes.isOfflineNavigableRoute("/practica/entrenador-canciones/editor?id=42"), true);
});
