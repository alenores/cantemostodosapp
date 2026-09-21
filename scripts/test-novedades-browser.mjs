// Prueba aislada: datos ficticios, navegador nuevo y ninguna escritura remota.
// node scripts/test-novedades-browser.mjs <baseURL> <ruta a playwright/index.mjs>
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(process.argv[3]).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const fecha = "2026-09-21T00:00:00.000Z";
const songs = [{
  id: 800001, nombre: "Prueba acordes offline", artista: "Prueba local", letra: "Cantar juntos\nOtra vuelta",
  url_letra: "", updated_at: fecha, tiene_cifrado_avanzado: true, user_id: null,
  cifrado: { version: 1, acordes: [{ lineIndex: 0, charOffset: 0, noteIndex: 0, modifier: "" }] },
  compas_config: { tipoCompas: "4-4", bpm: 90, barrasVersion: 2, barras: [{ lineIndex: 0, charOffset: 0, compasNumero: 1 }] },
  tonalidad_default: 0, modo_tonal_default: "mayor", bpm_default: 90,
}];
let downloads = 0;
let offline = false;
await context.route("**/rest/v1/canciones_guardadas*", async route => {
  if (offline) return route.abort("internetdisconnected");
  assert.ok(["GET", "HEAD"].includes(route.request().method()));
  const url = new URL(route.request().url());
  const columns = (url.searchParams.get("select") ?? "*").split(",");
  if (columns.includes("letra")) downloads++;
  const data = songs.map(row => Object.fromEntries(columns.map(key => [key, row[key]])));
  const single = route.request().headers().accept?.includes("vnd.pgrst.object");
  await route.fulfill({ status: 200, headers: { "content-type": "application/json", "content-range": "0-0/1", "access-control-expose-headers": "content-range" },
    body: route.request().method() === "HEAD" ? "" : JSON.stringify(single ? data[0] : data) });
});
try {
  await page.goto(process.argv[2]);
  await page.getByRole("button", { name: "Ir a Cancionero", exact: true }).waitFor();
  await page.getByRole("button", { name: "Ver novedades del Cancionero (1)", exact: true }).waitFor();
  await page.evaluate(async ({ songs, fecha }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("cantemostodos-offline", 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const row = { ...songs[0] };
    delete row.cifrado;
    delete row.compas_config;
    const tx = db.transaction(["canciones", "meta"], "readwrite");
    tx.objectStore("canciones").put(row);
    tx.objectStore("meta").put({ id: "sync", syncedAt: fecha, lastRemoteUpdatedAt: fecha, lastRemoteCount: 1, contentVersion: 2 });
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = reject; });
    db.close();
  }, { songs, fecha });
  await page.reload();
  const bell = page.getByRole("button", { name: "Ver novedades del Cancionero (1)", exact: true });
  await bell.click();
  await page.getByRole("button", { name: "Descargar todo", exact: true }).waitFor();
  assert.equal(downloads, 0);
  await page.screenshot({ path: "test-novedades-modal.png" });
  await page.getByRole("button", { name: "Cerrar novedades" }).click();
  await page.locator("dialog[open]").waitFor({ state: "hidden" });
  await bell.click();
  await page.mouse.click(2, 2);
  await page.locator("dialog[open]").waitFor({ state: "hidden" });
  await bell.click();
  await page.getByRole("button", { name: "Más tarde", exact: true }).click();
  assert.equal(downloads, 0);
  await page.getByRole("button", { name: "Ir a Cancionero", exact: true }).click();
  const novedades = page.getByRole("button", { name: "Ver novedades del Cancionero", exact: true });
  await novedades.click();
  await page.getByRole("button", { name: "Descargar todo", exact: true }).click();
  await page.getByRole("button", { name: "Entendido" }).waitFor({ timeout: 90000 });
  assert.equal(downloads, 1);
  await page.getByRole("button", { name: "Entendido" }).click();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  offline = true;
  await context.setOffline(true);
  // Chromium puede conservar onLine=true tras navegar con un service worker.
  // Bloqueamos la red y además mantenemos la señal offline entre documentos.
  await context.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false }));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    window.dispatchEvent(new Event("offline"));
  });
  await page.getByRole("button", { name: "Abrir Cancionero", exact: true }).click();
  await page.getByText("Prueba acordes offline", { exact: true }).click();
  await page.getByText("Compás 4/4", { exact: true }).waitFor();
  assert.equal(await page.getByText(/Falta la edición avanzada/).count(), 0);
  const rendered = await page.locator("[data-cancionero-letra-scroll]").first().innerText();
  assert.match(rendered, /Cantar juntos/);
  assert.match(rendered, /Do/);
  await page.screenshot({ path: "test-acordes-offline.png" });
  await page.getByRole("button", { name: "Expandir letra" }).click();
  await page.getByRole("button", { name: "Abrir controles de modo lectura" }).waitFor();
  await page.screenshot({ path: "test-acordes-lectura-offline.png" });
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  assert.deepEqual(errors, []);
  console.log("OK: campana, tarjeta, X, fondo, Más tarde, reparación aprobada y lectura avanzada en modo avión.");
} catch (error) {
  console.log("Estado al fallar:", page.url(), await page.locator("body").innerText(), errors);
  await page.screenshot({ path: "test-offline-error.png" });
  throw error;
} finally {
  await browser.close();
}
