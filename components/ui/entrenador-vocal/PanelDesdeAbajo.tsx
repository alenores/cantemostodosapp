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
  const [offset, setOffset] = useState(0);
  const [siguiendo, setSiguiendo] = useState(false);
  const hojaRef = useRef<HTMLElement>(null);
  const barritaRef = useRef<HTMLDivElement>(null);
  const inicioY = useRef(0);
  const ultimoY = useRef(0);
  const asomado = useRef(76);
  const modo = useRef<"quieto" | "subir" | "bajar">("quieto");

  function recorrido() {
    const alto = hojaRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.62);
    return Math.max(0, alto - asomado.current);
  }

  useLayoutEffect(() => {
    if (!abierto || modo.current !== "subir") return;
    const subio = inicioY.current - ultimoY.current;
    setOffset(Math.max(0, recorrido() - subio));
  }, [abierto]);

  function abrirDelTodo() {
    modo.current = "quieto";
    setSiguiendo(false);
    setOffset(0);
    setAbierto(true);
  }

  function cerrarDelTodo() {
    modo.current = "quieto";
    setSiguiendo(false);
    setOffset(recorrido());
    window.setTimeout(() => {
      setAbierto(false);
      setOffset(0);
    }, 200);
  }

  function escuchar(origen: "barrita" | "cabeza") {
    return (evento: React.PointerEvent<HTMLElement>) => {
      if (evento.button !== 0) return;
      evento.preventDefault();
      inicioY.current = evento.clientY;
      ultimoY.current = evento.clientY;
      if (origen === "barrita") {
        asomado.current = barritaRef.current?.offsetHeight ?? 76;
      }
      modo.current = "quieto";

      const mover = (movimiento: PointerEvent) => {
        ultimoY.current = movimiento.clientY;
        const subio = inicioY.current - movimiento.clientY;
        const bajo = movimiento.clientY - inicioY.current;

        if (modo.current === "quieto") {
          if (origen === "barrita" && subio >= PARA_EMPEZAR) {
            modo.current = "subir";
            setAbierto(true);
            setSiguiendo(true);
            setOffset(Math.max(0, Math.round(window.innerHeight * 0.62) - subio));
          } else if (origen === "cabeza" && bajo >= PARA_EMPEZAR) {
            modo.current = "bajar";
            setSiguiendo(true);
          } else {
            return;
          }
        }

        if (modo.current === "subir") {
          const alto = hojaRef.current?.offsetHeight ?? Math.round(window.innerHeight * 0.62);
          setOffset(Math.max(0, alto - asomado.current - subio));
        }

        if (modo.current === "bajar") {
          setOffset(Math.max(0, bajo));
        }
      };

      const soltar = (soltado: PointerEvent) => {
        window.removeEventListener("pointermove", mover);
        window.removeEventListener("pointerup", soltar);
        window.removeEventListener("pointercancel", soltar);

        const subio = inicioY.current - soltado.clientY;
        const bajo = soltado.clientY - inicioY.current;
        const gesto = modo.current;
        modo.current = "quieto";
        setSiguiendo(false);

        if (gesto === "subir") {
          if (subio > PARA_QUEDAR_ARRIBA) {
            setOffset(0);
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
          return;
        }

        if (origen === "barrita") abrirDelTodo();
        else cerrarDelTodo();
      };

      window.addEventListener("pointermove", mover);
      window.addEventListener("pointerup", soltar);
      window.addEventListener("pointercancel", soltar);
    };
  }

  return (
    <>
      {abierto ? null : (
        <div
          ref={barritaRef}
          role="button"
          tabIndex={0}
          className="panel-desde-abajo-barrita"
          aria-expanded={false}
          aria-label={`Abrir ${titulo}`}
          onPointerDown={escuchar("barrita")}
          onKeyDown={(evento) => {
            if (evento.key === "Enter" || evento.key === " ") {
              evento.preventDefault();
              abrirDelTodo();
            }
          }}
        >
          <span className="panel-desde-abajo-manija" aria-hidden="true" />
          <span className="panel-desde-abajo-textos">
            <span className="panel-desde-abajo-titulo">{titulo}</span>
            <span className="panel-desde-abajo-resumen">{resumen}</span>
          </span>
        </div>
      )}

      {abierto ? (
        <>
          <button
            type="button"
            className="panel-desde-abajo-fondo"
            aria-label="Cerrar configuración"
            onClick={cerrarDelTodo}
          />
          <section
            ref={hojaRef}
            className={`panel-desde-abajo-hoja ${siguiendo ? "panel-desde-abajo-hoja--arrastrando" : ""}`}
            style={{ transform: `translateY(${offset}px)` }}
            aria-label={titulo}
          >
            <div
              className="panel-desde-abajo-cabeza"
              onPointerDown={escuchar("cabeza")}
            >
              <span className="panel-desde-abajo-manija" aria-hidden="true" />
              <span className="panel-desde-abajo-textos">
                <span className="panel-desde-abajo-titulo">{titulo}</span>
              </span>
            </div>
            <div className="panel-desde-abajo-cuerpo ejercicio-calmo">{children}</div>
          </section>
        </>
      ) : null}
    </>
  );
}
