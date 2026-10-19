"use client";

import type { AnotacionesControl } from "@/components/cifrado/AnotacionPickers";
import {
  actualizarPatronPunteo,
  actualizarPatronRasgueo,
  borrarPatronPunteo,
  borrarPatronRasgueo,
  colocarCorteRasgueo,
  colocarMarcaRasgueo,
  colocarPunteo,
  guardarCatalogoPunteo,
  guardarCatalogoRasgueo,
  nombrePunteo,
  nombreRasgueo,
  patronesPunteo,
  patronesRasgueo,
  pasosDePunteo,
  quitarMarcaCuerda,
  siguienteColorLibre,
  trazosDeRasgueo,
  type PunteoPatron,
  type RasgueoPatron,
} from "@/lib/cuerdas-practica";
import {
  crearAnotacionId,
  moverDuracionTrazo,
  type PasoPunteoRasgueo,
  PUNTEO_CUERDAS,
  type Anotacion,
  type DedoPunteo,
  type DedosRasgueo,
  type RasgueoColor,
  type TrazoRasgueo,
} from "@/lib/anotaciones-practica";
import { useMemo, useState } from "react";

function cuerdasVacias(): (DedoPunteo | null)[] {
  return Array.from({ length: PUNTEO_CUERDAS }, () => null);
}

export type CuerdasSeccion = "rasgueo" | "punteo";
export type CuerdasVista = "lista" | "edicion";

export type CuerdasHerramienta =
  | { tipo: "ninguna" }
  | { tipo: "rasgueo"; patronId: string }
  | { tipo: "corte" }
  | { tipo: "punteo"; patronId: string };

export function useCuerdasEditor(control: AnotacionesControl | null) {
  const [seccion, setSeccion] = useState<CuerdasSeccion>("rasgueo");
  const [vista, setVista] = useState<CuerdasVista>("lista");
  const [herramienta, setHerramienta] = useState<CuerdasHerramienta>({
    tipo: "ninguna",
  });
  const [nombre, setNombreState] = useState("Rasgueo 1");
  const [color, setColorState] = useState<RasgueoColor>("verde");
  const [trazos, setTrazosState] = useState<TrazoRasgueo[]>([]);
  const [trazoIndex, setTrazoIndex] = useState<number | null>(null);
  const [pasoIndex, setPasoIndex] = useState<number | null>(null);
  const [pasos, setPasosState] = useState<PasoPunteoRasgueo[]>([
    { duracion: "corchea", cuerdas: cuerdasVacias() },
  ]);
  const [dedoPincel, setDedoPincel] = useState<DedoPunteo | null>("P");
  const [marcaId, setMarcaId] = useState<string | null>(null);

  const patrones = useMemo(
    () => patronesRasgueo(control?.items ?? []),
    [control?.items],
  );
  const patronesDePunteo = useMemo(
    () => patronesPunteo(control?.items ?? []),
    [control?.items],
  );

  function irASeccion(next: CuerdasSeccion) {
    setSeccion(next);
    setVista("lista");
    setMarcaId(null);
  }

  function volver() {
    setVista("lista");
  }

  function empezarNuevo() {
    if (!control) {
      return;
    }

    const patronId = crearAnotacionId();
    const nextNombre = `Rasgueo ${patrones.length + 1}`;
    const nextColor = siguienteColorLibre(patrones.length);
    const nextTrazos: TrazoRasgueo[] = [];

    control.onChange(
      guardarCatalogoRasgueo(control.items, {
        patronId,
        nombre: nextNombre,
        color: nextColor,
        trazos: nextTrazos,
      }),
    );
    setSeccion("rasgueo");
    setVista("edicion");
    setHerramienta({ tipo: "rasgueo", patronId });
    setNombreState(nextNombre);
    setColorState(nextColor);
    setTrazosState(nextTrazos);
    setTrazoIndex(null);
    setPasoIndex(null);
    setMarcaId(null);
  }

  function empezarNuevoPunteo() {
    if (!control) {
      return;
    }

    const patronId = crearAnotacionId();
    const nextNombre = `Punteo ${patronesDePunteo.length + 1}`;
    const nextPasos: PasoPunteoRasgueo[] = [
      { duracion: "corchea", cuerdas: cuerdasVacias() },
    ];

    control.onChange(
      guardarCatalogoPunteo(control.items, {
        patronId,
        nombre: nextNombre,
        pasos: nextPasos,
      }),
    );
    setSeccion("punteo");
    setVista("edicion");
    setHerramienta({ tipo: "punteo", patronId });
    setNombreState(nextNombre);
    setPasosState(nextPasos);
    setPasoIndex(0);
    setDedoPincel("P");
    setMarcaId(null);
  }

  function empezarCorte() {
    setSeccion("rasgueo");
    setVista("lista");
    setHerramienta({ tipo: "corte" });
    setMarcaId(null);
  }

  function asegurarCatalogoRasgueo(patron: RasgueoPatron) {
    if (!control) {
      return;
    }

    const yaExiste = control.items.some(
      (item) =>
        item.tipo === "rasgueo" &&
        item.catalogo &&
        item.patronId === patron.id,
    );

    if (yaExiste) {
      return;
    }

    control.onChange(
      guardarCatalogoRasgueo(control.items, {
        patronId: patron.id,
        nombre: patron.nombre,
        color: patron.color,
        trazos: patron.trazos,
      }),
    );
  }

  function asegurarCatalogoPunteo(patron: PunteoPatron) {
    if (!control) {
      return;
    }

    const yaExiste = control.items.some(
      (item) =>
        item.tipo === "punteo" && item.catalogo && item.patronId === patron.id,
    );

    if (yaExiste) {
      return;
    }

    control.onChange(
      guardarCatalogoPunteo(control.items, {
        patronId: patron.id,
        nombre: patron.nombre,
        pasos: patron.pasos,
      }),
    );
  }

  function cargarRasgueo(patron: RasgueoPatron) {
    setSeccion("rasgueo");
    setHerramienta({ tipo: "rasgueo", patronId: patron.id });
    setNombreState(patron.nombre);
    setColorState(patron.color);
    setTrazosState(patron.trazos);
    setTrazoIndex(null);
    setPasoIndex(null);
    setMarcaId(null);
  }

  function cargarPunteo(patron: PunteoPatron) {
    setSeccion("punteo");
    setHerramienta({ tipo: "punteo", patronId: patron.id });
    setNombreState(patron.nombre);
    setPasosState(patron.pasos);
    setPasoIndex(0);
    setMarcaId(null);
  }

  function elegirPatron(patron: RasgueoPatron) {
    cargarRasgueo(patron);
    setVista("lista");
  }

  function elegirPatronPunteo(patron: PunteoPatron) {
    cargarPunteo(patron);
    setVista("lista");
  }

  function editarPatron(patron: RasgueoPatron) {
    asegurarCatalogoRasgueo(patron);
    cargarRasgueo(patron);
    setVista("edicion");
  }

  function editarPatronPunteo(patron: PunteoPatron) {
    asegurarCatalogoPunteo(patron);
    cargarPunteo(patron);
    setVista("edicion");
  }

  function setNombre(value: string) {
    const next = value.slice(0, 24);
    setNombreState(next);

    if (control && herramienta.tipo === "rasgueo") {
      control.onChange(
        actualizarPatronRasgueo(control.items, herramienta.patronId, {
          nombre: next,
        }),
      );
    }

    if (control && herramienta.tipo === "punteo") {
      control.onChange(
        actualizarPatronPunteo(control.items, herramienta.patronId, {
          nombre: next,
        }),
      );
    }
  }

  function setColor(value: RasgueoColor) {
    setColorState(value);

    if (control && herramienta.tipo === "rasgueo") {
      control.onChange(
        actualizarPatronRasgueo(control.items, herramienta.patronId, {
          color: value,
        }),
      );
    }
  }

  function escribirTrazos(next: TrazoRasgueo[], indice: number | null, paso: number | null) {
    setTrazosState(next);
    setTrazoIndex(indice);
    setPasoIndex(paso);

    if (control && herramienta.tipo === "rasgueo") {
      control.onChange(
        actualizarPatronRasgueo(control.items, herramienta.patronId, {
          trazos: next,
        }),
      );
    }
  }

  function agregarTrazo(trazo: TrazoRasgueo) {
    const next = [...trazos, trazo];
    const indice = next.length - 1;
    escribirTrazos(next, indice, trazo.tipo === "punteo" ? 0 : null);
  }

  function agregarPulgar() {
    agregarTrazo({ tipo: "pulgar", duracion: "corchea" });
  }

  function agregarRasgueo(direccion: "abajo" | "arriba") {
    agregarTrazo({ tipo: "rasgueo", dedos: 1, direccion, duracion: "corchea" });
  }

  function agregarSilencio() {
    agregarTrazo({ tipo: "silencio", duracion: "corchea" });
  }

  function agregarPunteo() {
    agregarTrazo({
      tipo: "punteo",
      pasos: [{ duracion: "corchea", cuerdas: cuerdasVacias() }],
    });
  }

  function elegirTrazo(index: number) {
    const trazo = trazos[index];
    setTrazoIndex(index);
    setPasoIndex(trazo?.tipo === "punteo" ? 0 : null);
  }

  function elegirPaso(index: number) {
    setPasoIndex(index);
  }

  function cambiarDuracion(delta: -1 | 1) {
    if (herramienta.tipo === "punteo") {
      const indice = pasoIndex ?? 0;
      const actual = pasos[indice];

      if (!actual) {
        return;
      }

      const next = pasos.map((paso, index) =>
        index === indice
          ? { ...paso, duracion: moverDuracionTrazo(paso.duracion, delta) }
          : paso,
      );
      escribirPasos(next, indice);
      return;
    }

    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (!actual) {
      return;
    }

    if (actual.tipo === "punteo") {
      const indicePaso = pasoIndex ?? 0;
      const pasos = actual.pasos.map((paso, index) =>
        index === indicePaso
          ? { ...paso, duracion: moverDuracionTrazo(paso.duracion, delta) }
          : paso,
      );
      const next = trazos.slice();
      next[trazoIndex] = { tipo: "punteo", pasos };
      escribirTrazos(next, trazoIndex, indicePaso);
      return;
    }

    const next = trazos.slice();
    next[trazoIndex] = {
      ...actual,
      duracion: moverDuracionTrazo(actual.duracion, delta),
    };
    escribirTrazos(next, trazoIndex, null);
  }

  function ponerDedos(dedosRasgueo: DedosRasgueo) {
    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (!actual || actual.tipo !== "rasgueo") {
      return;
    }

    const next = trazos.slice();
    next[trazoIndex] = { ...actual, dedos: dedosRasgueo };
    escribirTrazos(next, trazoIndex, null);
  }

  function ponerDireccion(direccion: "abajo" | "arriba") {
    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (!actual || actual.tipo !== "rasgueo") {
      return;
    }

    const next = trazos.slice();
    next[trazoIndex] = { ...actual, direccion };
    escribirTrazos(next, trazoIndex, null);
  }

  function agregarPasoPunteo() {
    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (!actual || actual.tipo !== "punteo") {
      return;
    }

    const pasos = [
      ...actual.pasos,
      { duracion: "corchea" as const, cuerdas: cuerdasVacias() },
    ];
    const next = trazos.slice();
    next[trazoIndex] = { tipo: "punteo", pasos };
    escribirTrazos(next, trazoIndex, pasos.length - 1);
  }

  function pintarCuerdaRasgueo(cuerda: number) {
    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (!actual || actual.tipo !== "punteo") {
      return;
    }

    const indicePaso = pasoIndex ?? 0;
    const pasos = actual.pasos.map((paso, index) => {
      if (index !== indicePaso) {
        return paso;
      }

      const cuerdas = paso.cuerdas.slice();
      cuerdas[cuerda] = dedoPincel;
      return { ...paso, cuerdas };
    });
    const next = trazos.slice();
    next[trazoIndex] = { tipo: "punteo", pasos };
    escribirTrazos(next, trazoIndex, indicePaso);
  }

  function quitarTrazo() {
    if (trazoIndex === null) {
      return;
    }

    const actual = trazos[trazoIndex];

    if (actual?.tipo === "punteo" && actual.pasos.length > 1 && pasoIndex !== null) {
      const pasos = actual.pasos.filter((_, index) => index !== pasoIndex);
      const next = trazos.slice();
      next[trazoIndex] = { tipo: "punteo", pasos };
      escribirTrazos(next, trazoIndex, Math.max(0, pasoIndex - 1));
      return;
    }

    const next = trazos.filter((_, index) => index !== trazoIndex);
    escribirTrazos(next, null, null);
  }

  function escribirPasos(next: PasoPunteoRasgueo[], indice: number) {
    setPasosState(next);
    setPasoIndex(indice);

    if (control && herramienta.tipo === "punteo") {
      control.onChange(
        actualizarPatronPunteo(control.items, herramienta.patronId, {
          pasos: next,
        }),
      );
    }
  }

  function agregarMomentoPunteo() {
    const next = [
      ...pasos,
      { duracion: "corchea" as const, cuerdas: cuerdasVacias() },
    ];
    escribirPasos(next, next.length - 1);
  }

  function pintarCuerdaPunteo(cuerda: number) {
    const indice = pasoIndex ?? 0;
    const actual = pasos[indice];

    if (!actual) {
      return;
    }

    const next = pasos.map((paso, index) => {
      if (index !== indice) {
        return paso;
      }

      const cuerdas = paso.cuerdas.slice();
      cuerdas[cuerda] = dedoPincel;
      return { ...paso, cuerdas };
    });
    escribirPasos(next, indice);
  }

  function quitarMomentoPunteo() {
    if (pasos.length <= 1) {
      return;
    }

    const indice = pasoIndex ?? 0;
    const next = pasos.filter((_, index) => index !== indice);
    escribirPasos(next, Math.max(0, indice - 1));
  }

  function elegirMarca(anotacion: Anotacion) {
    setMarcaId(anotacion.id);
    setVista("lista");

    if (anotacion.tipo === "punteo" && anotacion.patronId) {
      setSeccion("punteo");
      setHerramienta({ tipo: "punteo", patronId: anotacion.patronId });
      setNombreState(nombrePunteo(anotacion));
      setPasosState(pasosDePunteo(anotacion));
      setPasoIndex(0);
      return;
    }

    if (anotacion.tipo !== "rasgueo") {
      return;
    }

    setSeccion("rasgueo");

    if (anotacion.corte || !anotacion.patronId) {
      setHerramienta({ tipo: "corte" });
      return;
    }

    setHerramienta({ tipo: "rasgueo", patronId: anotacion.patronId });
    setNombreState(nombreRasgueo(anotacion));
    setColorState(anotacion.rasgueoColor ?? "verde");
    setTrazosState(trazosDeRasgueo(anotacion));
    setTrazoIndex(null);
    setPasoIndex(null);
  }

  function colocar(lineIndex: number, charOffset: number) {
    if (!control || vista === "edicion") {
      return;
    }

    if (seccion === "rasgueo" && herramienta.tipo === "corte") {
      const id = crearAnotacionId();
      control.onChange(
        colocarCorteRasgueo(control.items, lineIndex, charOffset, id),
      );
      setMarcaId(id);
      return;
    }

    if (seccion === "punteo" && herramienta.tipo === "punteo") {
      const id = crearAnotacionId();
      control.onChange(
        colocarPunteo(control.items, {
          id,
          patronId: herramienta.patronId,
          lineIndex,
          charOffset,
          nombre: nombre.trim() || "Punteo",
          pasos,
        }),
      );
      setMarcaId(id);
      return;
    }

    if (seccion !== "rasgueo" || herramienta.tipo !== "rasgueo") {
      return;
    }

    const id = crearAnotacionId();
    control.onChange(
      colocarMarcaRasgueo(control.items, {
        id,
        patronId: herramienta.patronId,
        lineIndex,
        charOffset,
        nombre: nombre.trim() || "Rasgueo",
        color,
        trazos,
      }),
    );
    setMarcaId(id);
  }

  function quitarMarca() {
    if (!control || !marcaId) {
      return;
    }

    control.onChange(quitarMarcaCuerda(control.items, marcaId));
    setMarcaId(null);
  }

  function eliminarRasgueo(patronId: string) {
    if (!control) {
      return;
    }

    control.onChange(borrarPatronRasgueo(control.items, patronId));

    if (herramienta.tipo === "rasgueo" && herramienta.patronId === patronId) {
      setHerramienta({ tipo: "ninguna" });
      setVista("lista");
    }

    setMarcaId(null);
  }

  function eliminarPunteo(patronId: string) {
    if (!control) {
      return;
    }

    control.onChange(borrarPatronPunteo(control.items, patronId));

    if (herramienta.tipo === "punteo" && herramienta.patronId === patronId) {
      setHerramienta({ tipo: "ninguna" });
      setVista("lista");
    }

    setMarcaId(null);
  }

  return {
    seccion,
    vista,
    herramienta,
    nombre,
    color,
    trazos,
    trazoIndex,
    pasoIndex,
    pasos,
    dedoPincel,
    marcaId,
    patrones,
    patronesDePunteo,
    setDedoPincel,
    setNombre,
    setColor,
    agregarPulgar,
    agregarRasgueo,
    agregarSilencio,
    agregarPunteo,
    elegirTrazo,
    elegirPaso,
    cambiarDuracion,
    ponerDedos,
    ponerDireccion,
    agregarPasoPunteo,
    pintarCuerdaRasgueo,
    quitarTrazo,
    agregarMomentoPunteo,
    pintarCuerdaPunteo,
    quitarMomentoPunteo,
    irASeccion,
    volver,
    empezarNuevo,
    empezarCorte,
    empezarNuevoPunteo,
    elegirPatron,
    elegirPatronPunteo,
    editarPatron,
    editarPatronPunteo,
    elegirMarca,
    colocar,
    quitarMarca,
    eliminarRasgueo,
    eliminarPunteo,
  };
}

export type CuerdasEditorApi = ReturnType<typeof useCuerdasEditor>;
