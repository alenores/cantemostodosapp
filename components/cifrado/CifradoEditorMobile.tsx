"use client";

import CifradoEditorIngresoWebSearch, {
  type CifradoEditorWebImportData,
} from "@/components/cifrado/CifradoEditorIngresoWebSearch";
import {
  CifradoIngresoTonalidadInferModal,
  type PasteIngresoConfirmResult,
} from "@/components/cifrado/CifradoIngresoTonalidadInferModal";
import { CifradoMobileChordPicker } from "@/components/cifrado/CifradoMobileChordPicker";
import {
  CifradoMobileEditableLines,
  type MobileModoInsercion,
} from "@/components/cifrado/CifradoMobileEditableLines";
import { CifradoTonalidadFields } from "@/components/cifrado/CifradoTonalidadFields";
import { splitLyricsLines } from "@/components/cifrado/CifradoLyricsView";
import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_PANEL_BOX_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
  CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS,
  CIFRADO_EDITOR_SHEET_BG_CLASS,
  CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS,
  cifradoEditorToolbarSegmentedButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton, TapLink } from "@/components/ui/TapFeedback";
import { buildIntensidadForGolpes } from "@/lib/cifrado-barra-cycles";
import {
  createEmptyCifrado,
  createDefaultCompasConfig,
  findAcordeAt,
  getCompasCycleGolpes,
  isCharOffsetInsideCompasCycle,
  moveAcordeSwap,
  moveBarraCompas,
  placeCompasBarrasOnLine,
  removeAcordeAt,
  removeBarraCompasAt,
  renumberLineBarrasCompas,
  upsertAcorde,
  type CifradoData,
  type CompasConfig,
  type Modificador,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  cycleIntensidadSlot,
  getBarraIntensidad,
  getIntensidadPlantilla,
  resizeCompasConfigCycleGolpes,
  updateBarraIntensidad,
} from "@/lib/cifrado-intensidad";
import { DEFAULT_MODO_TONAL, type ModoTonal } from "@/lib/cifrado-escala";
import {
  analyzePasteIngreso,
  getPrimerAcordeOrdenado,
  parseLetraTradicional,
  type PasteIngresoAnalysis,
} from "@/lib/cifrado-import";
import {
  inferTonalidadFromAcordes,
  type TonalidadInferResult,
} from "@/lib/cifrado-tonalidad-infer";
import { ArrowLeft, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type IngresoTab = "letra" | "web" | "pegar";
type MobilePhase = "ingreso" | "cifrado";

type PickerTarget = {
  lineIndex: number;
  charOffset: number;
};

const labelClassName = "mb-1.5 block text-sm font-medium text-text-secondary";

const textareaClassName =
  "min-h-[220px] w-full flex-1 resize-none rounded-[10px] border border-border bg-letra-bg px-4 py-3 font-mono text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-compositor-config-border";

/**
 * Editor de canciones solo para celular.
 * Separado del de PC.
 */
export default function CifradoEditorMobile() {
  const searchParams = useSearchParams();
  const desdeCancionero = searchParams.get("desde") === "cancionero";
  const [phase, setPhase] = useState<MobilePhase>("ingreso");
  const [ingresoTab, setIngresoTab] = useState<IngresoTab>("letra");
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [tonalidadIndex, setTonalidadIndex] = useState<NotaIndex | null>(null);
  const [modoTonal, setModoTonal] = useState<ModoTonal | null>(null);
  const [draftLyrics, setDraftLyrics] = useState("");
  const [draftPaste, setDraftPaste] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [cifrado, setCifrado] = useState<CifradoData>(createEmptyCifrado());
  const [compasConfig, setCompasConfig] = useState<CompasConfig>(
    createDefaultCompasConfig,
  );
  const [error, setError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [dragTarget, setDragTarget] = useState<PickerTarget | null>(null);
  const [dragOrigin, setDragOrigin] = useState<PickerTarget | null>(null);
  const [selectedBarra, setSelectedBarra] = useState<PickerTarget | null>(null);
  const [barDragTarget, setBarDragTarget] = useState<PickerTarget | null>(null);
  const [barDragOrigin, setBarDragOrigin] = useState<PickerTarget | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [modoInsercion, setModoInsercion] =
    useState<MobileModoInsercion>("acordes");
  const [pasteProposeOpen, setPasteProposeOpen] = useState(false);
  const [pasteAnalysis, setPasteAnalysis] = useState<PasteIngresoAnalysis | null>(
    null,
  );
  const [tonalidadInferResult, setTonalidadInferResult] =
    useState<TonalidadInferResult | null>(null);

  const lastPasteProposeSignatureRef = useRef<string | null>(null);
  const pasteProposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextPositionSelectRef = useRef(false);
  const dragTargetRef = useRef<PickerTarget | null>(null);
  const dragOriginRef = useRef<PickerTarget | null>(null);
  const barDragTargetRef = useRef<PickerTarget | null>(null);
  const barDragOriginRef = useRef<PickerTarget | null>(null);

  const tonalidadLista = tonalidadIndex !== null && modoTonal !== null;
  const pickerExisting = pickerTarget
    ? findAcordeAt(
        cifrado.acordes,
        pickerTarget.lineIndex,
        pickerTarget.charOffset,
      )
    : undefined;
  const pickerSelectedKey = pickerTarget
    ? `${pickerTarget.lineIndex}:${pickerTarget.charOffset}`
    : dragTarget
      ? `${dragTarget.lineIndex}:${dragTarget.charOffset}`
      : null;

  const selectedBarraData = useMemo(() => {
    if (!selectedBarra) {
      return undefined;
    }

    return compasConfig.barras.find(
      (barra) =>
        barra.lineIndex === selectedBarra.lineIndex &&
        barra.charOffset === selectedBarra.charOffset,
    );
  }, [compasConfig.barras, selectedBarra]);

  const compasIntensidadPattern = selectedBarraData
    ? getBarraIntensidad(selectedBarraData, compasConfig)
    : getIntensidadPlantilla(compasConfig);

  useEffect(() => {
    return () => {
      if (pasteProposeTimerRef.current) {
        clearTimeout(pasteProposeTimerRef.current);
      }
    };
  }, []);

  function clearError() {
    if (error) {
      setError(null);
    }
  }

  function clearPasteProposeTimer() {
    if (pasteProposeTimerRef.current) {
      clearTimeout(pasteProposeTimerRef.current);
      pasteProposeTimerRef.current = null;
    }
  }

  function assertTonalidad(): boolean {
    if (!tonalidadLista) {
      setError("Elegí el tono y el modo antes de continuar.");
      return false;
    }

    return true;
  }

  function enterCifrado(letra: string, nextCifrado: CifradoData) {
    setLyricsText(letra);
    setCifrado(nextCifrado);
    setCompasConfig(createDefaultCompasConfig());
    setPickerTarget(null);
    dragTargetRef.current = null;
    dragOriginRef.current = null;
    setDragTarget(null);
    setDragOrigin(null);
    barDragTargetRef.current = null;
    barDragOriginRef.current = null;
    setBarDragTarget(null);
    setBarDragOrigin(null);
    setSelectedBarra(null);
    setActiveLineIndex(null);
    setModoInsercion("acordes");
    setError(null);
    setPhase("cifrado");
  }

  function closeChordPicker() {
    ignoreNextPositionSelectRef.current = true;
    setPickerTarget(null);
    window.setTimeout(() => {
      ignoreNextPositionSelectRef.current = false;
    }, 350);
  }

  function handleStartDragAcorde() {
    if (!pickerTarget || !pickerExisting) {
      return;
    }

    dragOriginRef.current = pickerTarget;
    dragTargetRef.current = pickerTarget;
    setDragOrigin(pickerTarget);
    setDragTarget(pickerTarget);
    setPickerTarget(null);
  }

  function handleDragMove(toCharOffset: number) {
    const currentTarget = dragTargetRef.current;

    if (!currentTarget) {
      return;
    }

    if (toCharOffset === currentTarget.charOffset) {
      return;
    }

    const nextTarget = {
      lineIndex: currentTarget.lineIndex,
      charOffset: toCharOffset,
    };

    // Solo vista previa: no tocar el cifrado hasta "Listo",
    // así no se borran los otros acordes al pasar por encima.
    dragTargetRef.current = nextTarget;
    setDragTarget(nextTarget);
  }

  function handleEndDragAcorde() {
    const origin = dragOriginRef.current;
    const target = dragTargetRef.current;

    if (
      origin &&
      target &&
      origin.lineIndex === target.lineIndex &&
      origin.charOffset !== target.charOffset
    ) {
      setCifrado((current) =>
        moveAcordeSwap(
          current,
          origin.lineIndex,
          origin.charOffset,
          target.charOffset,
        ),
      );
    }

    dragOriginRef.current = null;
    dragTargetRef.current = null;
    setDragOrigin(null);
    setDragTarget(null);
  }

  function handleActivateLine(lineIndex: number) {
    if (dragTarget || barDragTarget) {
      return;
    }

    setActiveLineIndex(lineIndex);
    setPickerTarget(null);
    setSelectedBarra(null);
  }

  function handleSelectPosition(lineIndex: number, charOffset: number) {
    if (ignoreNextPositionSelectRef.current) {
      return;
    }

    setPickerTarget({ lineIndex, charOffset });
  }

  function handleLineTextChange(lineIndex: number, newText: string) {
    setLyricsText((current) => {
      const lineArray = splitLyricsLines(current);

      if (lineIndex < 0 || lineIndex >= lineArray.length) {
        return current;
      }

      lineArray[lineIndex] = newText;
      return lineArray.join("\n");
    });
  }

  function handleModoInsercionChange(modo: MobileModoInsercion) {
    setModoInsercion(modo);
    setPickerTarget(null);
    setSelectedBarra(null);
  }

  function handleCompasTap(lineIndex: number, charOffset: number) {
    if (barDragTarget) {
      return;
    }

    const lineBarras = compasConfig.barras.filter(
      (barra) => barra.lineIndex === lineIndex,
    );
    const existing = lineBarras.find(
      (barra) => barra.charOffset === charOffset,
    );

    if (existing) {
      setSelectedBarra({
        lineIndex,
        charOffset: existing.charOffset,
      });
      return;
    }

    if (isCharOffsetInsideCompasCycle(lineBarras, charOffset)) {
      setError("No podés agregar un ciclo dentro de otro.");
      return;
    }

    clearError();

    const template = {
      tipoCompas: compasConfig.tipoCompas,
      intensidad: buildIntensidadForGolpes(
        getCompasCycleGolpes(compasConfig),
        getIntensidadPlantilla(compasConfig),
      ),
      cycleId: null as string | null,
    };

    setCompasConfig((current) =>
      placeCompasBarrasOnLine(current, lineIndex, [charOffset], template),
    );
    setSelectedBarra({ lineIndex, charOffset });
  }

  function handleCycleGolpesChange(golpes: number) {
    setCompasConfig((current) =>
      resizeCompasConfigCycleGolpes(current, golpes),
    );
  }

  function handleCycleIntensidadSlot(slotIndex: number) {
    setCompasConfig((current) => {
      if (selectedBarra) {
        const barra = current.barras.find(
          (item) =>
            item.lineIndex === selectedBarra.lineIndex &&
            item.charOffset === selectedBarra.charOffset,
        );

        if (!barra) {
          return current;
        }

        const currentPattern = getBarraIntensidad(barra, current);

        return updateBarraIntensidad(
          current,
          selectedBarra.lineIndex,
          selectedBarra.charOffset,
          cycleIntensidadSlot(
            currentPattern,
            slotIndex,
            currentPattern.length,
          ),
        );
      }

      return {
        ...current,
        intensidadPlantilla: cycleIntensidadSlot(
          getIntensidadPlantilla(current),
          slotIndex,
          getCompasCycleGolpes(current),
        ),
      };
    });
  }

  function handleStartBarDrag() {
    if (!selectedBarra) {
      return;
    }

    barDragOriginRef.current = selectedBarra;
    barDragTargetRef.current = selectedBarra;
    setBarDragOrigin(selectedBarra);
    setBarDragTarget(selectedBarra);
  }

  function handleBarDragMove(toCharOffset: number) {
    const currentTarget = barDragTargetRef.current;
    const origin = barDragOriginRef.current;

    if (!currentTarget || !origin) {
      return;
    }

    if (toCharOffset === currentTarget.charOffset) {
      return;
    }

    const lineBarras = compasConfig.barras
      .filter((barra) => barra.lineIndex === origin.lineIndex)
      .sort((a, b) => a.charOffset - b.charOffset);
    const fromIndex = lineBarras.findIndex(
      (barra) => barra.charOffset === origin.charOffset,
    );
    const prev = fromIndex > 0 ? lineBarras[fromIndex - 1] : undefined;
    const next = fromIndex >= 0 ? lineBarras[fromIndex + 1] : undefined;
    const minAllowed = prev ? prev.charOffset + 1 : 0;
    const maxAllowed = next ? next.charOffset - 1 : Number.POSITIVE_INFINITY;
    const clampedTo = Math.min(
      Math.max(toCharOffset, minAllowed),
      maxAllowed,
    );

    if (clampedTo === currentTarget.charOffset) {
      return;
    }

    const nextTarget = {
      lineIndex: currentTarget.lineIndex,
      charOffset: clampedTo,
    };
    barDragTargetRef.current = nextTarget;
    setBarDragTarget(nextTarget);
  }

  function handleEndBarDrag() {
    const origin = barDragOriginRef.current;
    const target = barDragTargetRef.current;

    if (
      origin &&
      target &&
      origin.lineIndex === target.lineIndex &&
      origin.charOffset !== target.charOffset
    ) {
      setCompasConfig((current) =>
        renumberLineBarrasCompas(
          moveBarraCompas(
            current,
            origin.lineIndex,
            origin.charOffset,
            target.charOffset,
          ),
          origin.lineIndex,
        ),
      );
      setSelectedBarra({
        lineIndex: target.lineIndex,
        charOffset: target.charOffset,
      });
    }

    barDragOriginRef.current = null;
    barDragTargetRef.current = null;
    setBarDragOrigin(null);
    setBarDragTarget(null);
  }

  function handleRemoveBarra() {
    if (!selectedBarra) {
      return;
    }

    const lineIndex = selectedBarra.lineIndex;

    setCompasConfig((current) =>
      renumberLineBarrasCompas(
        removeBarraCompasAt(
          current,
          selectedBarra.lineIndex,
          selectedBarra.charOffset,
        ),
        lineIndex,
      ),
    );
    setSelectedBarra(null);
  }

  function handleApplyAcorde(
    noteIndex: NotaIndex,
    modifier: Modificador,
    bassNoteIndex?: NotaIndex,
  ) {
    if (!pickerTarget) {
      return;
    }

    setCifrado((current) =>
      upsertAcorde(current, {
        lineIndex: pickerTarget.lineIndex,
        charOffset: pickerTarget.charOffset,
        noteIndex,
        modifier,
        ...(bassNoteIndex !== undefined ? { bassNoteIndex } : {}),
      }),
    );
    closeChordPicker();
  }

  function handleRemoveAcorde() {
    if (!pickerTarget) {
      return;
    }

    setCifrado((current) =>
      removeAcordeAt(
        current,
        pickerTarget.lineIndex,
        pickerTarget.charOffset,
      ),
    );
    closeChordPicker();
  }

  function runPasteIngresoAnalysis(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      setPasteProposeOpen(false);
      setPasteAnalysis(null);
      setTonalidadInferResult(null);
      return;
    }

    if (trimmed === lastPasteProposeSignatureRef.current) {
      return;
    }

    lastPasteProposeSignatureRef.current = trimmed;

    const analysis = analyzePasteIngreso(trimmed);
    const textForChords =
      analysis.textKeptIfEliminate.trim() || trimmed;
    const imported = parseLetraTradicional(textForChords);
    const primerAcorde = getPrimerAcordeOrdenado(imported.cifrado.acordes);
    const inference = analysis.tonalidadFromLine
      ? null
      : inferTonalidadFromAcordes(imported.cifrado.acordes, primerAcorde);

    const hasChordProposal = Boolean(inference && inference.candidates.length > 0);
    const shouldOpen = analysis.hasMetadataProposal || hasChordProposal;

    setPasteAnalysis(analysis);
    setTonalidadInferResult(inference);

    if (shouldOpen) {
      setPasteProposeOpen(true);
    } else {
      setPasteProposeOpen(false);
    }
  }

  function schedulePasteIngresoAnalysis(value: string) {
    clearPasteProposeTimer();
    pasteProposeTimerRef.current = setTimeout(() => {
      pasteProposeTimerRef.current = null;
      runPasteIngresoAnalysis(value);
    }, 450);
  }

  function handleDraftPasteChange(value: string) {
    setDraftPaste(value);
    clearError();
    schedulePasteIngresoAnalysis(value);
  }

  function handleConfirmPasteIngreso(result: PasteIngresoConfirmResult) {
    if (result.tonalidad) {
      setTonalidadIndex(result.tonalidad.tonalidadIndex);
      setModoTonal(result.tonalidad.modoTonal);
    }

    if (result.nombre) {
      setNombre(result.nombre);
    }

    if (result.artista) {
      setArtista(result.artista);
    }

    if (result.eliminate && pasteAnalysis?.textKeptIfEliminate !== undefined) {
      const kept = pasteAnalysis.textKeptIfEliminate;
      setDraftPaste(kept);
      lastPasteProposeSignatureRef.current = kept.trim() || null;
    }

    setPasteProposeOpen(false);
  }

  function handleApplyLyrics() {
    const trimmed = draftLyrics.trim();

    if (!trimmed) {
      setError("Pegá o escribí la letra para continuar.");
      return;
    }

    if (!assertTonalidad()) {
      return;
    }

    enterCifrado(trimmed, createEmptyCifrado());
  }

  function handleApplyPaste() {
    const trimmed = draftPaste.trim();

    if (!trimmed) {
      setError("Pegá la letra con acordes para continuar.");
      return;
    }

    if (!assertTonalidad()) {
      return;
    }

    const imported = parseLetraTradicional(trimmed);
    setDraftLyrics(imported.letra);
    enterCifrado(imported.letra, imported.cifrado);
  }

  function handleWebImport(data: CifradoEditorWebImportData) {
    if (!assertTonalidad()) {
      return;
    }

    if (data.nombre?.trim()) {
      setNombre(data.nombre.trim());
    }

    if (data.artista?.trim()) {
      setArtista(data.artista.trim());
    }

    if (data.letra?.trim()) {
      setDraftLyrics(data.letra);
    }

    enterCifrado(data.letra, data.cifrado);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
        {desdeCancionero ? (
          <TapLink
            href="/canciones/cancionero"
            ariaLabel="Volver al cancionero"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
        ) : null}
        <h1 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
          Editor
        </h1>
        {!desdeCancionero ? (
          <TapLink
            href="/canciones"
            ariaLabel="Cerrar"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
          >
            <X className="size-5 text-text-primary" aria-hidden="true" />
          </TapLink>
        ) : null}
      </header>

      {phase === "ingreso" ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 pb-28">
          {/* Letra / búsqueda arriba: las automatizaciones parten de acá */}
          <div className="flex min-h-[220px] flex-1 flex-col">
            {ingresoTab === "letra" ? (
              <>
                <label className={labelClassName} htmlFor="cifrado-mobile-letra">
                  Letra (sin acordes)
                </label>
                <textarea
                  id="cifrado-mobile-letra"
                  value={draftLyrics}
                  onChange={(event) => {
                    setDraftLyrics(event.target.value);
                    clearError();
                  }}
                  className={textareaClassName}
                  placeholder="Pegá aquí la letra de la canción…"
                />
              </>
            ) : null}

            {ingresoTab === "web" ? (
              <CifradoEditorIngresoWebSearch
                onImport={handleWebImport}
                onError={setError}
                importDisabled={!tonalidadLista}
              />
            ) : null}

            {ingresoTab === "pegar" ? (
              <>
                <label className={labelClassName} htmlFor="cifrado-mobile-pegar">
                  Letra con acordes
                </label>
                <textarea
                  id="cifrado-mobile-pegar"
                  value={draftPaste}
                  onChange={(event) => {
                    handleDraftPasteChange(event.target.value);
                  }}
                  className={textareaClassName}
                  placeholder="Pegá la letra con los acordes encima de cada renglón…"
                />
              </>
            ) : null}
          </div>

          {/* Pestañas, cajilleros y botón abajo de la letra */}
          <div
            className={`mt-4 shrink-0 ${CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS}`}
            role="tablist"
            aria-label="Forma de ingreso"
          >
            <button
              type="button"
              role="tab"
              aria-selected={ingresoTab === "letra"}
              onClick={() => {
                setIngresoTab("letra");
                clearError();
              }}
              className={cifradoEditorToolbarSegmentedButtonClass(
                ingresoTab === "letra",
              )}
            >
              Escribir letra
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ingresoTab === "web"}
              onClick={() => {
                setIngresoTab("web");
                clearError();
              }}
              className={cifradoEditorToolbarSegmentedButtonClass(
                ingresoTab === "web",
              )}
            >
              Buscar en la web
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ingresoTab === "pegar"}
              onClick={() => {
                setIngresoTab("pegar");
                clearError();
              }}
              className={cifradoEditorToolbarSegmentedButtonClass(
                ingresoTab === "pegar",
              )}
            >
              Pegar letra+acordes
            </button>
          </div>

          <div className={`mt-3 shrink-0 ${CIFRADO_CONTROLS_PANEL_BOX_CLASS}`}>
            <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
              Datos de la canción
            </p>
            <label className={labelClassName} htmlFor="cifrado-mobile-nombre">
              Nombre
            </label>
            <input
              id="cifrado-mobile-nombre"
              value={nombre}
              onChange={(event) => {
                setNombre(event.target.value);
                clearError();
              }}
              className={CIFRADO_CONTROLS_INPUT_CLASS}
              placeholder="Nombre de la canción"
            />
            <label
              className={`${labelClassName} mt-3`}
              htmlFor="cifrado-mobile-artista"
            >
              Artista
            </label>
            <input
              id="cifrado-mobile-artista"
              value={artista}
              onChange={(event) => setArtista(event.target.value)}
              className={CIFRADO_CONTROLS_INPUT_CLASS}
              placeholder="Artista"
            />
            <div className="mt-3">
              <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>Tonalidad</p>
              <CifradoTonalidadFields
                idPrefix="cifrado-mobile-ingreso"
                notacion="es"
                tonalidadIndex={tonalidadIndex}
                modoTonal={modoTonal}
                requireSelection
                onTonalidadChange={(next) => {
                  setTonalidadIndex(next);
                  clearError();
                }}
                onModoTonalChange={(next) => {
                  setModoTonal(next);
                  clearError();
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 shrink-0 text-sm font-medium text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {ingresoTab === "letra" ? (
            <TapButton
              type="button"
              onClick={handleApplyLyrics}
              disabled={!draftLyrics.trim() || !tonalidadLista}
              className={`mt-4 shrink-0 px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
            >
              Aplicar y empezar a cifrar
            </TapButton>
          ) : null}

          {ingresoTab === "pegar" ? (
            <TapButton
              type="button"
              onClick={handleApplyPaste}
              disabled={!draftPaste.trim() || !tonalidadLista}
              className={`mt-4 shrink-0 px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
            >
              Importar y editar
            </TapButton>
          ) : null}

          {ingresoTab === "web" ? (
            <p className="mt-3 shrink-0 text-center text-xs text-text-muted">
              En la web, el botón de importar aparece al elegir una canción.
            </p>
          ) : null}
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2">
            <p className="min-w-0 flex-1 truncate text-sm text-text-muted">
              {nombre.trim() || "Sin nombre"}
              {artista.trim() ? ` · ${artista.trim()}` : ""}
            </p>
          </div>

          <div
            className={`relative min-h-0 flex-1 overflow-y-auto ${CIFRADO_EDITOR_SHEET_BG_CLASS}`}
          >
            <div className="relative min-h-full px-4 py-4 pb-28">
              {dragTarget || barDragTarget ? (
                <div
                  className="pointer-events-none absolute inset-0 z-[5] bg-black/50"
                  aria-hidden="true"
                />
              ) : null}

              {!dragTarget && !barDragTarget ? (
                <p className="mb-3 text-xs text-text-muted">
                  Tocá un renglón para activarlo y editarlo.
                </p>
              ) : null}
              <CifradoMobileEditableLines
                letra={lyricsText}
                acordes={cifrado.acordes}
                notacion="es"
                activeLineIndex={activeLineIndex}
                modoInsercion={modoInsercion}
                selectedKey={pickerSelectedKey}
                positionSelectEnabled={
                  pickerTarget === null && !dragTarget && !barDragTarget
                }
                freezeChordLayout={pickerTarget !== null}
                dragTarget={dragTarget}
                dragOrigin={dragOrigin}
                compasConfig={compasConfig}
                selectedBarra={selectedBarra}
                barDragTarget={barDragTarget}
                barDragOrigin={barDragOrigin}
                onActivateLine={handleActivateLine}
                onModoInsercionChange={handleModoInsercionChange}
                onSelectPosition={handleSelectPosition}
                onLineTextChange={handleLineTextChange}
                onDragMove={handleDragMove}
                onEndDrag={handleEndDragAcorde}
                onCompasTap={handleCompasTap}
                onCycleGolpesChange={handleCycleGolpesChange}
                onCycleIntensidadSlot={handleCycleIntensidadSlot}
                onClearBarraSelection={() => setSelectedBarra(null)}
                onStartBarDrag={handleStartBarDrag}
                onRemoveBarra={handleRemoveBarra}
                onBarDragMove={handleBarDragMove}
                onEndBarDrag={handleEndBarDrag}
                compasCycleGolpes={getCompasCycleGolpes(compasConfig)}
                compasIntensidadPattern={compasIntensidadPattern}
                selectedCompasNumero={selectedBarraData?.compasNumero ?? null}
              />
            </div>
          </div>
        </main>
      )}

      <CifradoIngresoTonalidadInferModal
        open={pasteProposeOpen}
        analysis={pasteAnalysis}
        candidates={tonalidadInferResult?.candidates ?? []}
        multipleTonalidades={tonalidadInferResult?.multipleTonalidades ?? false}
        notacion="es"
        zIndex={70}
        onConfirm={handleConfirmPasteIngreso}
        onDismiss={() => setPasteProposeOpen(false)}
      />

      {tonalidadLista ? (
        <CifradoMobileChordPicker
          open={pickerTarget !== null && !dragTarget}
          existing={pickerExisting}
          tonalidadIndex={tonalidadIndex}
          modoTonal={modoTonal ?? DEFAULT_MODO_TONAL}
          notacion="es"
          onApply={handleApplyAcorde}
          onRemove={handleRemoveAcorde}
          onStartDrag={handleStartDragAcorde}
          onClose={closeChordPicker}
        />
      ) : null}
    </div>
  );
}
