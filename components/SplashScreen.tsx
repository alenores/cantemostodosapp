"use client";

import { APP_READY_EVENT, SPLASH_MAX_VISIBLE_MS } from "@/lib/splash-theme";
import { useEffect } from "react";

const PAUSA_PARA_LEER_MS = 650;
const ENTRADA_TOPE_MS = 2800;
const SALIDA_TOPE_MS = 1200;
const TELON_MS = 900;

/**
 * Deja la presentación negra hasta que el inicio está armado y las palabras
 * ya se leyeron. Después salen por la derecha y el telón baja.
 * El tope existe para que una pantalla que no avisa igual se destape.
 */
export default function SplashScreen() {
  useEffect(() => {
    const splash = document.getElementById("inline-splash");
    if (!splash) return;

    let vivo = true;
    let listo = document.documentElement.dataset.appReady === "true";
    let entradaCumplida = false;
    let saliendo = false;
    const timers: number[] = [];

    const reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const theme = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"][media="(max-width: 1023px)"]',
    );
    const themeAnterior = theme?.getAttribute("content") ?? null;
    if (theme) theme.setAttribute("content", "#000000");

    function esperar(ms: number) {
      return new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, ms);
        timers.push(timer);
      });
    }

    function cuandoTerminen(nombre: string, topeMs: number) {
      const piezas = Array.from(splash!.querySelectorAll(".presentacion-pieza"));
      const animaciones = piezas.flatMap((pieza) =>
        pieza.getAnimations().filter((animacion) => {
          return "animationName" in animacion && animacion.animationName === nombre;
        }),
      );

      if (animaciones.length === 0) return esperar(topeMs);

      return new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, topeMs);
        timers.push(timer);
        void Promise.all(animaciones.map((animacion) => animacion.finished.catch(() => undefined))).then(() => {
          window.clearTimeout(timer);
          resolve();
        });
      });
    }

    function destapar() {
      splash!.style.display = "none";
      splash!.setAttribute("aria-hidden", "true");
      document.documentElement.classList.remove("splash-active");
      if (theme && themeAnterior) theme.setAttribute("content", themeAnterior);
    }

    function salir() {
      if (!vivo || saliendo || !listo || !entradaCumplida) return;
      saliendo = true;

      if (reducido) {
        destapar();
        return;
      }

      splash!.classList.add("presentacion-sale");
      window.requestAnimationFrame(() => {
        void cuandoTerminen("presentacion-salida", SALIDA_TOPE_MS).then(() => {
          if (!vivo) return;
          splash!.classList.add("presentacion-baja");
          const timer = window.setTimeout(destapar, TELON_MS);
          timers.push(timer);
        });
      });
    }

    function marcarListo() {
      listo = true;
      salir();
    }

    window.addEventListener(APP_READY_EVENT, marcarListo);
    if (listo) marcarListo();

    const tope = window.setTimeout(() => {
      listo = true;
      entradaCumplida = true;
      salir();
    }, SPLASH_MAX_VISIBLE_MS);
    timers.push(tope);

    void cuandoTerminen("presentacion-entrada", reducido ? 0 : ENTRADA_TOPE_MS).then(() =>
      esperar(reducido ? 450 : PAUSA_PARA_LEER_MS),
    ).then(() => {
      if (!vivo) return;
      entradaCumplida = true;
      salir();
    });

    return () => {
      vivo = false;
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener(APP_READY_EVENT, marcarListo);
    };
  }, []);

  return null;
}
