"use client";

import CifradoNotacionToggle from "@/components/cifrado/CifradoNotacionToggle";
import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_PANEL_BOX_CLASS,
  CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
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
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import { Eye, EyeOff, NotebookPen, Pause, Pencil, Play } from "lucide-react";

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
};

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
}: CifradoLecturaSidePanelProps) {
  const tiposParaToggle = ANOTACION_TIPOS.filter((tipo) =>
    anotacionTiposPresentes.includes(tipo),
  );
  const anotacionesToggles =
    anotacionesVisibility && onToggleAnotacionTipo && tiposParaToggle.length > 0 ? (
      <div className="mt-3 space-y-2">
        {tiposParaToggle.map((tipo) => {
          const oculto = !anotacionesVisibility[tipo];

          return (
            <TapButton
              key={tipo}
              type="button"
              onClick={() => onToggleAnotacionTipo(tipo)}
              className={`${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS} flex items-center justify-center gap-2`}
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

  const accionesLectura =
    onOpenNotaGeneral || onEdit ? (
      <div className="mt-3 space-y-2">
        {onOpenNotaGeneral ? (
          <TapButton
            type="button"
            onClick={onOpenNotaGeneral}
            className={`${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS} flex items-center justify-center gap-2`}
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
        ) : null}
        {onEdit ? (
          <TapButton
            type="button"
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--accent-entrenador-canciones)] py-2.5 text-sm font-semibold text-[var(--text-on-light)]"
          >
            <Pencil className="size-4 shrink-0" aria-hidden="true" />
            Editar
          </TapButton>
        ) : null}
      </div>
    ) : null;

  const ocultarAcordesButton = (
    <TapButton
      type="button"
      onClick={onToggleAcordesOcultos}
      className={`${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS} flex items-center justify-center gap-2`}
    >
      {acordesOcultos ? (
        <Eye className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <EyeOff className="size-4 shrink-0" aria-hidden="true" />
      )}
      {acordesOcultos ? "Mostrar acordes" : "Ocultar acordes"}
    </TapButton>
  );

  return (
    <aside
      className="hidden min-h-0 shrink-0 flex-col border-r border-border bg-bg-darker lg:flex"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-label="Controles de cifrado premium"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
        <div className="mb-4">
          <CifradoTonalidadFields
            idPrefix="cifrado-lectura"
            notacion={notacion === "numero" ? "es" : notacion}
            tonalidadIndex={tonalidadIndex}
            modoTonal={modoTonal}
            showModoTonal={false}
            onTonalidadChange={onTonalidadChange}
            onModoTonalChange={onModoTonalChange}
          />
        </div>

        {hasCompases ? (
          <div className={`${CIFRADO_CONTROLS_PANEL_BOX_CLASS} space-y-3`}>
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

            <TapButton
              type="button"
              onClick={onToggleCompasesOcultos}
              className={`${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS} flex items-center justify-center gap-2`}
            >
              {compasesOcultos ? (
                <Eye className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <EyeOff className="size-4 shrink-0" aria-hidden="true" />
              )}
              {compasesOcultos ? "Mostrar compases" : "Ocultar compases"}
            </TapButton>

            {ocultarAcordesButton}

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
                  className="min-w-[5.25rem] shrink-0 rounded-[10px] border border-border bg-bg-card px-4 text-xs font-semibold text-text-secondary"
                >
                  Tap{tapCount > 0 ? ` (${tapCount})` : ""}
                </TapButton>
              </div>
            </div>

            <CifradoNotacionToggle
              notacion={notacion}
              onChange={onNotacionChange}
              embedded
            />
          </div>
        ) : (
          <div className="space-y-3">
            {ocultarAcordesButton}
            <CifradoNotacionToggle
              notacion={notacion}
              onChange={onNotacionChange}
            />
          </div>
        )}

        {anotacionesToggles}
        {accionesLectura}
      </div>
    </aside>
  );
}

export function CifradoLecturaSidePanelEmpty() {
  return (
    <aside
      className="hidden min-h-0 shrink-0 border-r border-border bg-bg-darker lg:block"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-hidden="true"
    />
  );
}
