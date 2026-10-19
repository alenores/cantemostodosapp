"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AnclaAyuda = "modos" | "letra" | "compas" | "renglon" | "acciones";

type PasoAyuda = {
  ancla: AnclaAyuda;
  titulo: string;
  cuerpo: string;
  /** El renglón se muestra entero, para que se vean el lápiz y el candado. */
  sinTope?: boolean;
};

const PASOS: PasoAyuda[] = [
  {
    ancla: "modos",
    titulo: "Los modos",
    cuerpo:
      "Acá elegís con qué trabajar: acordes, compás, letra y, si aparecen, canto y cuerdas.",
  },
  {
    ancla: "letra",
    titulo: "La letra",
    cuerpo:
      "Según el modo, tocá la letra para poner un acorde, marcar el compás o corregir el texto. Un acorde se puede arrastrar para moverlo, o tocar para cambiarlo.",
  },
  {
    ancla: "compas",
    titulo: "Las herramientas de compás",
    cuerpo:
      "En Componer elegís los golpes y cómo suena. En Guardado usás un ciclo que ya tenías. También podés decir cuántos ciclos van en el renglón y tocar la letra para repartirlos.",
  },
  {
    ancla: "renglon",
    titulo: "El lápiz y el candado",
    sinTope: true,
    cuerpo:
      "El lápiz abre las opciones de ese renglón: borrar, agregar uno abajo, copiar o unir. El candado lo deja fijo para no cambiarlo sin querer.",
  },
  {
    ancla: "acciones",
    titulo: "Guardar y reproducir",
    cuerpo:
      "Este botón muestra la canción. Si ya hay un compás, adentro está el play para escucharlo. Para guardar, completá el nombre y tocá Guardar, al final de esta columna.",
  },
];

const MARGEN = 12;
const RELLENO = 10;
const ANCHO_CARTEL = 300;
const ALTO_MAXIMO = 180;
const ALTO_RENGLON = 280;

function buscarAncla(ancla: string): Element | null {
  return document.querySelector(`[data-ayuda="${ancla}"]`);
}

function recorte(
  rect: DOMRect,
  sinTope: boolean,
): { top: number; left: number; width: number; height: number } {
  const top = Math.max(MARGEN, rect.top - RELLENO);
  const left = Math.max(MARGEN, rect.left - RELLENO);
  const width = Math.min(window.innerWidth - left - MARGEN, rect.width + RELLENO * 2);
  const altoNatural = rect.height + RELLENO * 2;
  const tope = sinTope ? ALTO_RENGLON : ALTO_MAXIMO;
  const height = Math.min(tope, altoNatural, window.innerHeight - top - MARGEN);

  return { top, left, width, height: Math.max(36, height) };
}

function lugarDelCartel(
  marca: { top: number; left: number; width: number; height: number },
  ancho: number,
  alto: number,
): { top: number; left: number } {
  let left = marca.left + marca.width / 2 - ancho / 2;
  left = Math.max(MARGEN, Math.min(left, window.innerWidth - ancho - MARGEN));

  const abajo = marca.top + marca.height + 12;
  const arriba = marca.top - alto - 12;
  const espacioAbajo = window.innerHeight - (marca.top + marca.height) - MARGEN;
  const espacioArriba = marca.top - MARGEN;
  let top = espacioAbajo >= alto || espacioAbajo >= espacioArriba ? abajo : arriba;

  if (top < MARGEN) top = MARGEN;
  if (top + alto > window.innerHeight - MARGEN) {
    top = Math.max(MARGEN, window.innerHeight - alto - MARGEN);
  }

  return { top, left };
}

export function CifradoEditorAyudaTour({
  onClose,
  onAncla,
}: {
  onClose: () => void;
  onAncla: (ancla: AnclaAyuda) => void;
}) {
  const [pasos, setPasos] = useState(PASOS);
  const [paso, setPaso] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [altoCartel, setAltoCartel] = useState(180);
  const cartelRef = useRef<HTMLDivElement>(null);
  const midiendoRef = useRef(false);
  const onAnclaRef = useRef(onAncla);
  const onCloseRef = useRef(onClose);

  onAnclaRef.current = onAncla;
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const visibles = PASOS.filter(
      (item) => item.ancla === "compas" || buscarAncla(item.ancla),
    );
    setPasos(visibles.length > 0 ? visibles : PASOS);
    setPaso(0);
  }, []);

  useEffect(() => {
    const ancla = pasos[paso]?.ancla;
    if (!ancla) return;
    onAnclaRef.current(ancla);
  }, [paso, pasos]);

  const medir = useCallback(() => {
    const actual = pasos[paso];
    if (!actual) {
      setRect(null);
      return;
    }

    const elemento = buscarAncla(actual.ancla);
    if (!elemento) {
      setRect(null);
      return;
    }

    const leer = () => setRect(elemento.getBoundingClientRect());
    const traerAlCentro = actual.ancla === "compas" || actual.ancla === "renglon";
    midiendoRef.current = true;
    elemento.scrollIntoView({
      behavior: "smooth",
      block: traerAlCentro ? "center" : "nearest",
      inline: "nearest",
    });
    leer();
    window.setTimeout(() => {
      leer();
      midiendoRef.current = false;
    }, 320);
  }, [paso, pasos]);

  useLayoutEffect(() => {
    medir();
    const esperas = [40, 140, 360].map((ms) => window.setTimeout(medir, ms));
    return () => {
      esperas.forEach((id) => window.clearTimeout(id));
    };
  }, [medir]);

  useLayoutEffect(() => {
    if (!cartelRef.current) return;
    setAltoCartel(cartelRef.current.getBoundingClientRect().height);
  }, [paso, pasos, rect]);

  useEffect(() => {
    const alMover = () => {
      if (midiendoRef.current) return;
      medir();
    };

    window.addEventListener("resize", alMover);
    window.addEventListener("scroll", alMover, true);
    return () => {
      window.removeEventListener("resize", alMover);
      window.removeEventListener("scroll", alMover, true);
    };
  }, [medir]);

  useEffect(() => {
    const alTeclado = (event: KeyboardEvent) => {
      const destino = event.target;
      const escribe =
        destino instanceof HTMLElement &&
        (destino.tagName === "INPUT" ||
          destino.tagName === "TEXTAREA" ||
          destino.isContentEditable);

      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (escribe) return;

      if (event.key === "ArrowRight") {
        setPaso((actual) => Math.min(pasos.length - 1, actual + 1));
      }

      if (event.key === "ArrowLeft") {
        setPaso((actual) => Math.max(0, actual - 1));
      }
    };

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [pasos.length]);

  const actual = pasos[paso];
  if (!actual) return null;

  const esPrimero = paso <= 0;
  const esUltimo = paso >= pasos.length - 1;
  const marca = rect ? recorte(rect, actual.sinTope === true) : null;
  const ancho = Math.min(ANCHO_CARTEL, window.innerWidth - MARGEN * 2);
  const lugar = marca
    ? lugarDelCartel(marca, ancho, altoCartel)
    : { top: Math.max(MARGEN, window.innerHeight / 2 - altoCartel / 2), left: MARGEN };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Ayuda del editor">
      <button
        type="button"
        aria-label="Cerrar ayuda"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={() => onCloseRef.current()}
      />

      {marca ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-accent"
          style={{
            top: marca.top,
            left: marca.left,
            width: marca.width,
            height: marca.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      <div
        ref={cartelRef}
        className="absolute"
        style={{ top: lugar.top, left: lugar.left, width: ancho }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="rounded-[16px] border border-border bg-bg-cola-sheet p-4 shadow-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
            Paso {paso + 1} de {pasos.length}
          </p>
          <h3 className="mt-1 text-base font-extrabold text-text-primary">{actual.titulo}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{actual.cuerpo}</p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" aria-hidden>
              {pasos.map((item, indice) => (
                <span
                  key={item.ancla}
                  className={`h-1.5 w-1.5 rounded-full ${
                    indice === paso ? "bg-accent" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <TapButton
                type="button"
                onClick={() => onCloseRef.current()}
                className="rounded-[10px] border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary"
              >
                Cerrar
              </TapButton>
              {!esPrimero ? (
                <TapButton
                  type="button"
                  onClick={() => setPaso((valor) => Math.max(0, valor - 1))}
                  className="rounded-[10px] border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-primary"
                >
                  Anterior
                </TapButton>
              ) : null}
              {esUltimo ? (
                <TapButton
                  type="button"
                  onClick={() => onCloseRef.current()}
                  className="rounded-[10px] bg-accent px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Listo
                </TapButton>
              ) : (
                <TapButton
                  type="button"
                  onClick={() => setPaso((valor) => Math.min(pasos.length - 1, valor + 1))}
                  className="rounded-[10px] bg-accent px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Siguiente
                </TapButton>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
