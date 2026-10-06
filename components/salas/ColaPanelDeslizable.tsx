"use client";

import {
  COLA_BARRA_RADIO_PX,
  COLA_PASTILLA_ZONA_PX,
  ColaPastilla,
} from "@/components/salas/ColaBarraProxima";
import { COLA_MODAL_TOP_INSET_PX } from "@/lib/sala-layout";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";

const PANEL_RADIO_ABIERTO_PX = 16;
/** Borde del panel (igual al de la barrita). */
const PANEL_BORDE_PX = 1;
const BACKDROP_OPACIDAD_MAX = 0.5;
/** Movimiento mínimo para decidir si el dedo arrastra el panel. */
const UMBRAL_ARRASTRE_PX = 4;
/** Tirón rápido (px/ms): decide la dirección aunque se suelte a mitad de camino. */
const VELOCIDAD_TIRON = 0.3;
/** Sin tirón: abre si subió más de un tercio; cierra si bajó más de un tercio. */
const UMBRAL_RECORRIDO = 1 / 3;
const DURACION_MS = 320;

export type ColaPanelEstado = "cerrado" | "moviendo" | "abierto";

export type ColaPanelDeslizableHandle = {
  abrir: () => void;
  cerrar: () => void;
  /** Toque sobre la barrita: si el dedo sube, el panel lo acompaña. */
  prepararArrastre: (clientY: number, clientX: number) => void;
};

type Rect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  radioInferior: number;
};

type Gesto =
  | {
      modo: "candidato-abrir" | "candidato-cerrar";
      startY: number;
      startX: number;
    }
  | {
      modo: "abrir" | "cerrar";
      startY: number;
      baseTop: number;
      prevY: number;
      prevT: number;
      lastY: number;
      lastT: number;
    };

type ColaPanelDeslizableProps = {
  zIndex: number;
  ariaLabel: string;
  /** Copia de la barrita cerrada, visible al comienzo de la transformación. */
  barra: ReactNode;
  /** Fila abierta (cabecera + lista). La lista lleva `data-cola-scroll`. */
  children: ReactNode;
  /** true mientras se arrastra una canción de la lista. */
  isBlocked?: () => boolean;
  onEstadoChange?: (estado: ColaPanelEstado) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(from: number, to: number, p: number) {
  return from + (to - from) * p;
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function prefiereMenosMovimiento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function medirSafeAreaTop(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height;
}

/** Rectángulo de la barrita cerrada; sin barrita (modo lectura), una línea en el borde inferior. */
function medirInicio(): Rect {
  const barra = document.querySelector<HTMLElement>("[data-cola-barra]");
  const rect = barra?.getBoundingClientRect();

  if (rect && rect.height > 0 && rect.width > 0) {
    return {
      top: rect.top,
      left: rect.left,
      right: window.innerWidth - rect.right,
      bottom: window.innerHeight - rect.bottom,
      radioInferior: COLA_BARRA_RADIO_PX,
    };
  }

  return {
    top: window.innerHeight,
    left: 0,
    right: 0,
    bottom: 0,
    radioInferior: 0,
  };
}

/**
 * Fila de canciones en celular: un único panel que crece desde la barrita
 * cerrada hasta la fila completa (pegada abajo, de borde a borde) siguiendo
 * al dedo, y vuelve a achicarse al bajarlo.
 */
const ColaPanelDeslizable = forwardRef<
  ColaPanelDeslizableHandle,
  ColaPanelDeslizableProps
>(function ColaPanelDeslizable(
  { zIndex, ariaLabel, barra, children, isBlocked, onEstadoChange },
  ref,
) {
  const [montado, setMontado] = useState(false);
  const [abiertoDelTodo, setAbiertoDelTodo] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const progresoRef = useRef(0);
  const objetivoRef = useRef<0 | 1>(0);
  const inicioRef = useRef<Rect | null>(null);
  const finTopRef = useRef(COLA_MODAL_TOP_INSET_PX);
  const animRef = useRef<number | null>(null);
  const gestoRef = useRef<Gesto | null>(null);
  const pendienteRef = useRef<"abrir" | null>(null);
  const montadoRef = useRef(false);
  const isBlockedRef = useRef(isBlocked);
  isBlockedRef.current = isBlocked;
  const onEstadoChangeRef = useRef(onEstadoChange);
  onEstadoChangeRef.current = onEstadoChange;

  const notificar = useCallback((estado: ColaPanelEstado) => {
    setAbiertoDelTodo(estado === "abierto");
    onEstadoChangeRef.current?.(estado);
  }, []);

  const medir = useCallback(() => {
    inicioRef.current = medirInicio();
    finTopRef.current = COLA_MODAL_TOP_INSET_PX + medirSafeAreaTop();
  }, []);

  const aplicar = useCallback((p: number) => {
    progresoRef.current = p;
    const panel = panelRef.current;
    const inicio = inicioRef.current;
    if (!panel || !inicio) return;

    const finTop = finTopRef.current;
    const top = lerp(inicio.top, finTop, p);
    const left = lerp(inicio.left, 0, p);
    const right = lerp(inicio.right, 0, p);
    const bottom = lerp(inicio.bottom, 0, p);
    const radioSup = lerp(COLA_BARRA_RADIO_PX, PANEL_RADIO_ABIERTO_PX, p);
    const radioInf = lerp(inicio.radioInferior, 0, p);

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.right = `${right}px`;
    panel.style.bottom = `${bottom}px`;
    panel.style.borderRadius = `${radioSup}px ${radioSup}px ${radioInf}px ${radioInf}px`;

    if (contenidoRef.current) {
      // La fila abierta conserva su tamaño final: el panel la va descubriendo.
      contenidoRef.current.style.left = `${-(left + PANEL_BORDE_PX)}px`;
      contenidoRef.current.style.width = `${window.innerWidth}px`;
      contenidoRef.current.style.height = `${
        window.innerHeight - finTop - COLA_PASTILLA_ZONA_PX - 2 * PANEL_BORDE_PX
      }px`;
      contenidoRef.current.style.opacity = `${clamp((p - 0.2) / 0.5, 0, 1)}`;
    }

    if (barraRef.current) {
      barraRef.current.style.opacity = `${clamp(1 - p / 0.3, 0, 1)}`;
    }

    if (backdropRef.current) {
      backdropRef.current.style.opacity = `${p * BACKDROP_OPACIDAD_MAX}`;
      backdropRef.current.style.pointerEvents = p > 0 ? "auto" : "none";
    }
  }, []);

  const detenerAnimacion = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const terminar = useCallback(
    (objetivo: 0 | 1) => {
      if (objetivo === 0) {
        montadoRef.current = false;
        inicioRef.current = null;
        setMontado(false);
        notificar("cerrado");
      } else {
        notificar("abierto");
      }
    },
    [notificar],
  );

  const animarA = useCallback(
    (objetivo: 0 | 1) => {
      detenerAnimacion();
      objetivoRef.current = objetivo;
      const desde = progresoRef.current;
      const distancia = Math.abs(objetivo - desde);

      if (distancia === 0 || prefiereMenosMovimiento()) {
        aplicar(objetivo);
        terminar(objetivo);
        return;
      }

      notificar("moviendo");
      const duracion = Math.max(140, DURACION_MS * distancia);
      const inicioT = performance.now();

      const paso = (ahora: number) => {
        const t = clamp((ahora - inicioT) / duracion, 0, 1);
        aplicar(lerp(desde, objetivo, easeOutCubic(t)));
        if (t < 1) {
          animRef.current = requestAnimationFrame(paso);
        } else {
          animRef.current = null;
          terminar(objetivo);
        }
      };

      animRef.current = requestAnimationFrame(paso);
    },
    [aplicar, detenerAnimacion, notificar, terminar],
  );

  const montar = useCallback(() => {
    if (montadoRef.current) return false;
    montadoRef.current = true;
    progresoRef.current = 0;
    setMontado(true);
    return true;
  }, []);

  const abrir = useCallback(() => {
    if (montadoRef.current && objetivoRef.current === 1 && !gestoRef.current) {
      return;
    }
    objetivoRef.current = 1;
    if (montar()) {
      inicioRef.current = null;
      pendienteRef.current = "abrir";
      return;
    }
    animarA(1);
  }, [animarA, montar]);

  const cerrar = useCallback(() => {
    if (!montadoRef.current) return;
    gestoRef.current = null;
    // La barrita pudo moverse (cambió la canción): el panel vuelve a donde está ahora.
    const p = progresoRef.current;
    medir();
    aplicar(p);
    animarA(0);
  }, [aplicar, animarA, medir]);

  // Seguimiento del dedo: solo mientras hay un gesto en curso.
  const onTouchMove = useCallback(
    (event: TouchEvent) => {
      const gesto = gestoRef.current;
      if (!gesto || event.touches.length !== 1) return;
      const touch = event.touches[0];

      if (gesto.modo === "candidato-abrir" || gesto.modo === "candidato-cerrar") {
        const dy = touch.clientY - gesto.startY;
        const dx = touch.clientX - gesto.startX;
        if (Math.abs(dy) < UMBRAL_ARRASTRE_PX && Math.abs(dx) < UMBRAL_ARRASTRE_PX) {
          return;
        }

        const vertical = Math.abs(dy) > Math.abs(dx);
        const abriendo = gesto.modo === "candidato-abrir";
        const valido =
          vertical && (abriendo ? dy < 0 : dy > 0) && !isBlockedRef.current?.();

        if (!valido) {
          gestoRef.current = null;
          return;
        }

        detenerAnimacion();
        if (abriendo) {
          objetivoRef.current = 1;
          montar();
          if (!inicioRef.current) medir();
        }
        const inicio = inicioRef.current ?? medirInicio();
        const baseTop = abriendo ? inicio.top : finTopRef.current;
        gestoRef.current = {
          modo: abriendo ? "abrir" : "cerrar",
          startY: touch.clientY,
          baseTop,
          prevY: touch.clientY,
          prevT: event.timeStamp,
          lastY: touch.clientY,
          lastT: event.timeStamp,
        };
        notificar("moviendo");
      }

      const activo = gestoRef.current;
      if (!activo || (activo.modo !== "abrir" && activo.modo !== "cerrar")) return;

      if (isBlockedRef.current?.()) {
        gestoRef.current = null;
        animarA(activo.modo === "cerrar" ? 1 : 0);
        return;
      }

      if (event.cancelable) event.preventDefault();

      const inicio = inicioRef.current;
      if (!inicio) return;
      const finTop = finTopRef.current;
      const top = clamp(activo.baseTop + (touch.clientY - activo.startY), finTop, inicio.top);
      const recorrido = inicio.top - finTop;
      aplicar(recorrido > 0 ? (inicio.top - top) / recorrido : 1);

      activo.prevY = activo.lastY;
      activo.prevT = activo.lastT;
      activo.lastY = touch.clientY;
      activo.lastT = event.timeStamp;
    },
    [animarA, aplicar, detenerAnimacion, medir, montar, notificar],
  );

  const onTouchEnd = useCallback(() => {
    const gesto = gestoRef.current;
    gestoRef.current = null;
    document.removeEventListener("touchmove", onTouchMove);

    if (!gesto || (gesto.modo !== "abrir" && gesto.modo !== "cerrar")) {
      return;
    }

    const dt = gesto.lastT - gesto.prevT;
    const velocidad = dt > 0 ? (gesto.lastY - gesto.prevY) / dt : 0;
    const p = progresoRef.current;

    let objetivo: 0 | 1;
    if (velocidad <= -VELOCIDAD_TIRON) {
      objetivo = 1;
    } else if (velocidad >= VELOCIDAD_TIRON) {
      objetivo = 0;
    } else if (gesto.modo === "abrir") {
      objetivo = p > UMBRAL_RECORRIDO ? 1 : 0;
    } else {
      objetivo = p < 1 - UMBRAL_RECORRIDO ? 0 : 1;
    }

    animarA(objetivo);
  }, [animarA, onTouchMove]);

  const empezarSeguimiento = useCallback(
    (gesto: Gesto) => {
      gestoRef.current = gesto;
      document.removeEventListener("touchmove", onTouchMove);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd, { once: true });
      document.addEventListener("touchcancel", onTouchEnd, { once: true });
    },
    [onTouchEnd, onTouchMove],
  );

  const prepararArrastre = useCallback(
    (clientY: number, clientX: number) => {
      if (montadoRef.current && progresoRef.current > 0) return;
      inicioRef.current = null;
      empezarSeguimiento({ modo: "candidato-abrir", startY: clientY, startX: clientX });
    },
    [empezarSeguimiento],
  );

  function handlePanelTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 1 || progresoRef.current < 1) return;
    if (isBlockedRef.current?.()) return;

    const target = event.target as Element;
    const scroller = target.closest("[data-cola-scroll]");
    if (scroller && scroller.scrollTop > 0) return;

    const touch = event.touches[0];
    empezarSeguimiento({ modo: "candidato-cerrar", startY: touch.clientY, startX: touch.clientX });
  }

  useImperativeHandle(ref, () => ({ abrir, cerrar, prepararArrastre }), [
    abrir,
    cerrar,
    prepararArrastre,
  ]);

  // Recién montado: ubicar el panel sobre la barrita antes de pintar.
  useLayoutEffect(() => {
    if (!montado) return;
    if (!inicioRef.current) medir();
    aplicar(progresoRef.current);

    if (pendienteRef.current === "abrir") {
      pendienteRef.current = null;
      animarA(1);
    }
  }, [animarA, aplicar, medir, montado]);

  useEffect(() => {
    if (!montado) return;

    function handleResize() {
      medir();
      aplicar(progresoRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [aplicar, medir, montado]);

  useEffect(() => {
    return () => {
      detenerAnimacion();
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [detenerAnimacion, onTouchEnd, onTouchMove]);

  if (!montado) {
    return null;
  }

  return (
    <>
      <button
        ref={backdropRef}
        type="button"
        aria-label="Cerrar fila"
        data-no-tap-feedback
        className="fixed inset-0 bg-black"
        style={{ zIndex, opacity: 0, pointerEvents: "none" }}
        onClick={cerrar}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="fixed overflow-hidden border-border bg-bg-cola-sheet shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
        style={{ zIndex: zIndex + 1, borderWidth: PANEL_BORDE_PX, borderStyle: "solid" }}
        onTouchStart={handlePanelTouchStart}
      >
        <ColaPastilla />
        <div
          ref={barraRef}
          className="pointer-events-none absolute inset-x-0"
          style={{ top: COLA_PASTILLA_ZONA_PX }}
          aria-hidden="true"
        >
          {barra}
        </div>
        <div
          ref={contenidoRef}
          className={`absolute flex flex-col ${abiertoDelTodo ? "" : "pointer-events-none"}`}
          style={{ top: COLA_PASTILLA_ZONA_PX, opacity: 0 }}
        >
          {children}
        </div>
      </div>
    </>
  );
});

export default ColaPanelDeslizable;
