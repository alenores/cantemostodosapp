"use client";

import CifradoNotacionToggle from "@/components/cifrado/CifradoNotacionToggle";
import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
  CIFRADO_NOTACION_LABEL_CLASS,
  CIFRADO_NOTACION_SEGMENTED_CLASS,
  cifradoNotacionButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import { APP_SIDEBAR_WIDTH_CSS } from "@/lib/app-layout";
import {
  ANOTACION_TIPO_LABEL,
  ANOTACION_TIPOS,
  type AnotacionTipo,
  type AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import type { NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";
import type { LetraZoomLevel } from "@/lib/letra-zoom";
import { LETRA_ZOOM_MAX_LEVEL, LETRA_ZOOM_MIN_LEVEL } from "@/lib/letra-zoom";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import { AudioLines, Eye, EyeOff, NotebookPen, Pause, Pencil, Play, SquarePlay, X } from "lucide-react";

const LECTURA_CARD_CLASS =
  "rounded-xl border border-border/30 bg-bg-card px-3 py-3";

const LECTURA_BUTTON_CLASS =
  "w-full rounded-[10px] border border-border bg-bg-darker py-2.5 text-sm font-semibold text-text-secondary";

const LECTURA_STEP_BUTTON_CLASS =
  "flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-darker text-text-primary disabled:opacity-50";

type CifradoLecturaSidePanelProps = {
  hasCompases?: boolean;
  compasesOcultos?: boolean;
  acordesOcultos?: boolean;
  anotacionesVisibility?: AnotacionVisibility;
  anotacionTiposPresentes?: AnotacionTipo[];
  onToggleAnotacionTipo?: (tipo: AnotacionTipo) => void;
  playing: boolean;
  canPlay: boolean;
  notacion: NotacionAcordes;
  tonalidadIndex: NotaIndex;
  modoTonal: ModoTonal;
  bpm: number;
  tapCount: number;
  onTogglePlayback: () => void;
  onToggleCompasesOcultos?: () => void;
  onToggleAcordesOcultos?: () => void;
  onNotacionChange: (next: NotacionAcordes) => void;
  onTonalidadChange: (next: NotaIndex) => void;
  onModoTonalChange: (next: ModoTonal) => void;
  onBpmChange: (next: number) => void;
  onTapTempo: () => void;
  onOpenNotaGeneral?: () => void;
  tieneNotaGeneral?: boolean;
  onEdit?: () => void;
  temaLectura?: "dia" | "sepia" | "escenario";
  onTemaLecturaChange?: (next: "dia" | "sepia" | "escenario") => void;
  encabezado?: {
    nombre: string;
    artista?: string | null;
  };
  onCerrar?: () => void;
  zoom?: {
    level: LetraZoomLevel;
    onDecrease: () => void;
    onIncrease: () => void;
  };
  onVideo?: () => void;
  videoAbierto?: boolean;
  onAfinador?: () => void;
  /** Sin cifrado no hay tono ni acordes: solo nombre, letra, video y afinador. */
  controlesCifrado?: boolean;
};

function etiquetaTamanoLetra(level: LetraZoomLevel): string {
  if (level < 0) {
    return "Chica";
  }

  if (level > 0) {
    return "Grande";
  }

  return "Normal";
}

export function getLecturaPremiumRailWidthCss(): string {
  return APP_SIDEBAR_WIDTH_CSS;
}

export default function CifradoLecturaSidePanel({
  hasCompases = false,
  compasesOcultos = false,
  acordesOcultos = false,
  anotacionesVisibility,
  anotacionTiposPresentes = [],
  onToggleAnotacionTipo,
  playing,
  canPlay,
  notacion,
  tonalidadIndex,
  modoTonal,
  bpm,
  tapCount,
  onTogglePlayback,
  onToggleCompasesOcultos,
  onToggleAcordesOcultos,
  onNotacionChange,
  onTonalidadChange,
  onModoTonalChange,
  onBpmChange,
  onTapTempo,
  onOpenNotaGeneral,
  tieneNotaGeneral = false,
  onEdit,
  temaLectura,
  onTemaLecturaChange,
  encabezado,
  onCerrar,
  zoom,
  onVideo,
  videoAbierto = false,
  onAfinador,
  controlesCifrado = true,
}: CifradoLecturaSidePanelProps) {
  const tiposParaToggle = ANOTACION_TIPOS.filter((tipo) =>
    anotacionTiposPresentes.includes(tipo),
  );
  const anotacionesToggles =
    anotacionesVisibility && onToggleAnotacionTipo && tiposParaToggle.length > 0 ? (
      <div className="space-y-2">
        {tiposParaToggle.map((tipo) => {
          const oculto = !anotacionesVisibility[tipo];

          return (
            <TapButton
              key={tipo}
              type="button"
              onClick={() => onToggleAnotacionTipo(tipo)}
              className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
            >
              {oculto ? (
                <Eye className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4 shrink-0" aria-hidden="true" />
              )}
              {oculto ? "Mostrar" : "Ocultar"} {ANOTACION_TIPO_LABEL[tipo].toLowerCase()}
            </TapButton>
          );
        })}
      </div>
    ) : null;

  const notaCard = onOpenNotaGeneral ? (
    <div className={LECTURA_CARD_CLASS}>
      <TapButton
        type="button"
        onClick={onOpenNotaGeneral}
        className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
      >
        <NotebookPen
          className="size-4 shrink-0 text-[var(--accent-entrenador-canciones)]"
          aria-hidden="true"
        />
        Nota de la canción
        {tieneNotaGeneral ? (
          <span
            className="size-1.5 rounded-full bg-[var(--accent-entrenador-canciones)]"
            aria-hidden="true"
          />
        ) : null}
      </TapButton>
    </div>
  ) : null;

  const editarButton = onEdit ? (
    <TapButton
      type="button"
      onClick={onEdit}
      className="mt-3 inline-flex w-auto self-start items-center gap-1 rounded-md bg-[var(--accent-vocal)] px-2 py-1 text-[11px] font-semibold leading-none text-[var(--text-on-light)]"
    >
      <Pencil className="size-3 shrink-0" aria-hidden="true" />
      Editar
    </TapButton>
  ) : null;

  const zoomCard = zoom ? (
    <div className={LECTURA_CARD_CLASS}>
      <p className={CIFRADO_NOTACION_LABEL_CLASS}>Tamaño de letra</p>
      <div className="flex items-center gap-2">
        <TapButton
          type="button"
          aria-label="Achicar letra"
          disabled={zoom.level <= LETRA_ZOOM_MIN_LEVEL}
          onClick={zoom.onDecrease}
          className={LECTURA_STEP_BUTTON_CLASS}
        >
          <span className="text-[11px] font-bold leading-none text-accent" aria-hidden="true">
            −A
          </span>
        </TapButton>
        <span className="min-w-0 flex-1 text-center text-sm font-semibold text-text-primary">
          {etiquetaTamanoLetra(zoom.level)}
        </span>
        <TapButton
          type="button"
          aria-label="Agrandar letra"
          disabled={zoom.level >= LETRA_ZOOM_MAX_LEVEL}
          onClick={zoom.onIncrease}
          className={LECTURA_STEP_BUTTON_CLASS}
        >
          <span className="text-[11px] font-bold leading-none text-accent" aria-hidden="true">
            +A
          </span>
        </TapButton>
      </div>
    </div>
  ) : null;

  const videoAfinadorCard =
    onVideo || onAfinador ? (
      <div className={`${LECTURA_CARD_CLASS} space-y-2`}>
        {onVideo ? (
          <TapButton
            type="button"
            onClick={onVideo}
            aria-label={videoAbierto ? "Cerrar video" : "Ver video"}
            className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
          >
            <SquarePlay className="size-4 shrink-0 text-accent" aria-hidden="true" />
            {videoAbierto ? "Cerrar video" : "Video"}
          </TapButton>
        ) : null}
        {onAfinador ? (
          <TapButton
            type="button"
            onClick={onAfinador}
            aria-label="Afinador"
            className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
          >
            <AudioLines className="size-4 shrink-0 text-accent" aria-hidden="true" />
            Afinador
          </TapButton>
        ) : null}
      </div>
    ) : null;

  const ocultarAcordesButton = (
    <TapButton
      type="button"
      onClick={onToggleAcordesOcultos}
      className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
    >
      {acordesOcultos ? (
        <Eye className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <EyeOff className="size-4 shrink-0" aria-hidden="true" />
      )}
      {acordesOcultos ? "Mostrar acordes" : "Ocultar acordes"}
    </TapButton>
  );

  const temaCard =
    temaLectura && onTemaLecturaChange ? (
      <div className={LECTURA_CARD_CLASS}>
        <p className={CIFRADO_NOTACION_LABEL_CLASS}>Tema de lectura</p>
        <div
          className={CIFRADO_NOTACION_SEGMENTED_CLASS}
          role="tablist"
          aria-label="Tema de lectura"
        >
          {(["dia", "sepia", "escenario"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={temaLectura === t}
              onClick={() => onTemaLecturaChange(t)}
              className={cifradoNotacionButtonClass(temaLectura === t)}
            >
              {t === "dia" ? "Día" : t === "sepia" ? "Sepia" : "Escenario"}
            </button>
          ))}
        </div>
      </div>
    ) : null;

  const tonoCard = controlesCifrado ? (
    <div className={LECTURA_CARD_CLASS}>
      <CifradoTonalidadFields
        idPrefix="cifrado-lectura"
        notacion={notacion === "numero" ? "es" : notacion}
        tonalidadIndex={tonalidadIndex}
        modoTonal={modoTonal}
        showModoTonal={false}
        showTonalidadStepButtons
        stepButtonClassName={LECTURA_STEP_BUTTON_CLASS}
        onTonalidadChange={onTonalidadChange}
        onModoTonalChange={onModoTonalChange}
      />
    </div>
  ) : null;

  const compasesCard = controlesCifrado && hasCompases ? (
          <div className={`${LECTURA_CARD_CLASS} space-y-3`}>
            {!compasesOcultos ? (
              <TapButton
                type="button"
                onClick={onTogglePlayback}
                disabled={!canPlay}
                aria-label={playing ? "Pausar compás" : "Reproducir compás"}
                className="flex size-12 shrink-0 items-center justify-center self-center rounded-full bg-accent text-white shadow-[0_2px_10px_rgba(0,0,0,0.28)] disabled:opacity-40"
              >
                {playing ? (
                  <Pause className="size-5" aria-hidden="true" />
                ) : (
                  <Play className="size-5 fill-current" aria-hidden="true" />
                )}
              </TapButton>
            ) : null}

            <TapButton
              type="button"
              onClick={onToggleCompasesOcultos}
              className={`${LECTURA_BUTTON_CLASS} flex items-center justify-center gap-2`}
            >
              {compasesOcultos ? (
                <Eye className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4 shrink-0" aria-hidden="true" />
              )}
              {compasesOcultos ? "Mostrar compases" : "Ocultar compases"}
            </TapButton>

            {!compasesOcultos ? (
              <div>
                <label
                  className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
                  htmlFor="cifrado-lectura-bpm"
                >
                  BPM
                </label>
                <div className="flex gap-2">
                  <input
                    id="cifrado-lectura-bpm"
                    type="number"
                    min={40}
                    max={240}
                    value={bpm}
                    onChange={(event) =>
                      onBpmChange(Number(event.target.value) || bpm)
                    }
                    className={`${CIFRADO_CONTROLS_INPUT_CLASS} min-w-0 flex-1 text-center`}
                  />
                  <TapButton
                    type="button"
                    onClick={onTapTempo}
                    className="min-w-[5.25rem] shrink-0 rounded-[10px] border border-border bg-bg-darker px-4 text-xs font-semibold text-text-secondary"
                  >
                    Tap{tapCount > 0 ? ` (${tapCount})` : ""}
                  </TapButton>
                </div>
              </div>
            ) : null}
          </div>
  ) : null;

  const acordesCard = controlesCifrado ? (
    <div className={`${LECTURA_CARD_CLASS} space-y-3`}>
      {ocultarAcordesButton}
      {anotacionesToggles}
      <CifradoNotacionToggle
        notacion={notacion}
        onChange={onNotacionChange}
        plain
      />
    </div>
  ) : null;

  const controles = encabezado ? (
    <>
      {notaCard}
      {tonoCard}
      {zoomCard}
      {videoAfinadorCard}
      {temaCard}
      {compasesCard}
      {acordesCard}
      {editarButton}
    </>
  ) : (
    <>
      {notaCard}
      {temaCard}
      {tonoCard}
      {zoomCard}
      {videoAfinadorCard}
      {compasesCard}
      {acordesCard}
      {editarButton}
    </>
  );

  return (
    <aside
      className="hidden min-h-0 shrink-0 flex-col border-r border-border bg-bg-cola-list lg:flex"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-label="Controles de lectura"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {encabezado || onCerrar ? (
          <div className="sticky top-0 z-10 border-b border-border/50 bg-bg-cola-list px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                {encabezado ? (
                  <h2 className="break-words text-[15px] font-bold leading-snug text-text-primary">
                    {encabezado.nombre}
                  </h2>
                ) : null}
                {encabezado?.artista ? (
                  <p className="mt-0.5 break-words text-[12px] leading-snug text-text-muted">
                    {encabezado.artista}
                  </p>
                ) : null}
              </div>
              {onCerrar ? (
                <TapButton
                  type="button"
                  aria-label="Contraer"
                  onClick={onCerrar}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-text-primary"
                >
                  <X className="size-4" aria-hidden="true" />
                </TapButton>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-2 px-3 py-3 pb-4">{controles}</div>
      </div>
    </aside>
  );
}

export function CifradoLecturaSidePanelEmpty() {
  return (
    <aside
      className="hidden min-h-0 shrink-0 border-r border-border bg-bg-cola-list lg:block"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-hidden="true"
    />
  );
}
