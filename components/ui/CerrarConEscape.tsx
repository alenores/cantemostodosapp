"use client";

import { DESKTOP_MIN_WIDTH_PX } from "@/lib/app-layout";
import { useEffect } from "react";

const NOMBRE_DE_CIERRE = /^(cerrar|contraer|salir)\b/i;

function nombreDelBoton(el: HTMLElement): string {
  const etiqueta = el.getAttribute("aria-label")?.trim();
  if (etiqueta) return etiqueta;
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

function tieneIconoX(el: HTMLElement): boolean {
  for (const svg of el.querySelectorAll("svg")) {
    const clase = svg.getAttribute("class") ?? "";
    if (/(?:^|\s)lucide-x(?:\s|$)/.test(clase)) return true;
  }
  return false;
}

function estaOculto(el: HTMLElement): boolean {
  let nodo: HTMLElement | null = el;
  while (nodo) {
    if (nodo.hidden || nodo.getAttribute("aria-hidden") === "true") return true;
    const estilo = getComputedStyle(nodo);
    if (
      estilo.display === "none" ||
      estilo.visibility === "hidden" ||
      Number(estilo.opacity) === 0
    ) {
      return true;
    }
    nodo = nodo.parentElement;
  }
  return false;
}

function seVeEnPantalla(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const ancho = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
  const alto = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
  return ancho >= 8 && alto >= 8;
}

function capa(el: HTMLElement): number[] {
  const cadena: HTMLElement[] = [];
  let nodo: HTMLElement | null = el;
  while (nodo && nodo !== document.documentElement) {
    cadena.push(nodo);
    nodo = nodo.parentElement;
  }
  cadena.reverse();

  const niveles: number[] = [];
  for (const item of cadena) {
    const estilo = getComputedStyle(item);
    const puesto =
      estilo.position === "fixed" ||
      estilo.position === "absolute" ||
      estilo.position === "relative" ||
      estilo.position === "sticky";
    if (!puesto || estilo.zIndex === "auto") continue;
    const z = Number.parseInt(estilo.zIndex, 10);
    niveles.push(Number.isFinite(z) ? z : 0);
  }
  return niveles;
}

function compararCapas(a: number[], b: number[]): number {
  const largo = Math.max(a.length, b.length);
  for (let i = 0; i < largo; i += 1) {
    const diferencia = (a[i] ?? 0) - (b[i] ?? 0);
    if (diferencia !== 0) return diferencia;
  }
  return 0;
}

function sePuedeApretar(el: HTMLElement): boolean {
  if ((el as HTMLButtonElement).disabled || estaOculto(el) || !seVeEnPantalla(el)) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  const encima = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
  return encima !== null && (el.contains(encima) || encima.contains(el));
}

function hayVentanaMasAdelante(boton: HTMLElement): boolean {
  const capaBoton = capa(boton);
  for (const ventana of document.querySelectorAll<HTMLElement>('[role="dialog"]')) {
    if (estaOculto(ventana) || !seVeEnPantalla(ventana)) continue;
    if (ventana.contains(boton) || boton.contains(ventana)) continue;
    const comparacion = compararCapas(capa(ventana), capaBoton);
    if (comparacion > 0) return true;
    if (
      comparacion === 0 &&
      Boolean(boton.compareDocumentPosition(ventana) & Node.DOCUMENT_POSITION_FOLLOWING)
    ) {
      return true;
    }
  }
  return false;
}

function activarControl(el: HTMLElement) {
  const clave = Object.keys(el).find((key) => key.startsWith("__reactProps$"));
  const alClick = clave
    ? (el as unknown as Record<string, { onClick?: (event: unknown) => void }>)[clave]
        ?.onClick
    : undefined;

  if (typeof alClick === "function") {
    const nativo = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    const evento = {
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
        nativo.preventDefault();
      },
      stopPropagation() {
        nativo.stopPropagation();
      },
      currentTarget: el,
      target: el,
      button: 0,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      type: "click",
      nativeEvent: nativo,
    };
    alClick(evento);
    return;
  }

  el.click();
}

function buscarBotonCerrar(): HTMLElement | null {
  const candidatos = [
    ...document.querySelectorAll<HTMLElement>("button, a, [role='button']"),
  ].filter((el) => {
    if (!NOMBRE_DE_CIERRE.test(nombreDelBoton(el))) return false;
    if (!tieneIconoX(el)) return false;
    if (!sePuedeApretar(el)) return false;
    if (hayVentanaMasAdelante(el)) return false;
    return true;
  });

  candidatos.sort((a, b) => {
    const porCapa = compararCapas(capa(a), capa(b));
    if (porCapa !== 0) return porCapa;
    if (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    return 1;
  });

  return candidatos.at(-1) ?? null;
}

export default function CerrarConEscape() {
  useEffect(() => {
    const pantallaGrande = window.matchMedia(
      `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`,
    );

    function alApretarEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!pantallaGrande.matches || event.defaultPrevented) return;

      const boton = buscarBotonCerrar();
      if (!boton) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      activarControl(boton);
    }

    window.addEventListener("keydown", alApretarEscape, true);
    return () => window.removeEventListener("keydown", alApretarEscape, true);
  }, []);

  return null;
}
