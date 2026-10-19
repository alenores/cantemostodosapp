"use client";

import type { CuerdasEditorApi } from "@/components/cifrado/useCuerdasEditor";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  DEDO_PUNTEO_CSS,
  DEDO_PUNTEO_LABEL,
  DEDOS_PUNTEO,
  nombrePunteo,
  nombreRasgueo,
  negrasPorCompas,
  patronesRasgueo,
  pasosDePunteo,
  PUNTEO_CUERDA_LABEL,
  PUNTEO_CUERDAS,
  RASGUEO_COLOR_CSS,
  RASGUEO_COLOR_LABEL,
  RASGUEO_COLORES,
  RASGUEO_COLUMNAS,
  RASGUEO_CONTEO,
} from "@/lib/cuerdas-practica";
import type {
  Anotacion,
  AnotacionVisibility,
  DedoPunteo,
  DedosRasgueo,
  PasoPunteoRasgueo,
  RasgueoGolpe,
  TrazoRasgueo,
} from "@/lib/anotaciones-practica";
import { DURACION_TRAZO_NEGRAS, duracionDeTrazo } from "@/lib/anotaciones-practica";
import type { TipoCompas } from "@/lib/cifrado";
import { MoreHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type CharPunto = {
  left: number;
  bottom: number;
};

function FlechaGolpe({
  golpe,
  grande = false,
}: {
  golpe: RasgueoGolpe;
  grande?: boolean;
}) {
  const size = grande ? 22 : 16;

  if (golpe === "vacio") {
    return (
      <span
        className="block rounded-full bg-text-muted/30"
        style={{ width: grande ? 6 : 4, height: grande ? 6 : 4 }}
        aria-hidden="true"
      />
    );
  }

  if (golpe === "apagado") {
    return (
      <span
        className="font-bold leading-none text-text-muted"
        style={{ fontSize: grande ? 16 : 12 }}
        aria-hidden="true"
      >
        ×
      </span>
    );
  }

  const arriba = golpe === "arriba";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {arriba ? (
        <>
          <line x1="8" y1="13" x2="8" y2="3" />
          <polyline points="4,7 8,3 12,7" />
        </>
      ) : (
        <>
          <line x1="8" y1="3" x2="8" y2="13" />
          <polyline points="4,9 8,13 12,9" />
        </>
      )}
    </svg>
  );
}

function etiquetaGolpe(golpe: RasgueoGolpe): string {
  if (golpe === "abajo") {
    return "hacia abajo";
  }

  if (golpe === "arriba") {
    return "hacia arriba";
  }

  if (golpe === "apagado") {
    return "apagado";
  }

  return "vacío";
}

function anchoDe(negras: number, compact: boolean): number {
  const corchea = compact ? 22 : 36;
  return (negras / 0.5) * corchea;
}

function etiquetaTrazo(trazo: TrazoRasgueo): string {
  if (trazo.tipo === "pulgar") {
    return "Pulgar";
  }

  if (trazo.tipo === "silencio") {
    return "Silencio";
  }

  if (trazo.tipo === "apagado") {
    return "Apagado";
  }

  if (trazo.tipo === "punteo") {
    return "Punteo";
  }

  const hacia = trazo.direccion === "arriba" ? "hacia arriba" : "hacia abajo";
  return `Rasgueo con ${trazo.dedos} ${trazo.dedos === 1 ? "dedo" : "dedos"}, ${hacia}`;
}

export function RasgueoDibujo({
  trazos,
  compact = false,
  tipoCompas = "4-4",
  seleccionado = null,
  onSelect,
}: {
  trazos: TrazoRasgueo[];
  compact?: boolean;
  tipoCompas?: TipoCompas;
  seleccionado?: number | null;
  onSelect?: (index: number) => void;
}) {
  if (trazos.length === 0) {
    return (
      <p className="text-[11px] text-text-muted">Todavía no hay golpes.</p>
    );
  }

  const unidades = negrasPorCompas(tipoCompas);
  const anchos = trazos.map((trazo) => anchoDe(duracionDeTrazo(trazo), compact));
  const total = trazos.reduce((suma, trazo) => suma + duracionDeTrazo(trazo), 0);
  const cortes: { left: number; numero: number | null }[] = [
    { left: 0, numero: 1 },
  ];
  let acumulado = 0;
  let izquierda = 0;

  trazos.forEach((trazo, index) => {
    const negras = duracionDeTrazo(trazo);
    const ancho = anchos[index] ?? 0;
    const antes = acumulado;
    acumulado += negras;
    let marca = Math.ceil((antes + 0.001) / unidades) * unidades;

    while (marca < acumulado - 0.001) {
      const parte = negras === 0 ? 0 : (marca - antes) / negras;
      cortes.push({
        left: izquierda + parte * ancho,
        numero: Math.round(marca / unidades) + 1,
      });
      marca += unidades;
    }

    izquierda += ancho;
  });

  if (total > 0 && Math.abs(total / unidades - Math.round(total / unidades)) < 0.001) {
    cortes.push({ left: izquierda, numero: null });
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative pt-3" style={{ width: izquierda }}>
        <div className="flex">
          {trazos.map((trazo, index) => {
            const contenido = <ContenidoTrazo trazo={trazo} compact={compact} />;
            const clase = `flex shrink-0 flex-col overflow-hidden border-y border-r border-border/70 bg-bg-card first:rounded-l-md first:border-l last:rounded-r-md ${
              seleccionado === index ? "ring-2 ring-accent" : ""
            } ${compact ? "h-14" : "h-24"}`;

            if (!onSelect) {
              return (
                <div
                  key={index}
                  className={clase}
                  style={{ width: anchos[index] }}
                  aria-label={etiquetaTrazo(trazo)}
                >
                  {contenido}
                </div>
              );
            }

            return (
              <TapButton
                key={index}
                type="button"
                onClick={() => onSelect(index)}
                className={clase}
                style={{ width: anchos[index] }}
                aria-label={etiquetaTrazo(trazo)}
              >
                {contenido}
              </TapButton>
            );
          })}
        </div>
        {cortes.map((corte) => (
          <span
            key={`${corte.numero}-${corte.left}`}
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-text-muted/70"
            style={{ left: corte.left }}
          >
            <span className="absolute -top-0.5 left-0.5 text-[8px] font-bold text-text-muted">
              {corte.numero ?? ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function ContenidoTrazo({
  trazo,
  compact,
}: {
  trazo: TrazoRasgueo;
  compact: boolean;
}) {
  if (trazo.tipo === "punteo") {
    return (
      <span className="flex h-full min-w-0">
        {trazo.pasos.map((paso, index) => (
          <span
            key={index}
            className="flex h-full min-w-0 flex-col justify-center"
            style={{ width: anchoDe(DURACION_TRAZO_NEGRAS[paso.duracion], compact) }}
          >
            {paso.cuerdas.map((dedo, cuerda) => (
              <span
                key={cuerda}
                className={`flex flex-1 items-center justify-center font-bold leading-none ${
                  compact ? "text-[7px]" : "text-[9px]"
                } ${dedo ? "text-white" : "text-transparent"}`}
                style={
                  dedo ? { backgroundColor: DEDO_PUNTEO_CSS[dedo] } : undefined
                }
              >
                {dedo ?? "·"}
              </span>
            ))}
          </span>
        ))}
      </span>
    );
  }

  if (trazo.tipo === "silencio") {
    return <span className="m-auto h-px w-2/3 bg-text-muted/50" />;
  }

  if (trazo.tipo === "pulgar") {
    return (
      <span className={`m-auto font-bold text-text-primary ${compact ? "text-[10px]" : "text-xs"}`}>
        P
      </span>
    );
  }

  if (trazo.tipo === "apagado") {
    return (
      <span className={`m-auto font-bold text-text-muted ${compact ? "text-sm" : "text-base"}`}>
        ×
      </span>
    );
  }

  return (
    <span className="m-auto flex items-center gap-0.5 text-text-primary">
      <FlechaGolpe golpe={trazo.direccion} grande={!compact} />
      <span className={`font-bold ${compact ? "text-[10px]" : "text-xs"}`}>
        {trazo.dedos}
      </span>
    </span>
  );
}

export function PunteoDibujo({
  pasos,
  compact = false,
  tipoCompas = "4-4",
  seleccionado = null,
  onSelect,
}: {
  pasos: PasoPunteoRasgueo[];
  compact?: boolean;
  tipoCompas?: TipoCompas;
  seleccionado?: number | null;
  onSelect?: (index: number) => void;
}) {
  if (pasos.length === 0) {
    return <p className="text-[11px] text-text-muted">Todavía no hay momentos.</p>;
  }

  const unidades = negrasPorCompas(tipoCompas);
  const anchos = pasos.map((paso) => anchoDe(DURACION_TRAZO_NEGRAS[paso.duracion], compact));
  const total = pasos.reduce(
    (suma, paso) => suma + DURACION_TRAZO_NEGRAS[paso.duracion],
    0,
  );
  const cortes: { left: number; numero: number | null }[] = [{ left: 0, numero: 1 }];
  let acumulado = 0;
  let izquierda = 0;

  pasos.forEach((paso, index) => {
    const negras = DURACION_TRAZO_NEGRAS[paso.duracion];
    const ancho = anchos[index] ?? 0;
    const antes = acumulado;
    acumulado += negras;
    let marca = Math.ceil((antes + 0.001) / unidades) * unidades;

    while (marca < acumulado - 0.001) {
      const parte = negras === 0 ? 0 : (marca - antes) / negras;
      cortes.push({
        left: izquierda + parte * ancho,
        numero: Math.round(marca / unidades) + 1,
      });
      marca += unidades;
    }

    izquierda += ancho;
  });

  if (total > 0 && Math.abs(total / unidades - Math.round(total / unidades)) < 0.001) {
    cortes.push({ left: izquierda, numero: null });
  }

  return (
    <div className="overflow-x-auto pb-1" aria-label="Punteo">
      <div className="relative pt-3" style={{ width: izquierda }}>
        <div className="flex">
          {pasos.map((paso, index) => {
            const clase = `flex shrink-0 flex-col overflow-hidden border-y border-r border-border/70 first:rounded-l-md first:border-l last:rounded-r-md ${
              seleccionado === index ? "ring-2 ring-accent" : ""
            } ${compact ? "h-14" : "h-24"}`;
            const celdas = paso.cuerdas.map((dedo, cuerda) => (
              <span
                key={cuerda}
                className={`flex flex-1 items-center justify-center font-bold leading-none ${
                  compact ? "text-[8px]" : "text-[11px]"
                } ${dedo ? "text-white" : "bg-bg-card text-transparent"}`}
                style={dedo ? { backgroundColor: DEDO_PUNTEO_CSS[dedo] } : undefined}
              >
                {dedo ?? "·"}
              </span>
            ));

            if (!onSelect) {
              return (
                <div key={index} className={clase} style={{ width: anchos[index] }}>
                  {celdas}
                </div>
              );
            }

            return (
              <TapButton
                key={index}
                type="button"
                onClick={() => onSelect(index)}
                className={clase}
                style={{ width: anchos[index] }}
              >
                {celdas}
              </TapButton>
            );
          })}
        </div>
        {cortes.map((corte) => (
          <span
            key={`${corte.numero}-${corte.left}`}
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-text-muted/70"
            style={{ left: corte.left }}
          >
            <span className="absolute -top-0.5 left-0.5 text-[8px] font-bold text-text-muted">
              {corte.numero ?? ""}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PunteoGrid({
  dedos,
  onPaint,
  compact = false,
}: {
  dedos: (DedoPunteo | null)[];
  onPaint?: (index: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="space-y-0.5" aria-label="Punteo">
      <div
        className="grid items-center gap-0.5"
        style={{ gridTemplateColumns: "14px repeat(8, minmax(0, 1fr))" }}
      >
        <span />
        {RASGUEO_CONTEO.map((conteo) => (
          <span
            key={conteo}
            className={`text-center font-bold text-text-muted ${
              compact ? "text-[8px]" : "text-[10px]"
            }`}
          >
            {conteo}
          </span>
        ))}
      </div>
      {PUNTEO_CUERDA_LABEL.slice(0, PUNTEO_CUERDAS).map((cuerda, fila) => (
        <div
          key={cuerda}
          className="grid items-center gap-0.5"
          style={{ gridTemplateColumns: "14px repeat(8, minmax(0, 1fr))" }}
        >
          <span
            className={`text-center font-bold text-text-muted ${
              compact ? "text-[8px]" : "text-[10px]"
            }`}
          >
            {cuerda}
          </span>
          {Array.from({ length: RASGUEO_COLUMNAS }, (_, columna) => {
            const index = fila * RASGUEO_COLUMNAS + columna;
            const dedo = dedos[index] ?? null;
            const estilo = dedo
              ? { backgroundColor: DEDO_PUNTEO_CSS[dedo], color: "#fff" }
              : undefined;
            const clase = `flex items-center justify-center rounded-sm font-bold ${
              compact ? "h-4 text-[8px]" : "h-7 text-[11px]"
            } ${dedo ? "" : "bg-bg-dark text-transparent"}`;

            if (!onPaint) {
              return (
                <span
                  key={index}
                  className={clase}
                  style={estilo}
                  aria-label={
                    dedo
                      ? `Cuerda ${cuerda}, ${DEDO_PUNTEO_LABEL[dedo]}`
                      : `Cuerda ${cuerda}, vacío`
                  }
                >
                  {dedo ?? "·"}
                </span>
              );
            }

            return (
              <TapButton
                key={index}
                type="button"
                onClick={() => onPaint(index)}
                className={clase}
                style={estilo}
                aria-label={
                  dedo
                    ? `Cuerda ${cuerda}, ${DEDO_PUNTEO_LABEL[dedo]}`
                    : `Cuerda ${cuerda}, vacío`
                }
              >
                {dedo ?? "·"}
              </TapButton>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function visible(
  visibility: AnotacionVisibility | undefined,
  tipo: "rasgueo" | "punteo",
): boolean {
  if (!visibility) {
    return true;
  }

  return visibility[tipo] !== false;
}

export function RasgueoMarcasLinea({
  anotaciones,
  visibility,
  onOpen,
  colapsado = false,
  tipoCompas = "4-4",
}: {
  anotaciones: Anotacion[];
  visibility?: AnotacionVisibility;
  onOpen?: (anotacion: Anotacion) => void;
  /** En lectura y previsualización: solo la etiqueta, y se abre al tocarla. */
  colapsado?: boolean;
  tipoCompas?: TipoCompas;
}) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  if (!visible(visibility, "rasgueo")) {
    return null;
  }

  const marcas = anotaciones.filter(
    (anotacion) => anotacion.tipo === "rasgueo" && !anotacion.catalogo,
  );

  if (marcas.length === 0) {
    return null;
  }

  return (
    <div className="relative z-20 mb-1 flex flex-col gap-1">
      {marcas.map((anotacion) => {
        const color = anotacion.corte
          ? "#a8a29e"
          : RASGUEO_COLOR_CSS[anotacion.rasgueoColor ?? "verde"];
        const nombre = anotacion.corte ? "Sin rasgueo" : nombreRasgueo(anotacion);
        const abierto =
          colapsado && !anotacion.corte && Boolean(abiertos[anotacion.id]);

        return (
          <div key={anotacion.id}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                if (colapsado && !anotacion.corte) {
                  setAbiertos((actual) => ({
                    ...actual,
                    [anotacion.id]: !actual[anotacion.id],
                  }));
                  return;
                }

                onOpen?.(anotacion);
              }}
              className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 46%, white)`,
                color: "#1c1917",
              }}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="truncate">{nombre}</span>
            </button>
            {abierto ? (
              <div className="mt-1 rounded-lg border border-border/70 bg-bg-card/80 px-1.5 py-1">
                <RasgueoDibujo trazos={anotacion.trazos ?? []} compact tipoCompas={tipoCompas} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function PunteoMarcasLinea({
  anotaciones,
  charPositions,
  visibility,
  onOpen,
  colapsado = false,
  tipoCompas = "4-4",
}: {
  anotaciones: Anotacion[];
  charPositions: CharPunto[];
  visibility?: AnotacionVisibility;
  onOpen?: (anotacion: Anotacion) => void;
  /** En lectura y previsualización: solo la etiqueta, y se abre al tocarla. */
  colapsado?: boolean;
  tipoCompas?: TipoCompas;
}) {
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});

  if (!visible(visibility, "punteo")) {
    return null;
  }

  const marcas = anotaciones.filter(
    (anotacion) => anotacion.tipo === "punteo" && !anotacion.catalogo,
  );

  if (marcas.length === 0) {
    return null;
  }

  return (
    <div className="relative z-20 mt-1 space-y-1.5">
      {marcas.map((anotacion) => {
        const abierto = !colapsado || Boolean(abiertos[anotacion.id]);
        const punto = charPositions[anotacion.charOffset];

        return (
          <div key={anotacion.id}>
            {colapsado ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setAbiertos((actual) => ({
                    ...actual,
                    [anotacion.id]: !actual[anotacion.id],
                  }));
                }}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                style={{
                  marginLeft: punto ? Math.min(punto.left, 48) : 0,
                  backgroundColor: "color-mix(in srgb, #d97706 46%, white)",
                  color: "#1c1917",
                }}
              >
                {nombrePunteo(anotacion)}
              </button>
            ) : null}
            {abierto ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!colapsado) {
                    onOpen?.(anotacion);
                  }
                }}
                className="mt-1 block w-full rounded-lg border border-border/70 bg-bg-card/80 px-1.5 py-1 text-left"
              >
                <PunteoDibujo
                  pasos={pasosDePunteo(anotacion)}
                  compact
                  tipoCompas={tipoCompas}
                />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function opcionClass(activo: boolean): string {
  return `flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-2 py-2 text-left text-sm font-bold ${
    activo
      ? "bg-[var(--accent-entrenador-canciones-dim)] ring-1 ring-[var(--accent-entrenador-canciones)] text-text-primary"
      : "text-text-primary hover:bg-bg-dark"
  }`;
}

function tabClass(activo: boolean): string {
  return `flex-1 rounded-full px-2 py-1.5 text-sm font-bold ${
    activo ? "bg-accent text-white" : "text-text-muted"
  }`;
}

const botonGolpeClass =
  "rounded-[10px] border border-border bg-bg-darker py-2 text-xs font-bold text-text-primary";

function DuracionGolpe({
  onCorto,
  onLargo,
  onQuitar,
  quitarLabel,
}: {
  onCorto: () => void;
  onLargo: () => void;
  onQuitar: () => void;
  quitarLabel: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <TapButton
          type="button"
          onClick={onCorto}
          className={`${botonGolpeClass} flex-1`}
        >
          Más corto
        </TapButton>
        <TapButton
          type="button"
          onClick={onLargo}
          className={`${botonGolpeClass} flex-1`}
        >
          Más largo
        </TapButton>
      </div>
      <TapButton
        type="button"
        onClick={onQuitar}
        className="w-full rounded-[10px] border border-border bg-bg-darker py-2 text-xs font-semibold text-text-secondary"
      >
        {quitarLabel}
      </TapButton>
    </div>
  );
}

function EditorTrazo({ api }: { api: CuerdasEditorApi }) {
  const trazo = api.trazoIndex === null ? null : api.trazos[api.trazoIndex];

  if (!trazo) {
    return null;
  }

  const paso =
    trazo.tipo === "punteo" ? trazo.pasos[api.pasoIndex ?? 0] : null;

  return (
    <section className="space-y-3 rounded-[12px] border border-border bg-bg-dark p-3">
      {trazo.tipo === "rasgueo" ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-1">
            {([1, 2, 3, 4] as DedosRasgueo[]).map((cantidad) => (
              <TapButton
                key={cantidad}
                type="button"
                onClick={() => api.ponerDedos(cantidad)}
                className={`${botonGolpeClass} ${
                  trazo.dedos === cantidad ? "ring-2 ring-accent" : ""
                }`}
              >
                {cantidad} {cantidad === 1 ? "dedo" : "dedos"}
              </TapButton>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <TapButton
              type="button"
              onClick={() => api.ponerDireccion("abajo")}
              className={`${botonGolpeClass} ${
                trazo.direccion === "abajo" ? "ring-2 ring-accent" : ""
              }`}
            >
              Hacia abajo
            </TapButton>
            <TapButton
              type="button"
              onClick={() => api.ponerDireccion("arriba")}
              className={`${botonGolpeClass} ${
                trazo.direccion === "arriba" ? "ring-2 ring-accent" : ""
              }`}
            >
              Hacia arriba
            </TapButton>
          </div>
        </div>
      ) : null}
      {trazo.tipo === "punteo" && paso ? (
        <div className="space-y-2">
          <div className="grid grid-cols-5 gap-1">
            {DEDOS_PUNTEO.map((dedo) => (
              <TapButton
                key={dedo}
                type="button"
                onClick={() => api.setDedoPincel(dedo)}
                className={`rounded-md py-1 text-xs font-bold text-white ${
                  api.dedoPincel === dedo ? "ring-2 ring-text-primary" : ""
                }`}
                style={{ backgroundColor: DEDO_PUNTEO_CSS[dedo] }}
              >
                {dedo}
              </TapButton>
            ))}
            <TapButton
              type="button"
              onClick={() => api.setDedoPincel(null)}
              className={`rounded-md bg-bg-darker py-1 text-[10px] font-bold text-text-secondary ${
                api.dedoPincel === null ? "ring-2 ring-text-primary" : ""
              }`}
            >
              Borrar
            </TapButton>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {PUNTEO_CUERDA_LABEL.map((cuerda, index) => {
              const dedo = paso.cuerdas[index] ?? null;

              return (
                <TapButton
                  key={cuerda}
                  type="button"
                  onClick={() => api.pintarCuerdaRasgueo(index)}
                  className={`rounded-md py-2 text-xs font-bold ${
                    dedo ? "text-white" : "bg-bg-darker text-text-secondary"
                  }`}
                  style={
                    dedo ? { backgroundColor: DEDO_PUNTEO_CSS[dedo] } : undefined
                  }
                >
                  {cuerda}
                </TapButton>
              );
            })}
          </div>
          <TapButton
            type="button"
            onClick={api.agregarPasoPunteo}
            className={`${botonGolpeClass} w-full`}
          >
            Otro momento
          </TapButton>
        </div>
      ) : null}
      <DuracionGolpe
        onCorto={() => api.cambiarDuracion(-1)}
        onLargo={() => api.cambiarDuracion(1)}
        onQuitar={api.quitarTrazo}
        quitarLabel={
          trazo.tipo === "punteo" && trazo.pasos.length > 1
            ? "Quitar este momento"
            : "Quitar este golpe"
        }
      />
    </section>
  );
}

function CampoNombre({ api }: { api: CuerdasEditorApi }) {
  return (
    <label className="block text-[11px] font-bold text-text-muted">
      Nombre
      <input
        value={api.nombre}
        maxLength={24}
        onChange={(event) => api.setNombre(event.target.value)}
        className="mt-1 w-full rounded-[10px] border border-border bg-bg-dark px-2 py-1.5 text-sm font-semibold text-text-primary outline-none"
      />
    </label>
  );
}

type BorradoPendiente = {
  tipo: "rasgueo" | "punteo";
  id: string;
  nombre: string;
};

function FilaCreada({
  nombre,
  activo,
  color,
  menuAbierto,
  onElegir,
  onMenu,
  onEditar,
  onEliminar,
}: {
  nombre: string;
  activo: boolean;
  color?: string;
  menuAbierto: boolean;
  onElegir: () => void;
  onMenu: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <TapButton type="button" onClick={onElegir} className={opcionClass(activo)}>
          {color ? (
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate">{nombre}</span>
        </TapButton>
        <TapButton
          type="button"
          aria-label={`Opciones de ${nombre}`}
          aria-expanded={menuAbierto}
          onClick={onMenu}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-muted"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </TapButton>
      </div>
      {menuAbierto ? (
        <div className="mt-1 overflow-hidden rounded-[10px] border border-border bg-bg-dark">
          <button
            type="button"
            onClick={onEditar}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-text-primary"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onEliminar}
            className="block w-full border-t border-border px-3 py-2 text-left text-sm font-semibold text-[#d94a3d]"
          >
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FormularioRasgueo({
  api,
  tipoCompas,
}: {
  api: CuerdasEditorApi;
  tipoCompas: TipoCompas;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <CampoNombre api={api} />
        <div className="flex gap-1.5" role="listbox" aria-label="Color">
          {RASGUEO_COLORES.map((color) => {
            const activo = api.color === color;

            return (
              <TapButton
                key={color}
                type="button"
                aria-label={RASGUEO_COLOR_LABEL[color]}
                onClick={() => api.setColor(color)}
                className={`size-7 rounded-full ${activo ? "ring-2 ring-text-primary ring-offset-2 ring-offset-bg-darker" : ""}`}
                style={{ backgroundColor: RASGUEO_COLOR_CSS[color] }}
              >
                <span className="sr-only">{RASGUEO_COLOR_LABEL[color]}</span>
              </TapButton>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-[12px] border border-border bg-bg-dark p-3">
        <div className="grid grid-cols-5 gap-1">
          <TapButton type="button" onClick={api.agregarPulgar} className={botonGolpeClass}>
            Pulgar
          </TapButton>
          <TapButton type="button" onClick={() => api.agregarRasgueo("abajo")} className={botonGolpeClass}>
            Abajo
          </TapButton>
          <TapButton type="button" onClick={() => api.agregarRasgueo("arriba")} className={botonGolpeClass}>
            Arriba
          </TapButton>
          <TapButton type="button" onClick={api.agregarSilencio} className={botonGolpeClass}>
            Silencio
          </TapButton>
          <TapButton type="button" onClick={api.agregarPunteo} className={botonGolpeClass}>
            Punteo
          </TapButton>
        </div>
        <RasgueoDibujo
          trazos={api.trazos}
          tipoCompas={tipoCompas}
          seleccionado={api.trazoIndex}
          onSelect={api.elegirTrazo}
        />
      </section>

      <EditorTrazo api={api} />
    </div>
  );
}

function FormularioPunteo({
  api,
  tipoCompas,
}: {
  api: CuerdasEditorApi;
  tipoCompas: TipoCompas;
}) {
  const paso = api.pasos[api.pasoIndex ?? 0];

  return (
    <div className="space-y-5">
      <CampoNombre api={api} />

      <section className="space-y-3 rounded-[12px] border border-border bg-bg-dark p-3">
        <div className="grid grid-cols-5 gap-1">
          {DEDOS_PUNTEO.map((dedo) => (
            <TapButton
              key={dedo}
              type="button"
              onClick={() => api.setDedoPincel(dedo)}
              className={`rounded-md py-1 text-xs font-bold text-white ${
                api.dedoPincel === dedo ? "ring-2 ring-text-primary" : ""
              }`}
              style={{ backgroundColor: DEDO_PUNTEO_CSS[dedo] }}
            >
              {dedo}
            </TapButton>
          ))}
          <TapButton
            type="button"
            onClick={() => api.setDedoPincel(null)}
            className={`rounded-md bg-bg-darker py-1 text-[10px] font-bold text-text-secondary ${
              api.dedoPincel === null ? "ring-2 ring-text-primary" : ""
            }`}
          >
            Borrar
          </TapButton>
        </div>
        {paso ? (
          <div className="grid grid-cols-6 gap-1">
            {PUNTEO_CUERDA_LABEL.map((cuerda, index) => {
              const dedo = paso.cuerdas[index] ?? null;

              return (
                <TapButton
                  key={cuerda}
                  type="button"
                  onClick={() => api.pintarCuerdaPunteo(index)}
                  className={`rounded-md py-2 text-xs font-bold ${
                    dedo ? "text-white" : "bg-bg-darker text-text-secondary"
                  }`}
                  style={dedo ? { backgroundColor: DEDO_PUNTEO_CSS[dedo] } : undefined}
                >
                  {cuerda}
                </TapButton>
              );
            })}
          </div>
        ) : null}
        <TapButton
          type="button"
          onClick={api.agregarMomentoPunteo}
          className={`${botonGolpeClass} w-full`}
        >
          Otro momento
        </TapButton>
        <PunteoDibujo
          pasos={api.pasos}
          tipoCompas={tipoCompas}
          seleccionado={api.pasoIndex}
          onSelect={api.elegirPaso}
        />
      </section>

      <section className="rounded-[12px] border border-border bg-bg-dark p-3">
        <DuracionGolpe
          onCorto={() => api.cambiarDuracion(-1)}
          onLargo={() => api.cambiarDuracion(1)}
          onQuitar={api.quitarMomentoPunteo}
          quitarLabel="Quitar este momento"
        />
      </section>
    </div>
  );
}

function CuerdasEdicionModal({
  api,
  tipoCompas,
}: {
  api: CuerdasEditorApi;
  tipoCompas: TipoCompas;
}) {
  const [mounted, setMounted] = useState(false);
  const abierto =
    api.vista === "edicion" &&
    (api.herramienta.tipo === "rasgueo" || api.herramienta.tipo === "punteo");
  const titulo =
    api.herramienta.tipo === "punteo" ? "Nuevo punteo" : "Nuevo rasgueo";

  useEffect(() => {
    setMounted(true);
  }, []);

  useHardwareBack(abierto, api.volver);
  useBodyScrollLock(abierto);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        api.volver();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, api]);

  if (!mounted || !abierto) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={api.volver}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative z-10 flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-xl"
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border bg-bg-darker px-4 py-3">
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
            {titulo}
          </h2>
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={api.volver}
            className="flex size-9 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </TapButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {api.herramienta.tipo === "punteo" ? (
            <FormularioPunteo api={api} tipoCompas={tipoCompas} />
          ) : (
            <FormularioRasgueo api={api} tipoCompas={tipoCompas} />
          )}
        </div>
        <div className="shrink-0 border-t border-border bg-bg-darker px-4 py-3">
          <TapButton
            type="button"
            onClick={api.volver}
            className="w-full rounded-[10px] bg-accent py-2.5 text-sm font-bold text-white"
          >
            Listo
          </TapButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CuerdasEditorPanel({
  api,
  tipoCompas = "4-4",
}: {
  api: CuerdasEditorApi;
  tipoCompas?: TipoCompas;
}) {
  const enRasgueo = api.seccion === "rasgueo";
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<BorradoPendiente | null>(null);

  function cambiarSeccion(seccion: "rasgueo" | "punteo") {
    setMenuId(null);
    api.irASeccion(seccion);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full bg-bg-dark p-1" role="tablist">
        <TapButton
          type="button"
          role="tab"
          aria-selected={enRasgueo}
          onClick={() => cambiarSeccion("rasgueo")}
          className={tabClass(enRasgueo)}
        >
          Rasgueo
        </TapButton>
        <TapButton
          type="button"
          role="tab"
          aria-selected={!enRasgueo}
          onClick={() => cambiarSeccion("punteo")}
          className={tabClass(!enRasgueo)}
        >
          Punteo
        </TapButton>
      </div>

      {enRasgueo ? (
        <PanelRasgueo
          api={api}
          menuId={menuId}
          onMenu={setMenuId}
          onPedirEliminar={setPendiente}
        />
      ) : (
        <PanelPunteo
          api={api}
          menuId={menuId}
          onMenu={setMenuId}
          onPedirEliminar={setPendiente}
        />
      )}

      <CuerdasEdicionModal api={api} tipoCompas={tipoCompas} />

      <ConfirmDialog
        open={pendiente !== null}
        message={
          pendiente
            ? `¿Eliminar “${pendiente.nombre}”?\nTambién se quita de todos los lugares de la canción.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        deleteConfirm
        zIndex={120}
        onCancel={() => setPendiente(null)}
        onConfirm={() => {
          if (!pendiente) {
            return;
          }

          if (pendiente.tipo === "rasgueo") {
            api.eliminarRasgueo(pendiente.id);
          } else {
            api.eliminarPunteo(pendiente.id);
          }

          setPendiente(null);
          setMenuId(null);
        }}
      />
    </div>
  );
}

function PanelRasgueo({
  api,
  menuId,
  onMenu,
  onPedirEliminar,
}: {
  api: CuerdasEditorApi;
  menuId: string | null;
  onMenu: (id: string | null) => void;
  onPedirEliminar: (pendiente: BorradoPendiente) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          Crear
        </p>
        <TapButton
          type="button"
          onClick={api.empezarNuevo}
          className="w-full rounded-[10px] bg-accent py-2.5 text-sm font-bold text-white"
        >
          Nuevo rasgueo
        </TapButton>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          Colocar en la canción
        </p>
        <p className="text-xs leading-relaxed text-text-muted">
          Elegí uno y tocalo en la palabra donde empieza.
        </p>
        {api.patrones.length === 0 ? (
          <p className="text-xs text-text-muted">Todavía no hay rasgueos.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {api.patrones.map((patron) => {
              const activo =
                api.herramienta.tipo === "rasgueo" &&
                api.herramienta.patronId === patron.id;

              return (
                <FilaCreada
                  key={patron.id}
                  nombre={patron.nombre}
                  activo={activo}
                  color={RASGUEO_COLOR_CSS[patron.color]}
                  menuAbierto={menuId === patron.id}
                  onElegir={() => {
                    onMenu(null);
                    api.elegirPatron(patron);
                  }}
                  onMenu={() => onMenu(menuId === patron.id ? null : patron.id)}
                  onEditar={() => {
                    onMenu(null);
                    api.editarPatron(patron);
                  }}
                  onEliminar={() =>
                    onPedirEliminar({
                      tipo: "rasgueo",
                      id: patron.id,
                      nombre: patron.nombre,
                    })
                  }
                />
              );
            })}
          </div>
        )}
        <TapButton
          type="button"
          onClick={() => {
            onMenu(null);
            api.empezarCorte();
          }}
          className={`w-full rounded-[10px] border py-2 text-sm font-bold ${
            api.herramienta.tipo === "corte"
              ? "border-[var(--accent-entrenador-canciones)] text-text-primary"
              : "border-border text-text-secondary"
          }`}
        >
          Sin rasgueo
        </TapButton>
        {api.herramienta.tipo === "corte" ? (
          <p className="text-xs leading-relaxed text-text-muted">
            Tocá la palabra donde el rasgueo deja de sonar.
          </p>
        ) : null}
        {api.marcaId ? (
          <TapButton
            type="button"
            onClick={api.quitarMarca}
            className="w-full rounded-[10px] border border-border py-2 text-xs font-semibold text-text-secondary"
          >
            Quitar esta marca
          </TapButton>
        ) : null}
      </section>
    </div>
  );
}

function PanelPunteo({
  api,
  menuId,
  onMenu,
  onPedirEliminar,
}: {
  api: CuerdasEditorApi;
  menuId: string | null;
  onMenu: (id: string | null) => void;
  onPedirEliminar: (pendiente: BorradoPendiente) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          Crear
        </p>
        <TapButton
          type="button"
          onClick={api.empezarNuevoPunteo}
          className="w-full rounded-[10px] bg-accent py-2.5 text-sm font-bold text-white"
        >
          Nuevo punteo
        </TapButton>
      </section>

      <section className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          Colocar en la canción
        </p>
        <p className="text-xs leading-relaxed text-text-muted">
          Elegí uno y tocalo en la palabra donde entra.
        </p>
        {api.patronesDePunteo.length === 0 ? (
          <p className="text-xs text-text-muted">Todavía no hay punteos.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {api.patronesDePunteo.map((patron) => {
              const activo =
                api.herramienta.tipo === "punteo" &&
                api.herramienta.patronId === patron.id;

              return (
                <FilaCreada
                  key={patron.id}
                  nombre={patron.nombre}
                  activo={activo}
                  menuAbierto={menuId === patron.id}
                  onElegir={() => {
                    onMenu(null);
                    api.elegirPatronPunteo(patron);
                  }}
                  onMenu={() => onMenu(menuId === patron.id ? null : patron.id)}
                  onEditar={() => {
                    onMenu(null);
                    api.editarPatronPunteo(patron);
                  }}
                  onEliminar={() =>
                    onPedirEliminar({
                      tipo: "punteo",
                      id: patron.id,
                      nombre: patron.nombre,
                    })
                  }
                />
              );
            })}
          </div>
        )}
        {api.marcaId && api.herramienta.tipo === "punteo" ? (
          <TapButton
            type="button"
            onClick={api.quitarMarca}
            className="w-full rounded-[10px] border border-border py-2 text-xs font-semibold text-text-secondary"
          >
            Quitar esta marca
          </TapButton>
        ) : null}
      </section>
    </div>
  );
}

export type CuerdasConsultaFoco =
  | { tipo: "lista" }
  | { tipo: "rasgueo"; patronId: string }
  | { tipo: "corte" }
  | { tipo: "punteo"; id: string };

export function CuerdasConsulta({
  anotaciones,
  foco,
  onFoco,
  onClose,
}: {
  anotaciones: Anotacion[];
  foco: CuerdasConsultaFoco;
  onFoco: (foco: CuerdasConsultaFoco) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const patrones = patronesRasgueo(anotaciones);
  const punteo =
    foco.tipo === "punteo"
      ? anotaciones.find(
          (anotacion) =>
            anotacion.id === foco.id && anotacion.tipo === "punteo",
        )
      : null;
  const patron =
    foco.tipo === "rasgueo"
      ? patrones.find((item) => item.id === foco.patronId)
      : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useHardwareBack(true, onClose);
  useBodyScrollLock(true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mounted) {
    return null;
  }

  const titulo =
    foco.tipo === "punteo"
      ? "Punteo"
      : foco.tipo === "corte"
        ? "Sin rasgueo"
        : patron
          ? patron.nombre
          : "Rasgueos";

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative z-10 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-xl"
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
          <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
            {titulo}
          </h2>
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </TapButton>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {foco.tipo === "lista" ? (
            patrones.length === 0 ? (
              <p className="text-sm text-text-muted">
                Esta canción todavía no tiene rasgueos.
              </p>
            ) : (
              patrones.map((item) => (
                <TapButton
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onFoco({ tipo: "rasgueo", patronId: item.id })
                  }
                  className="block w-full rounded-[12px] border border-border bg-bg-dark px-3 py-2 text-left"
                >
                  <span className="mb-2 flex items-center gap-2 text-sm font-bold text-text-primary">
                    <span
                      className="size-2.5 rounded-full"
                      style={{
                        backgroundColor: RASGUEO_COLOR_CSS[item.color],
                      }}
                      aria-hidden="true"
                    />
                    {item.nombre}
                  </span>
                  <RasgueoDibujo trazos={item.trazos} compact />
                </TapButton>
              ))
            )
          ) : null}

          {patron ? (
            <div className="space-y-3">
              <RasgueoDibujo trazos={patron.trazos} />
              {patrones.length > 1 ? (
                <TapButton
                  type="button"
                  onClick={() => onFoco({ tipo: "lista" })}
                  className="w-full rounded-[10px] border border-border py-2 text-sm font-semibold text-text-secondary"
                >
                  Ver todos
                </TapButton>
              ) : null}
            </div>
          ) : null}

          {foco.tipo === "corte" || (foco.tipo === "rasgueo" && !patron) ? (
            <p className="text-sm text-text-muted">
              Esa marca corta el rasgueo. Desde ahí no suena ninguno.
            </p>
          ) : null}

          {punteo ? <PunteoDibujo pasos={pasosDePunteo(punteo)} /> : null}

          {foco.tipo === "punteo" && !punteo ? (
            <p className="text-sm text-text-muted">No se encontró el punteo.</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
