/**
 * Corre la decisión de “¿está al día?” y revisa que el código no vuelva a abrir
 * la letra para esa pregunta. No toca el celular ni la base.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CancioneroLocalMeta, CancioneroLocalRecord } from "../lib/offline/offline-db";
import {
  cancionLocalEstaCompleta,
  claseDeRevision,
  faltaDescargarCancion,
  filaIndiceCancion,
  type ClaseRevision,
} from "../lib/offline/cancionero-indice";

const FECHA = "2026-03-01T12:00:00.000Z";
const FECHA_NUEVA = "2026-04-01T12:00:00.000Z";
const VERSION = 4;

const fallos: string[] = [];
let comprobaciones = 0;

function afirmar(condicion: boolean, mensaje: string) {
  comprobaciones += 1;
  if (!condicion) fallos.push(mensaje);
}

function cancion(parcial: Partial<CancioneroLocalRecord> & Pick<CancioneroLocalRecord, "id">): CancioneroLocalRecord {
  return {
    nombre: `Canción ${parcial.id}`,
    artista: "Alguien",
    artista_id: null,
    letra: "letra larga que no tiene que entrar en la revisión",
    url_letra: "",
    updated_at: FECHA,
    tiene_cifrado_avanzado: false,
    cifrado: null,
    compas_config: null,
    ...parcial,
  };
}

function metaDe(cantidad: number, extra: Partial<CancioneroLocalMeta> = {}): CancioneroLocalMeta {
  return {
    lastRemoteUpdatedAt: FECHA,
    lastRemoteCount: cantidad,
    syncedAt: FECHA,
    contentVersion: VERSION,
    indiceListo: true,
    ...extra,
  };
}

function clase(canciones: CancioneroLocalRecord[], extra: Partial<CancioneroLocalMeta> = {}): ClaseRevision {
  const indice = canciones.map(filaIndiceCancion);
  return claseDeRevision({
    indiceListo: extra.indiceListo ?? true,
    cancionesCount: canciones.length,
    indice,
    meta: metaDe(canciones.length, extra),
    snapshot: { count: canciones.length, maxUpdatedAt: extra.lastRemoteUpdatedAt ?? FECHA },
    contentVersionEsperada: VERSION,
  });
}

const completas = [1, 2, 3].map((id) => cancion({ id, letra: "x".repeat(20_000) }));
const indiceCompleto = completas.map(filaIndiceCancion);

afirmar(clase(completas) === "al-dia", "Con todo completo y la misma fecha, tiene que dar por al día.");
afirmar(
  indiceCompleto.every((fila) => !faltaDescargarCancion({ updated_at: fila.updated_at }, fila)),
  "Si está al día, no tiene que pedir bajar ninguna.",
);
afirmar(
  indiceCompleto.every((fila) => !("letra" in fila) && !("cifrado" in fila)),
  "La ficha de la revisión no puede llevar la letra ni los acordes.",
);
afirmar(
  JSON.stringify(indiceCompleto).length < 500,
  "La ficha de tres canciones con letra enorme tiene que seguir siendo chica.",
);

const vieja = cancion({ id: 2, tiene_cifrado_avanzado: undefined, cifrado: undefined, compas_config: undefined });
const mezcla = [cancion({ id: 1 }), vieja, cancion({ id: 3 })];
afirmar(cancionLocalEstaCompleta(vieja) === false, "Una copia vieja, solo con letra, sigue incompleta.");
afirmar(clase(mezcla) === "comparar", "Si hay una incompleta, no puede dar por al día.");
afirmar(
  faltaDescargarCancion({ updated_at: FECHA }, filaIndiceCancion(vieja)) === true,
  "La incompleta se vuelve a bajar aunque la fecha coincida.",
);
afirmar(
  faltaDescargarCancion({ updated_at: FECHA }, filaIndiceCancion(mezcla[0]!)) === false
    && faltaDescargarCancion({ updated_at: FECHA }, filaIndiceCancion(mezcla[2]!)) === false,
  "Las que ya están completas no se vuelven a bajar.",
);

const avanzada = cancion({
  id: 4,
  tiene_cifrado_avanzado: true,
  cifrado: { version: 1, acordes: [] },
});
afirmar(cancionLocalEstaCompleta(avanzada), "Acordes vacíos cuentan como copia completa.");
const sinAcordes = cancion({ id: 5, tiene_cifrado_avanzado: true, cifrado: null });
afirmar(!cancionLocalEstaCompleta(sinAcordes), "Si dice que tiene acordes y no están, sigue incompleta.");

afirmar(
  clase(completas, { indiceListo: false }) === "reconstruir",
  "Sin la ficha armada, no puede dar por al día: primero hay que mirar las copias viejas una vez.",
);
afirmar(
  claseDeRevision({
    indiceListo: true,
    cancionesCount: 3000,
    indice: indiceCompleto,
    meta: metaDe(3),
    snapshot: { count: 3, maxUpdatedAt: FECHA },
    contentVersionEsperada: VERSION,
  }) === "reconstruir",
  "Si la ficha no coincide con la cantidad de canciones, no se fía y no ofrece bajar todo.",
);

const cambiada = filaIndiceCancion(completas[0]!);
afirmar(
  faltaDescargarCancion({ updated_at: FECHA_NUEVA }, cambiada) === true,
  "Si alguien corrigió una canción, esa sí se baja.",
);
afirmar(
  faltaDescargarCancion({ updated_at: FECHA }, filaIndiceCancion(completas[1]!)) === false,
  "La que nadie tocó no entra en la descarga.",
);

afirmar(
  clase(completas, { contentVersion: 0 }) === "comparar",
  "Una versión vieja de la ficha no se da por al día.",
);
afirmar(
  completas.every((item) => !faltaDescargarCancion({ updated_at: item.updated_at }, filaIndiceCancion(item))),
  "Aunque haya que comparar de nuevo, no se marcan las tres mil para bajar si la fecha y el contenido alcanzan.",
);

const sync = readFileSync(join(process.cwd(), "lib/offline/cancionero-sync.ts"), "utf8");
const store = readFileSync(join(process.cwd(), "lib/offline/cancionero-store.ts"), "utf8");
const db = readFileSync(join(process.cwd(), "lib/offline/offline-db.ts"), "utf8");

afirmar(!sync.includes("getCancioneroLocalAll"), "La revisión no puede seguir pidiendo todas las canciones enteras.");
afirmar(!sync.includes('getAll("canciones")'), "La revisión no abre el archivo completo de cada canción.");
afirmar(sync.includes('const CONTENT_VERSION = 4;'), "La versión de la copia sigue en 4, para no invalidar los celulares que ya descargaron.");
const corte = sync.indexOf('if (clase === "reconstruir")');
const lista = sync.indexOf("const pending = versions.filter");
afirmar(corte !== -1, "Si la ficha no sirve, la revisión corta.");
afirmar(lista !== -1 && corte < lista, "Corta antes de armar la lista de descargas.");
afirmar(sync.includes("prepararRevisionLocal"), "Prepara la ficha chica antes de decidir.");

afirmar(store.includes('["canciones", "canciones_indice", "meta"]'), "Guardar la canción y la ficha va en el mismo paso.");
afirmar(store.includes("filaIndiceCancion(guardada)"), "La ficha se arma con la canción que sí se guardó.");
afirmar(store.includes("filaIndiceCancion(existing)"), "Si otra pestaña tenía una versión más nueva, la ficha sigue a esa.");
afirmar(store.includes('tx.objectStore("canciones_indice").delete(id)'), "Borrar una canción también borra su ficha.");
afirmar(store.includes('tx.objectStore("canciones_indice").clear()'), "Vaciar el cancionero también vacía la ficha.");

const reconstruir = store.slice(store.indexOf("async function reconstruirIndiceCancionero"));
afirmar(reconstruir.includes("indiceStore.clear()"), "Rearmar la ficha vacía solo la ficha.");
afirmar(!reconstruir.includes("cancionesStore.clear()"), "Rearmar la ficha no borra las canciones.");
afirmar(!reconstruir.includes("contentVersion:"), "Rearmar la ficha no cambia la versión de la copia.");
afirmar(db.includes('createObjectStore("canciones_indice"'), "La ficha nueva se agrega sin tocar las canciones que ya están.");
afirmar(!db.slice(db.indexOf("oldVersion < 8")).includes(".clear()"), "Actualizar el archivo del celular no borra el cancionero.");

if (fallos.length > 0) {
  for (const fallo of fallos) {
    console.error(`FALLÓ: ${fallo}`);
  }
  process.exit(1);
}

console.log(`Listo: ${comprobaciones} comprobaciones de la revisión, sin pedir bajar el cancionero de nuevo.`);
