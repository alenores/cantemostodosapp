"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./encajar-ejercicio.css";

type PanelDesdeAbajoProps = {
  titulo: string;
  resumen: string;
  children: ReactNode;
};

const PARA_EMPEZAR = 6;
const PARA_QUEDAR_ARRIBA = 48;
const PARA_BAJAR = 72;

export function PanelDesdeAbajo({ titulo, resumen, children }: PanelDesdeAbajoProps) {
  const [abierto, setAbierto] = useState(false);
  const [offset, setOffset] = useState<number | null>(null);
  const [siguiendo, setSiguiendo] = useState(false);
  const hojaRef = useRef<HTMLElement>(null);
  const cabezaRef = useRef<HTMLDivElement>(null);
  const inicioY = useRef(0);
  const ultimoY = useRef(0);
  const cerradoEn = useRef(0);
  const modo = useRef<"quieto" | "subir" | "bajar">("quieto");
  const abiertoRef = useRef(false);
  const gestoActivo = useRef(false);
  const ignoraToqueFondo = useRef(false);

  abiertoRef.current = abierto;

  function medirCerrado() {
    const alto = hojaRef.current?.offsetHeight ?? 0;
    const cabeza = cabezaRef.current?.offsetHeight ?? 76;
    cerradoEn.current = Math.max(0, alto - cabeza);
    return cerradoEn.current;
  }

  useLayoutEffect(() => {
    const cerrado = medirCerrado();
    if (!abierto && modo.current === "quieto" && !gestoActivo.current) {
      setOffset(cerrado);
    }
  }, [abierto, titulo, resumen, children]);

  function abrirDelTodo() {
    modo.current = "quieto";
    gestoActivo.current = false;
    document.body.removeAttribute("data-gesto-panel");
    setSiguiendo(false);
    setOffset(0);
    setAbierto(true);
  }

  function cerrarDelTodo() {
    modo.current = "quieto";
    gestoActivo.current = false;
    document.body.removeAttribute("data-gesto-panel");
    setSiguiendo(false);
    setOffset(medirCerrado());
    setAbierto(false);
  }

  function escuchar(evento: React.PointerEvent<HTMLDivElement>) {
    if (evento.button !== 0) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    document.body.setAttribute("data-gesto-panel", "");
    gestoActivo.current = true;
    inicioY.current = evento.clientY;
    ultimoY.current = evento.clientY;
    modo.current = "quieto";
    const estabaAbierto = abiertoRef.current;
    const baseCerrada = medirCerrado();

    const bloquearDesliz = (toque: TouchEvent) => {
      if (toque.cancelable) toque.preventDefault();
    };

    const mover = (movimiento: PointerEvent) => {
      if (movimiento.cancelable) movimiento.preventDefault();
      ultimoY.current = movimiento.clientY;
      const subio = inicioY.current - movimiento.clientY;
      const bajo = movimiento.clientY - inicioY.current;

      if (modo.current === "quieto") {
        if (!estabaAbierto && subio >= PARA_EMPEZAR) {
          modo.current = "subir";
          setSiguiendo(true);
        } else if (estabaAbierto && bajo >= PARA_EMPEZAR) {
          modo.current = "bajar";
          setSiguiendo(true);
        } else {
          return;
        }
      }

      if (modo.current === "subir") {
        setOffset(Math.max(0, baseCerrada - subio));
      }

      if (modo.current === "bajar") {
        setOffset(Math.min(baseCerrada, Math.max(0, bajo)));
      }
    };

    const soltar = (soltado: PointerEvent) => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      document.removeEventListener("touchmove", bloquearDesliz);
      document.body.removeAttribute("data-gesto-panel");
      gestoActivo.current = false;

      const subio = inicioY.current - soltado.clientY;
      const bajo = soltado.clientY - inicioY.current;
      const gesto = modo.current;
      modo.current = "quieto";
      setSiguiendo(false);
      if (gesto !== "quieto") ignoraToqueFondo.current = true;

      if (gesto === "subir") {
        if (subio > PARA_QUEDAR_ARRIBA) {
          setOffset(0);
          setAbierto(true);
          return;
        }
        cerrarDelTodo();
        return;
      }

      if (gesto === "bajar") {
        if (bajo > PARA_BAJAR) {
          cerrarDelTodo();
          return;
        }
        setOffset(0);
        setAbierto(true);
        return;
      }

      if (estabaAbierto) cerrarDelTodo();
      else abrirDelTodo();
    };

    window.addEventListener("pointermove", mover, { passive: false });
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    document.addEventListener("touchmove", bloquearDesliz, { passive: false });
  }

  const cerradoVisual = !abierto && !siguiendo;

  return (
    <>
      {abierto || siguiendo ? (
        <div
          className="panel-desde-abajo-fondo"
          data-no-tap-feedback=""
          aria-hidden="true"
          onClick={() => {
            if (ignoraToqueFondo.current) {
              ignoraToqueFondo.current = false;
              return;
            }
            cerrarDelTodo();
          }}
        />
      ) : null}
      <section
        ref={hojaRef}
        className={`panel-desde-abajo-hoja ${siguiendo ? "panel-desde-abajo-hoja--arrastrando" : ""}`}
        style={{
          transform:
            offset == null ? "translateY(100%)" : `translateY(${offset}px)`,
        }}
        data-no-tap-feedback=""
        aria-label={titulo}
      >
        <div
          ref={cabezaRef}
          className={`panel-desde-abajo-cabeza ${abierto ? "" : "panel-desde-abajo-cabeza--asomada"}`}
          data-no-tap-feedback=""
          role="button"
          tabIndex={0}
          aria-expanded={abierto}
          aria-label={abierto ? `Cerrar ${titulo}` : `Abrir ${titulo}`}
          onPointerDown={escuchar}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
              evento.preventDefault();
              if (abierto) cerrarDelTodo();
              else abrirDelTodo();
            }
          }}
        >
          <span className="panel-desde-abajo-manija" aria-hidden="true" />
          <span className="panel-desde-abajo-textos">
            <span className="panel-desde-abajo-titulo">{titulo}</span>
            {abierto ? null : (
              <span className="panel-desde-abajo-resumen">{resumen}</span>
            )}
          </span>
        </div>
        <div
          className="panel-desde-abajo-cuerpo ejercicio-calmo"
          aria-hidden={cerradoVisual}
          {...(cerradoVisual ? { inert: true } : {})}
        >
          {children}
        </div>
      </section>
    </>
  );
}
