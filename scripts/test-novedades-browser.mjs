// Prueba aislada: datos ficticios, navegador nuevo y ninguna escritura remota.
// node scripts/test-novedades-browser.mjs <baseURL> <ruta a playwright/index.mjs>
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const colaBundle = await build({
  entryPoints: ["lib/cola-individual.ts"], bundle: true, platform: "browser",
  format: "iife", globalName: "QueueService", write: false,
});
const practicaBundle = await build({
  entryPoints: ["lib/canciones-practica.ts"], bundle: true, platform: "browser",
  format: "iife", globalName: "PracticeService", write: false,
});
const { chromium } = await import(pathToFileURL(process.argv[3]).href);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
const navigations = [];
page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
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
  assert.equal(await page.locator(".splash-logo").count(), 0);
  await page.getByRole("button", { name: "Ver novedades del Cancionero (1)", exact: true }).waitFor();
  await page.evaluate(async ({ songs, fecha }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("cantemostodos-offline");
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
  await page.getByRole("heading", { name: "Todo listo en tu celular" }).waitFor({ timeout: 90000 });
  assert.equal(downloads, 1);
  assert.equal(await page.locator("dialog[open]").innerText(), "Todo listo en tu celular");
  await page.getByRole("button", { name: "Cerrar novedades" }).click();
  await novedades.waitFor({ state: "hidden" });
  await page.screenshot({ path: "test-sin-novedades.png" });
  // Servicio real, con servidor ficticio y almacenamiento real del navegador.
  await page.addScriptTag({ content: colaBundle.outputFiles[0].text });
  const queueRows = [1, 2, 3].map((id) => ({
    id, user_id: "offline-test-user", created_at: fecha, nombre: ["Primera canción", "Segunda canción", "Tercera canción"][id - 1],
    artista: "Prueba local", letra_texto: "Letra guardada " + id, url_letra: null,
    estado: id === 1 ? "activa" : "pendiente", orden: id,
  }));
  queueRows.push({ id: 4, user_id: "offline-test-user", created_at: fecha, nombre: "Cifra Club necesita internet", artista: "Prueba", letra_texto: null, url_letra: "https://www.cifraclub.com/test/song/", estado: "pendiente", orden: 1.5 });
  const makeClient = (rows) => ({
    auth: { getSession: async () => ({ data: { session: { user: { id: "offline-test-user" } } } }) },
    from: () => {
      let patch = null;
      let inserted = null;
      let single = false;
      const filters = {};
      const q = {
        select: () => q, order: () => q,
        update: (value) => { patch = value; return q; },
        insert: (value) => { inserted = value; return q; },
        single: () => { single = true; return q; },
        maybeSingle: () => { single = true; return q; },
        eq: (key, value) => { filters[key] = value; return q; },
        then: (resolve, reject) => {
          if (inserted) rows.push({ ...inserted, id: Math.max(...rows.map(row => row.id)) + 1 });
          const matched = rows.filter(row => Object.entries(filters).every(([key, value]) => row[key] === value));
          if (patch) matched.forEach(row => Object.assign(row, patch));
          return Promise.resolve({ data: structuredClone(single ? (inserted ? rows.at(-1) : matched[0] ?? null) : matched), error: null }).then(resolve, reject);
        },
      };
      return q;
    },
  });
  await page.evaluate(async ({ rows, clientSource, fecha }) => {
    const client = (0, eval)("(" + clientSource + ")")(rows);
    const saved = await QueueService.getColaIndividual(client);
    if (saved.length !== 4) throw new Error("No se guardó la lista online");
    const db = await new Promise(resolve => {
      const request = indexedDB.open("cantemostodos-offline");
      request.onsuccess = () => resolve(request.result);
    });
    const tx = db.transaction("app_snapshot", "readwrite");
    tx.objectStore("app_snapshot").put({
      id: "current", usuario: { id: "offline-test-user", nombre: "Prueba", email: "", avatar_url: null },
      salas: [], savedAt: fecha,
    });
    await new Promise(resolve => { tx.oncomplete = resolve; });
    db.close();
  }, { rows: queueRows, clientSource: makeClient.toString(), fecha });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  offline = true;
  await context.setOffline(true);
  // Chromium puede conservar onLine=true tras navegar con un service worker.
  // Bloqueamos la red y además mantenemos la señal offline entre documentos.
  await context.addInitScript(() => Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }));
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    window.dispatchEvent(new Event("offline"));
  });
  await page.waitForFunction(() => document.documentElement.dataset.appReady === "true");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.getByRole("button", { name: "Abrir Cancionero", exact: true }).click();
  await page.waitForURL("**/canciones/cancionero");
  await page.getByText("Prueba acordes offline", { exact: true }).click();
  await page.getByText("Compás 4/4", { exact: true }).waitFor();
  assert.equal(await page.getByText(/Falta la edición avanzada/).count(), 0);
  const rendered = await page.locator("[data-cancionero-letra-scroll]").first().innerText();
  assert.match(rendered, /Cantar juntos/);
  assert.match(rendered, /Do/);
  await page.screenshot({ path: "test-acordes-offline.png" });
  await page.getByRole("button", { name: "Expandir letra" }).click();
  await page.getByRole("button", { name: "Abrir controles de modo lectura" }).waitFor();
  await page.getByRole("button", { name: "Abrir controles de modo lectura" }).click();
  await page.getByRole("menuitem", { name: "Cambiar de tono", exact: true }).click();
  const tonoDialog = page.getByRole("dialog", { name: "Cambiar de tono" });
  await tonoDialog.locator("select").first().selectOption("2");
  await tonoDialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.waitForFunction(() => localStorage.getItem("tono-lectura-v1:offline-test-user:800001") === "2");
  const transposed = await page.locator("[data-cancionero-letra-scroll]").last().innerText();
  assert.match(transposed, /Re/);
  await page.addScriptTag({ content: practicaBundle.outputFiles[0].text });
  const practice = await page.evaluate(async (song) => {
    const client = { auth: { getSession: async () => ({ data: { session: null } }) }, from: () => { throw new Error("Escritura remota prohibida offline"); } };
    const id = await PracticeService.cloneCancioneroToPractica(client, song, song);
    const copy = await PracticeService.getCancionPractica(client, id);
    await PracticeService.updateCancionPracticaNota(client, id, "Mi nota privada");
    await PracticeService.updateCancionPractica(client, id, { ...copy, anotaciones: [{ id: "nota-1", tipo: "nota", lineIndex: 0, charOffset: 0, texto: "Respirar acá" }] });
    await PracticeService.updateCancionPracticaTono(client, id, 4);
    const edited = await PracticeService.getCancionPractica(client, id);
    const reopened = await PracticeService.cloneCancioneroToPractica(client, song, song);
    const db = await new Promise(resolve => { const request = indexedDB.open("cantemostodos-offline"); request.onsuccess = () => resolve(request.result); });
    const original = await new Promise(resolve => { const request = db.transaction("canciones").objectStore("canciones").get(song.id); request.onsuccess = () => resolve(request.result); });
    db.close();
    return { id, copy, edited, reopened, original };
  }, songs[0]);
  assert.equal(practice.copy.tonalidad_default, 2);
  assert.equal(practice.copy.cifrado.acordes[0].noteIndex, 2);
  assert.equal(practice.edited.tonalidad_default, 4);
  assert.equal(practice.edited.cifrado.acordes[0].noteIndex, 4);
  assert.equal(practice.edited.nota_general, "Mi nota privada");
  assert.equal(practice.edited.anotaciones[0].texto, "Respirar acá");
  assert.equal(practice.original.tonalidad_default, 0);
  assert.equal(practice.original.cifrado.acordes[0].noteIndex, 0);
  assert.equal(practice.reopened, practice.id);
  await page.screenshot({ path: "test-acordes-lectura-offline.png" });
  assert.equal(await page.evaluate(() => navigator.onLine), false);
  await page.goto(process.argv[2] + "/individual");
  await page.getByText("Primera canción", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: /Fila/ }).first().click();
  await page.getByRole("dialog", { name: "Fila de canciones" }).getByText("Requiere conexión", { exact: true }).waitFor();
  await page.getByRole("dialog", { name: "Fila de canciones" }).getByRole("button", { name: "Siguiente canción", exact: true }).click();
  await page.getByRole("dialog", { name: "Fila de canciones" }).waitFor({ state: "hidden" });
  await page.getByText("Segunda canción", { exact: true }).first().waitFor();
  await page.reload();
  await page.getByText("Segunda canción", { exact: true }).first().waitFor();
  assert.equal(await page.locator(".splash-logo").count(), 0);
  await page.screenshot({ path: "test-individual-offline.png" });
  await page.addScriptTag({ content: colaBundle.outputFiles[0].text });
  const synced = await page.evaluate(async ({ rows, clientSource }) => {
    Object.defineProperty(navigator, "onLine", { get: () => true, configurable: true });
    const client = (0, eval)("(" + clientSource + ")")(rows);
    const result = await QueueService.getColaIndividual(client);
    return { result, remote: rows };
  }, { rows: queueRows, clientSource: makeClient.toString() });
  assert.equal(synced.result.find(row => row.estado === "activa").id, 2);
  assert.equal(synced.remote.find(row => row.estado === "activa").id, 2);
  assert.equal(synced.result.find(row => row.id === 4).estado, "pendiente");
  await page.evaluate(async ({ clientSource }) => {
    Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true });
    const client = (0, eval)("(" + clientSource + ")")([]);
    await QueueService.agregarAColaIndividual(client, { nombre: "Nueva local", artista: "Prueba", url_letra: "cancionero://800001" });
    const result = await QueueService.getColaIndividual(client);
    if (!result.some(row => row.nombre === "Nueva local" && row.id < 0)) throw new Error("No se agregó offline");
  }, { clientSource: makeClient.toString() });
  const newSynced = await page.evaluate(async ({ rows, clientSource }) => {
    Object.defineProperty(navigator, "onLine", { get: () => true, configurable: true });
    const client = (0, eval)("(" + clientSource + ")")(rows);
    const [result] = await Promise.all([QueueService.getColaIndividual(client), QueueService.getColaIndividual(client)]);
    await QueueService.getColaIndividual(client);
    return { result, rows };
  }, { rows: synced.remote, clientSource: makeClient.toString() });
  assert.equal(newSynced.rows.filter(row => row.nombre === "Nueva local").length, 1);
  assert.ok(newSynced.result.find(row => row.nombre === "Nueva local").id > 0);
  await page.evaluate(() => Object.defineProperty(navigator, "onLine", { get: () => false, configurable: true }));
  await page.goto(process.argv[2] + `/practica/entrenador-canciones/ver?id=${practice.id}`);
  await page.getByRole("button", { name: "Abrir controles de modo lectura" }).click();
  await page.getByRole("menuitem", { name: "Cambiar de tono", exact: true }).click();
  const practiceTone = page.getByRole("dialog", { name: "Cambiar de tono" });
  assert.equal(await practiceTone.locator("select").first().inputValue(), "4");
  await practiceTone.locator("select").first().selectOption("5");
  await practiceTone.getByRole("button", { name: "Confirmar", exact: true }).click();
  await page.addScriptTag({ content: practicaBundle.outputFiles[0].text });
  await page.waitForFunction(async (id) => {
    const client = { auth: { getSession: async () => ({ data: { session: null } }) } };
    return (await PracticeService.getCancionPractica(client, id)).tonalidad_default === 5;
  }, practice.id);
  await page.reload();
  await page.getByRole("button", { name: "Abrir controles de modo lectura" }).click();
  await page.getByRole("menuitem", { name: "Cambiar de tono", exact: true }).click();
  assert.equal(await page.getByRole("dialog", { name: "Cambiar de tono" }).locator("select").first().inputValue(), "5");
  assert.deepEqual(errors, []);
  console.log("OK: navegación offline, salto de enlaces externos, altas y sincronización sin duplicados, tono personal, copia privada y persistencia de tono y anotaciones.");
} catch (error) {
  console.log("Estado al fallar:", page.url(), await page.locator("body").innerText(), errors, navigations);
  await page.screenshot({ path: "test-offline-error.png" });
  throw error;
} finally {
  await browser.close();
}
