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
import {
  CifradoLyricsBlock,
  splitLyricsLines,
} from "@/components/cifrado/CifradoLyricsView";
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
import { ToolNumericStepper } from "@/components/ui/ToolNumericStepper";
import { buildIntensidadForGolpes } from "@/lib/cifrado-barra-cycles";
import {
  clampBpm,
  computeTapBpm,
  createEmptyCifrado,
  createDefaultCompasConfig,
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
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
import { getNotaLabel } from "@/lib/notacion-acordes";
import {
  cycleIntensidadSlot,
  getBarraIntensidad,
  getIntensidadPlantilla,
  normalizeCompasConfig,
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
import type {
  CifradoEditorPersistFn,
  CifradoEditorSession,
  CifradoSaveResult,
} from "@/lib/cifrado-editor-session";
import {
  AnotacionPickerHost,
  AnotacionTipoMenu,
  useAnotacionesEditor,
  type AnotacionesControl,
} from "@/components/cifrado/AnotacionPickers";
import { DEFAULT_ANOTACION_VISIBILITY } from "@/lib/anotaciones-practica";
import { ArrowLeft, Eye, SlidersHorizontal, X } from "lucide-react";
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
  "min-h-0 w-full flex-1 resize-none rounded-estandar border border-border bg-letra-bg px-4 py-3 font-mono text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-compositor-config-border";

type CifradoEditorMobileProps = {
  session?: CifradoEditorSession | null;
  isLoggedIn?: boolean;
  backHref?: string;
  backAriaLabel?: string;
  /** Cierra/vuelve con callback (p. ej. Entrenador con icono X). */
  onClose?: () => void;
  /** Icono del botón de salida cuando hay onClose. Por defecto flecha atrás. */
  exitIcon?: "back" | "close";
  onPersist?: CifradoEditorPersistFn;
  onSaved?: (result?: CifradoSaveResult) => void;
  anotaciones?: AnotacionesControl | null;
};

/**
 * Editor de canciones solo para celular.
 * Separado del de PC.
 */
export default function CifradoEditorMobile({
  session = null,
  isLoggedIn = false,
  backHref,
  backAriaLabel = "Volver",
  onClose,
  exitIcon = "back",
  onPersist,
  onSaved,
  anotaciones,
}: CifradoEditorMobileProps = {}) {
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
  const [saveLoading, setSaveLoading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [dragTarget, setDragTarget] = useState<PickerTarget | null>(null);
  const [dragOrigin, setDragOrigin] = useState<PickerTarget | null>(null);
  const [selectedBarra, setSelectedBarra] = useState<PickerTarget | null>(null);
  const [barDragTarget, setBarDragTarget] = useState<PickerTarget | null>(null);
  const [barDragOrigin, setBarDragOrigin] = useState<PickerTarget | null>(null);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [modoInsercion, setModoInsercion] =
    useState<MobileModoInsercion>("acordes");
  const anotacionesEnabled = Boolean(anotaciones);
  const anotEditor = useAnotacionesEditor(anotaciones ?? null);
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
  const editingCancionIdRef = useRef<number | undefined>(undefined);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    editingCancionIdRef.current = session.cancionId;
    setNombre(session.nombre);
    setArtista(session.artista);
    setLyricsText(session.letra);
    setDraftLyrics(session.letra);
    setCifrado(session.cifrado ?? createEmptyCifrado());
    setCompasConfig(
      normalizeCompasConfig({
        ...(session.compas_config ?? createDefaultCompasConfig()),
        bpm: session.bpm_default ?? session.compas_config?.bpm ?? DEFAULT_BPM,
      }),
    );
    setTonalidadIndex(session.tonalidad_default ?? DEFAULT_TONALIDAD);
    setModoTonal(session.modo_tonal_default ?? DEFAULT_MODO_TONAL);
    setPhase(session.skipIngreso ? "cifrado" : "ingreso");
    setError(null);
  }, [session]);

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

      if (tapResetTimerRef.current) {
        clearTimeout(tapResetTimerRef.current);
      }
    };
  }, []);

  const tonalidadLabel =
    tonalidadIndex !== null ? getNotaLabel(tonalidadIndex, "es") : "—";
  const modoLabel = modoTonal === "menor" ? "menor" : "mayor";

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

  function handleSetBpm(nextBpm: number) {
    setCompasConfig((current) => ({ ...current, bpm: clampBpm(nextBpm) }));
  }

  function handleTapTempo() {
    const now = performance.now();
    const recentTaps = tapTimestampsRef.current.filter(
      (timestamp) => now - timestamp < 3000,
    );

    recentTaps.push(now);
    tapTimestampsRef.current = recentTaps;
    setTapCount(recentTaps.length);

    if (tapResetTimerRef.current !== null) {
      clearTimeout(tapResetTimerRef.current);
    }

    tapResetTimerRef.current = setTimeout(() => {
      tapTimestampsRef.current = [];
      setTapCount(0);
      tapResetTimerRef.current = null;
    }, 3000);

    const nextBpm = computeTapBpm(recentTaps, now);

    if (nextBpm !== null) {
      setCompasConfig((current) => ({ ...current, bpm: nextBpm }));
    }
  }

  async function handleSave() {
    if (!onPersist) {
      return;
    }

    if (!isLoggedIn) {
      setError("Iniciá sesión para guardar.");
      return;
    }

    if (phase !== "cifrado") {
      setError("Aplicá la letra y empezá a cifrar antes de guardar.");
      return;
    }

    if (!nombre.trim()) {
      setError("Completá el nombre de la canción.");
      return;
    }

    if (!lyricsText.trim()) {
      setError("La letra no puede estar vacía.");
      return;
    }

    if (tonalidadIndex === null || modoTonal === null) {
      setError("Completá la tonalidad.");
      return;
    }

    setSaveLoading(true);
    setError(null);

    try {
      const clampedBpm = Math.max(
        40,
        Math.min(240, compasConfig.bpm || DEFAULT_BPM),
      );
      const editingId = editingCancionIdRef.current ?? session?.cancionId;
      const savedId = await onPersist(editingId, {
        nombre: nombre.trim(),
        artista: artista.trim() || null,
        letra: lyricsText,
        cifrado,
        compas_config: normalizeCompasConfig({
          ...compasConfig,
          bpm: clampedBpm,
          barrasVersion: 2 as const,
        }),
        tonalidad_default: tonalidadIndex,
        modo_tonal_default: modoTonal,
        bpm_default: clampedBpm,
      });

      editingCancionIdRef.current = savedId;
      onSaved?.({
        id: savedId,
        nombre: nombre.trim(),
        artista: artista.trim() || null,
        letra: lyricsText,
        tiene_cifrado_avanzado: true,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la canción",
      );
    } finally {
      setSaveLoading(false);
    }
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
    if (modo !== "canto") {
      anotEditor.resetCanto();
    }
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      {phase === "ingreso" ? (
        <header
          className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 pb-3"
          style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
        >
          {onClose ? (
            <TapButton
              type="button"
              aria-label={backAriaLabel}
              onClick={onClose}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              {exitIcon === "close" ? (
                <X className="size-5 text-text-primary" aria-hidden="true" />
              ) : (
                <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
              )}
            </TapButton>
          ) : backHref ? (
            <TapLink
              href={backHref}
              ariaLabel={backAriaLabel}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
            </TapLink>
          ) : desdeCancionero ? (
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
          {!backHref && !desdeCancionero && !onClose ? (
            <TapLink
              href="/canciones"
              ariaLabel="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <X className="size-5 text-text-primary" aria-hidden="true" />
            </TapLink>
          ) : null}
        </header>
      ) : null}

      {phase === "ingreso" ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4 pb-28">
          {/* Letra / búsqueda: ocupa el espacio libre, sin alargar el scroll */}
          <div className="flex min-h-0 flex-1 flex-col">
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

          {/* Datos / pestañas: scroll propio con tope en el último bloque */}
          <div className="mt-4 min-h-0 shrink overflow-y-auto overscroll-y-contain">
            <div
              className={CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS}
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

            <div className={`mt-3 ${CIFRADO_CONTROLS_PANEL_BOX_CLASS}`}>
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
              <p className="mt-3 text-sm font-medium text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            {ingresoTab === "letra" ? (
              <TapButton
                type="button"
                onClick={handleApplyLyrics}
                disabled={!draftLyrics.trim() || !tonalidadLista}
                className={`mt-4 px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
              >
                Aplicar y empezar a cifrar
              </TapButton>
            ) : null}

            {ingresoTab === "pegar" ? (
              <TapButton
                type="button"
                onClick={handleApplyPaste}
                disabled={!draftPaste.trim() || !tonalidadLista}
                className={`mt-4 px-4 py-2.5 text-sm font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
              >
                Importar y editar
              </TapButton>
            ) : null}

            {ingresoTab === "web" ? (
              <p className="mt-3 text-center text-xs text-text-muted">
                En la web, el botón de importar aparece al elegir una canción.
              </p>
            ) : null}
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-darker px-3 pb-1.5"
            style={{ paddingTop: "calc(0.375rem + env(safe-area-inset-top, 0px))" }}
          >
            {onClose ? (
              <TapButton
                type="button"
                aria-label={backAriaLabel}
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card"
              >
                {exitIcon === "close" ? (
                  <X className="size-4 text-text-primary" aria-hidden="true" />
                ) : (
                  <ArrowLeft className="size-4 text-text-primary" aria-hidden="true" />
                )}
              </TapButton>
            ) : backHref ? (
              <TapLink
                href={backHref}
                ariaLabel={backAriaLabel}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card"
              >
                <ArrowLeft className="size-4 text-text-primary" aria-hidden="true" />
              </TapLink>
            ) : desdeCancionero ? (
              <TapLink
                href="/canciones/cancionero"
                ariaLabel="Volver al cancionero"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card"
              >
                <ArrowLeft className="size-4 text-text-primary" aria-hidden="true" />
              </TapLink>
            ) : (
              <TapLink
                href="/canciones"
                ariaLabel="Cerrar"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card"
              >
                <X className="size-4 text-text-primary" aria-hidden="true" />
              </TapLink>
            )}

            <button
              type="button"
              onClick={() => setConfigOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-start text-left pl-1"
            >
              <span className="w-full truncate text-sm font-extrabold text-text-primary">
                {nombre.trim() || "Sin nombre"}
              </span>
              <span className="text-[10px] text-text-muted">
                {artista.trim() ? `${artista.trim()} · ` : ""}{tonalidadLabel} {modoLabel}
              </span>
            </button>
            <TapButton
              type="button"
              aria-label="Datos y ajustes de la canción"
              onClick={() => setConfigOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card text-text-secondary"
            >
              <SlidersHorizontal className="size-4.5" aria-hidden="true" />
            </TapButton>
            <TapButton
              type="button"
              aria-label="Vista previa"
              onClick={() => setPreviewOpen(true)}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-card text-text-secondary"
            >
              <Eye className="size-4.5" aria-hidden="true" />
            </TapButton>
            {onPersist ? (
              <TapButton
                type="button"
                aria-label="Guardar"
                disabled={saveLoading}
                onClick={() => void handleSave()}
                className={`shrink-0 rounded-sutil px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
              >
                {saveLoading ? "…" : "Guardar"}
              </TapButton>
            ) : null}
          </div>

          {error ? (
            <p
              className="shrink-0 px-4 py-2 text-sm font-medium text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div
            className={`relative min-h-0 flex-1 overflow-y-auto overscroll-y-contain ${CIFRADO_EDITOR_SHEET_BG_CLASS}`}
          >
            <div className="relative px-4 py-4 pb-28">
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
                anotacionesEnabled={anotacionesEnabled}
                anotaciones={anotaciones?.items ?? []}
                onAnnotate={anotEditor.placeAt}
                onSelectAnotacion={anotEditor.selectExisting}
                rangoPendiente={anotEditor.rangoPendiente}
                onOpenTipoMenu={anotEditor.openTipoMenu}
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

      {anotEditor.draft ? (
        <AnotacionPickerHost
          draft={anotEditor.draft}
          onClose={anotEditor.close}
          onSubmit={anotEditor.submit}
          onDelete={anotEditor.remove}
        />
      ) : null}

      {anotEditor.tipoMenu ? (
        <AnotacionTipoMenu
          x={anotEditor.tipoMenu.x}
          y={anotEditor.tipoMenu.y}
          onPick={anotEditor.chooseTipo}
          onClose={anotEditor.closeTipoMenu}
        />
      ) : null}

      {configOpen && phase === "cifrado" ? (
        <div className="absolute inset-0 z-[60] flex flex-col bg-bg-app">
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
            <TapButton
              type="button"
              aria-label="Volver a cifrar"
              onClick={() => setConfigOpen(false)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft
                className="size-5 text-text-primary"
                aria-hidden="true"
              />
            </TapButton>
            <h2 className="min-w-0 flex-1 text-lg font-extrabold text-text-primary">
              Datos y ajustes
            </h2>
            <TapButton
              type="button"
              onClick={() => setConfigOpen(false)}
              className={`shrink-0 px-4 py-2 text-sm font-bold ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
            >
              Listo
            </TapButton>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
            <div className="flex flex-col gap-4">
              <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
                <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
                  Datos de la canción
                </p>
                <label
                  className={labelClassName}
                  htmlFor="cifrado-mobile-cfg-nombre"
                >
                  Nombre
                </label>
                <input
                  id="cifrado-mobile-cfg-nombre"
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
                  htmlFor="cifrado-mobile-cfg-artista"
                >
                  Artista
                </label>
                <input
                  id="cifrado-mobile-cfg-artista"
                  value={artista}
                  onChange={(event) => setArtista(event.target.value)}
                  className={CIFRADO_CONTROLS_INPUT_CLASS}
                  placeholder="Artista"
                />
              </div>

              <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
                <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>Tonalidad</p>
                <CifradoTonalidadFields
                  idPrefix="cifrado-mobile-cfg"
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

              <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
                <label
                  className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
                  htmlFor="cifrado-mobile-cfg-bpm"
                >
                  Tempo (BPM)
                </label>
                <div className="flex items-stretch gap-2">
                  <ToolNumericStepper
                    value={compasConfig.bpm}
                    density="compact"
                    inputId="cifrado-mobile-cfg-bpm"
                    min={40}
                    max={240}
                    decrementDisabled={compasConfig.bpm <= 40}
                    incrementDisabled={compasConfig.bpm >= 240}
                    decrementAriaLabel="Reducir BPM"
                    incrementAriaLabel="Aumentar BPM"
                    accentVar="--accent-editor"
                    onDecrement={() => handleSetBpm(compasConfig.bpm - 1)}
                    onIncrement={() => handleSetBpm(compasConfig.bpm + 1)}
                    onSetValue={handleSetBpm}
                    className="min-w-0 flex-1"
                  />
                  <TapButton
                    type="button"
                    onClick={handleTapTempo}
                    className="min-h-[2.25rem] min-w-[5.25rem] shrink-0 rounded-estandar border border-border bg-bg-card px-4 text-xs font-semibold text-text-secondary"
                  >
                    Tap{tapCount > 0 ? ` (${tapCount})` : ""}
                  </TapButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen && phase === "cifrado" ? (
        <div className="absolute inset-0 z-[60] flex flex-col bg-bg-app">
          <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-darker px-4 py-3">
            <TapButton
              type="button"
              aria-label="Cerrar vista previa"
              onClick={() => setPreviewOpen(false)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
            >
              <ArrowLeft
                className="size-5 text-text-primary"
                aria-hidden="true"
              />
            </TapButton>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-extrabold text-text-primary">
                {nombre.trim() || "Sin nombre"}
              </p>
              <p className="truncate text-xs text-text-muted">
                {artista.trim() ? `${artista.trim()} · ` : ""}
                {tonalidadLabel} {modoLabel} · {compasConfig.bpm} BPM
              </p>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain bg-letra-bg px-4 py-5">
            <CifradoLyricsBlock
              letra={lyricsText}
              acordes={cifrado.acordes}
              barras={compasConfig.barras}
              tipoCompas={compasConfig.tipoCompas}
              intensidadPlantilla={getIntensidadPlantilla(compasConfig)}
              lineTerminalOffsets={compasConfig.lineTerminalOffsets}
              showCompas
              showAcordes
              notacion="es"
              letraSheet
              anotaciones={anotaciones?.items ?? []}
              anotacionesVisibility={DEFAULT_ANOTACION_VISIBILITY}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
