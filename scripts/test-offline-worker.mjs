import assert from "node:assert/strict";
import vm from "node:vm";

// Con la app compilada y en ejecución: node scripts/test-offline-worker.mjs http://localhost:3107
// Solo evalúa el arranque: no ejecuta instalación, descargas ni cambios en cachés.
const origin = process.argv[2] ?? "http://localhost:3107";
const location = new URL("/serwist/sw.js", origin);
const response = await fetch(location);
assert.equal(response.status, 200);
const source = await response.text();
const listeners = [];
const self = {
  location,
  registration: { scope: new URL("/", location).href },
  addEventListener: (name) => listeners.push(name),
  skipWaiting: async () => {},
  clients: { claim: async () => {} },
};
vm.runInNewContext(source, {
  self, location, URL, Request, Response, Headers, console, setTimeout, clearTimeout,
  navigator: { userAgent: "offline-worker-smoke-test" },
}, { timeout: 5000 });
assert.ok(listeners.includes("install"));
assert.ok(listeners.includes("activate"));
assert.ok(listeners.includes("fetch"));
console.log("Arranque offline correcto: sin entradas duplicadas ni errores de inicialización.");
