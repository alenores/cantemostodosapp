"use client";

import {
  CifradoCompasToolPanel,
  type CifradoCompasToolTab,
} from "@/components/cifrado/CifradoCompasToolPanel";
import { CifradoEditorPcToolbar } from "@/components/cifrado/CifradoEditorPcToolbar";
import {
  CifradoEditorHelpButton,
  CifradoEditorHelpModal,
} from "@/components/cifrado/CifradoEditorHelpModal";
import { CifradoLineMergePicker } from "@/components/cifrado/CifradoLineMergePicker";
import { CifradoUnlockIcon } from "@/components/cifrado/CifradoUnlockIcon";
import CifradoNotacionToggle from "@/components/cifrado/CifradoNotacionToggle";
import {
  CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS,
  CIFRADO_COMPOSITOR_ACTIVE_CLASS,
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_CONTROLS_PANEL_BOX_CLASS,
  CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
  CIFRADO_CONTROLS_SEGMENTED_CLASS,
  CIFRADO_EDITOR_COMPAS_PANEL_CLASS,
  CIFRADO_EDITOR_PC_SHELL_CLASS,
  CIFRADO_EDITOR_LINE_BG_CLASS,
  CIFRADO_EDITOR_SHEET_BG_CLASS,
  CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS,
  CIFRADO_EDITOR_LINE_FAB_CLASS,
  CIFRADO_EDITOR_PLAY_BUTTON_CLASS,
  CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS,
  CIFRADO_EDITOR_TOOLBAR_LABEL_CLASS,
  CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS,
  cifradoEditorToolbarSegmentedButtonClass,
  cifradoSegmentedIconButtonClass,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import { VozPcConfigCard } from "@/components/ui/entrenador-vocal/pc/VozPcShellLayout";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useCifradoCycles } from "@/hooks/useCifradoCycles";
import {
  buildIntensidadForGolpes,
  getBarraBeatCount,
} from "@/lib/cifrado-barra-cycles";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
  MODIFICADORES,
  computeTapBpm,
  applyLineCopyAcordes,
  applyLineCopyCompas,
  charOffsetToPx,
  computeLineCompasMarkersPx,
  clampCompasCharOffset,
  computeEvenCompasPlacementOffsets,
  createDefaultCompasConfig,
  createEmptyCifrado,
  DEFAULT_BPM,
  DEFAULT_TONALIDAD,
  deleteCifradoLine,
  deleteCompasLine,
  findAcordeAt,
  formatAcorde,
  findNearestCharOffset,
  getBeatCountForCompas,
  getLineContentEndOffset,
  getLineMergeAttachOffset,
  insertCifradoLineBelow,
  insertCompasLineBelow,
  mergeCifradoLineInto,
  mergeCompasLineInto,
  mergeLyricsLineInto,
  computeLineMergePreview,
  type LineMergePreview,
  moveBarraCompas,
  moveAcorde,
  placeCompasBarrasOnLine,
  removeAcordeAt,
  removeBarraCompasAt,
  renumberLineBarrasCompas,
  resolveCharOffsetPx,
  upsertAcorde,
  type AcordePos,
  type BarraCompas,
  type CifradoData,
  type CompasConfig,
  type CompasMarker,
  type LineCopyKind,
  type Modificador,
  type NotaIndex,
  type TipoCompas,
} from "@/lib/cifrado";
import {
  cycleIntensidadSlot,
  getBarraIntensidad,
  getBarraTipoCompas,
  getIntensidadPlantilla,
  normalizeCompasConfig,
  resizeCompasConfigIntensidad,
  updateBarraIntensidad,
} from "@/lib/cifrado-intensidad";
import { isNotaEnEscala, getModificadorPorDefecto } from "@/lib/cifrado-escala";
import {
  getBeatLevelBarAppearance,
  getBeatLevelBarHeightPercent,
} from "@/lib/metronomo";
import {
  getNotaLabel,
  readNotacionAcordesPreferida,
  writeNotacionAcordesPreferida,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import { createClient } from "@/lib/supabase/client";
import type { CifradoEditorSession, CifradoSaveResult } from "@/lib/cifrado-editor-session";
import { updateCancionCifradoAvanzado } from "@/lib/cancionero";
import {
  buildDisplayedPreviewPlaybackBeats,
  type PreviewPlaybackAnchor,
} from "@/lib/cifrado-preview-play";
import { playCifradoPreviewBeat } from "@/lib/cifrado-cycle-playback";
import { CIFRADO_LABEL_PEGAR_EN_RENGLON } from "@/lib/ritmo-terminologia";
import { Copy, CornerDownRight, Lock, Monitor, Pause, Pencil, Play, Plus, Smartphone, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { ToolPresentation } from "@/lib/tool-presentation";
import { isToolPagePresentation } from "@/lib/tool-presentation";
import { forwardVerticalWheel } from "@/lib/forward-vertical-wheel";

type CifradoEditorProps = {
  open: boolean;
  isLoggedIn: boolean;
  session?: CifradoEditorSession | null;
  onClose: () => void;
  onSaved: (result?: CifradoSaveResult) => void;
  presentation?: ToolPresentation;
};

type EditorPhase = "ingreso" | "cifrado";

type PickerState = {
  lineIndex: number;
  charOffset: number;
  x: number;
  y: number;
};

type ModoInsercion = "acordes" | "compas" | "letra";

type VistaArmado = "pc" | "celular";

type ActivePreviewBeat = {
  kind: CompasMarker["kind"];
  anchors: PreviewPlaybackAnchor[];
} | null;

type CharPosition = {
  left: number;
  center: number;
  bottom: number;
};

type LineCopyBuffer = {
  kind: LineCopyKind;
  sourceTextLength: number;
  acordes: AcordePos[];
  barras: BarraCompas[];
};

const labelClassName =
  "mb-1.5 block text-sm font-medium text-text-secondary";

const inputClassName = CIFRADO_CONTROLS_INPUT_CLASS;

const textareaClassName =
  "min-h-[200px] w-full resize-y rounded-[10px] border border-border bg-letra-bg px-4 py-3 font-mono text-sm text-letra-text placeholder:italic placeholder:text-text-muted outline-none focus:border-compositor-config-border";

/** Casillas clicables a la derecha de la letra para marcar compases instrumentales. */
const COMPAS_EXTENSION_SLOTS = 24;

const NOTA_INDICES = Array.from({ length: 12 }, (_, index) => index as NotaIndex);

function getCompasExtensionStart(textLength: number): number {
  return textLength === 0 ? 1 : textLength;
}

function splitLyricsLines(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split("\n");
}

function removeLockedLineIndex(
  locked: Set<number>,
  lineIndex: number,
): Set<number> {
  const next = new Set<number>();

  for (const index of locked) {
    if (index === lineIndex) {
      continue;
    }

    next.add(index > lineIndex ? index - 1 : index);
  }

  return next;
}

function insertLockedLineBelow(
  locked: Set<number>,
  lineIndex: number,
): Set<number> {
  const next = new Set<number>();

  for (const index of locked) {
    next.add(index > lineIndex ? index + 1 : index);
  }

  return next;
}

type ChordPickerProps = {
  state: PickerState;
  existing?: AcordePos;
  tonalidadIndex: NotaIndex;
  notacion: NotacionAcordes;
  onApply: (noteIndex: NotaIndex, modifier: Modificador) => void;
  onRemove: () => void;
  onClose: () => void;
};

function ChordPicker({
  state,
  existing,
  tonalidadIndex,
  notacion,
  onApply,
  onRemove,
  onClose,
}: ChordPickerProps) {
  const [noteIndex, setNoteIndex] = useState<NotaIndex | null>(
    existing ? existing.noteIndex : null,
  );
  const [modifier, setModifier] = useState<Modificador | null>(
    existing ? existing.modifier : null,
  );
  const panelRef = useRef<HTMLDivElement>(null);
  const canApply = noteIndex !== null && modifier !== null;

  useEffect(() => {
    setNoteIndex(existing ? existing.noteIndex : null);
    setModifier(existing ? existing.modifier : null);
  }, [
    existing?.charOffset,
    existing?.lineIndex,
    existing?.modifier,
    existing?.noteIndex,
    state.charOffset,
    state.lineIndex,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  function handleSelectNote(index: NotaIndex) {
    setNoteIndex(index);
    setModifier(getModificadorPorDefecto(index, tonalidadIndex));
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-[70] w-72 rounded-[12px] border border-border bg-bg-card p-3 shadow-xl"
      style={{ left: state.x, top: state.y }}
      role="dialog"
      aria-label="Selector de acorde"
    >
      <p className="mb-2 text-xs font-medium text-text-muted">Nota</p>
      <div className="grid grid-cols-4 gap-1.5">
        {NOTA_INDICES.map((index) => {
          const enEscala = isNotaEnEscala(index, tonalidadIndex);
          const isSelected = noteIndex !== null && noteIndex === index;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectNote(index)}
              className={`rounded-lg px-2 py-1.5 text-xs ${
                isSelected
                  ? `${CIFRADO_COMPOSITOR_ACTIVE_CLASS} font-semibold`
                  : enEscala
                    ? "bg-bg-dark font-semibold text-text-primary"
                    : "bg-bg-dark/50 font-normal text-text-muted opacity-60"
              }`}
            >
              {getNotaLabel(index, notacion)}
            </button>
          );
        })}
      </div>

      <p className="mb-2 mt-3 text-xs font-medium text-text-muted">
        Modificador
      </p>
      <div className="flex flex-wrap gap-1.5">
        {MODIFICADORES.map((item) => (
          <button
            key={item.id || "mayor"}
            type="button"
            onClick={() => setModifier(item.id)}
            className={`rounded-full px-2.5 py-1 text-xs ${
              modifier !== null && modifier === item.id
                ? CIFRADO_COMPOSITOR_ACTIVE_CLASS
                : "bg-bg-dark text-text-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <TapButton
          type="button"
          onClick={() => {
            if (noteIndex !== null && modifier !== null) {
              onApply(noteIndex, modifier);
            }
          }}
          disabled={!canApply}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-40 ${CIFRADO_COMPOSITOR_ACTIVE_CLASS}`}
        >
          Aplicar
        </TapButton>
        {existing && (
          <TapButton
            type="button"
            onClick={onRemove}
            className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary"
          >
            Quitar
          </TapButton>
        )}
      </div>
    </div>
  );
}

type SelectedBarra = {
  lineIndex: number;
  charOffset: number;
};

type CifradoLineEditorProps = {
  lineIndex: number;
  text: string;
  acordes: AcordePos[];
  barras: BarraCompas[];
  modoAvanzado: boolean;
  modoInsercion: ModoInsercion;
  tipoCompas: TipoCompas;
  intensidadPlantilla: import("@/lib/metronomo").MetronomeBeatLevel[];
  selectedBarraKey: string | null;
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onOpenPicker: (lineIndex: number, charOffset: number, rect: DOMRect) => void;
  onInsertBarra: (lineIndex: number, charOffset: number) => void;
  onSelectBarra: (barra: BarraCompas) => void;
  onMoveAcorde: (
    lineIndex: number,
    fromOffset: number,
    toOffset: number,
  ) => void;
  onMoveBarra: (
    lineIndex: number,
    fromOffset: number,
    toOffset: number,
  ) => void;
  onLineTextChange?: (lineIndex: number, newText: string) => void;
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  isLineEditing?: boolean;
  isDimmed?: boolean;
  isLineLocked?: boolean;
  onToggleLineEdit?: () => void;
  onToggleLineLock?: () => void;
  hasLineCopyPending?: boolean;
  lineNumber?: number;
  isMergeDestination?: boolean;
  isMergeHighlight?: boolean;
  mergePreview?: LineMergePreview | null;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>;
};

type LineEditFabBarProps = {
  hasLineCopyPending: boolean;
  lineMergePicking: boolean;
  lineMergeDestNumber: number | null;
  sourceLineNumber: number;
  totalLines: number;
  mergePreview: LineMergePreview | null;
  onLineMergeDestNumberChange: (value: number | null) => void;
  onStartLineMerge: () => void;
  onConfirmLineMerge: () => void;
  onCancelLineMerge: () => void;
  onDelete: () => void;
  onInsertBelow: () => void;
  onCopy: (kind: LineCopyKind) => void;
};

function LineEditFabBar({
  hasLineCopyPending,
  lineMergePicking,
  lineMergeDestNumber,
  sourceLineNumber,
  totalLines,
  mergePreview,
  onLineMergeDestNumberChange,
  onStartLineMerge,
  onConfirmLineMerge,
  onCancelLineMerge,
  onDelete,
  onInsertBelow,
  onCopy,
}: LineEditFabBarProps) {
  return (
    <div
      data-line-edit-fab=""
      className={CIFRADO_EDITOR_LINE_FAB_CLASS}
      onClick={(event) => event.stopPropagation()}
    >
      {hasLineCopyPending && !lineMergePicking && (
        <p className="mb-2 text-center text-xs text-text-muted">
          Listo para pegar — tocá otro renglón
        </p>
      )}

      {lineMergePicking ? (
        <CifradoLineMergePicker
          lineMergeDestNumber={lineMergeDestNumber}
          sourceLineNumber={sourceLineNumber}
          totalLines={totalLines}
          mergePreview={mergePreview}
          onLineMergeDestNumberChange={onLineMergeDestNumberChange}
          onConfirmLineMerge={onConfirmLineMerge}
          onCancelLineMerge={onCancelLineMerge}
        />
      ) : (
        <div className="flex flex-wrap justify-center gap-1.5">
          <TapButton
            type="button"
            onClick={onDelete}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Eliminar
          </TapButton>
          <TapButton
            type="button"
            onClick={onInsertBelow}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Línea abajo
          </TapButton>
          <TapButton
            type="button"
            onClick={onStartLineMerge}
            disabled={totalLines < 2}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <CornerDownRight className="size-3.5" aria-hidden="true" />
            {CIFRADO_LABEL_PEGAR_EN_RENGLON}
          </TapButton>
          <TapButton
            type="button"
            onClick={() => onCopy("acordes")}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Copiar acordes
          </TapButton>
          <TapButton
            type="button"
            onClick={() => onCopy("compas")}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Copiar compás
          </TapButton>
          <TapButton
            type="button"
            onClick={() => onCopy("both")}
            className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
          >
            <Copy className="size-3.5" aria-hidden="true" />
            Copiar ambos
          </TapButton>
        </div>
      )}
    </div>
  );
}

function getCharOffsetFromClick(
  event: ReactMouseEvent<HTMLDivElement>,
): number | null {
  const target = event.target as HTMLElement;
  const span = target.closest("[data-char-index]");

  if (!span) {
    return null;
  }

  const charOffset = Number(span.getAttribute("data-char-index"));

  if (Number.isNaN(charOffset)) {
    return null;
  }

  return charOffset;
}

const COMPAS_DRAG_THRESHOLD_PX = 6;

type BarDragState = {
  fromOffset: number;
  pointerId: number;
  startX: number;
  hasMoved: boolean;
};

type ChordDragState = {
  fromOffset: number;
  pointerId: number;
  startX: number;
  hasMoved: boolean;
};

function CifradoLineEditor({
  lineIndex,
  text,
  acordes,
  barras,
  modoAvanzado,
  modoInsercion,
  tipoCompas,
  intensidadPlantilla,
  selectedBarraKey,
  activeBeatAnchors = [],
  onOpenPicker,
  onInsertBarra,
  onSelectBarra,
  onMoveAcorde,
  onMoveBarra,
  onLineTextChange,
  onMarkersReady,
  isLineEditing = false,
  isDimmed = false,
  isLineLocked = false,
  onToggleLineEdit,
  onToggleLineLock,
  hasLineCopyPending = false,
  lineNumber,
  isMergeDestination = false,
  isMergeHighlight = false,
  mergePreview = null,
  notacion = "es",
  cyclePiecesById,
}: CifradoLineEditorProps) {
  const lineRef = useRef<HTMLDivElement>(null);
  const textLaneRef = useRef<HTMLDivElement>(null);
  const textRowRef = useRef<HTMLDivElement>(null);
  const barDragRef = useRef<BarDragState | null>(null);
  const chordDragRef = useRef<ChordDragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const [charPositions, setCharPositions] = useState<CharPosition[]>([]);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<number | null>(
    null,
  );
  const [chordDragPreviewOffset, setChordDragPreviewOffset] = useState<
    number | null
  >(null);

  const measurePositions = useCallback(() => {
    const container = textRowRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const spans = container.querySelectorAll("[data-char-index]");
    const positions: CharPosition[] = [];

    spans.forEach((span) => {
      const index = Number(span.getAttribute("data-char-index"));

      if (Number.isNaN(index)) {
        return;
      }

      const rect = span.getBoundingClientRect();
      const left = rect.left - containerRect.left;

      positions[index] = {
        left,
        center: left + rect.width / 2,
        bottom: rect.bottom - containerRect.top,
      };
    });

    setCharPositions(positions);
  }, []);

  useLayoutEffect(() => {
    measurePositions();
  }, [measurePositions, text, mergePreview, modoAvanzado]);

  useEffect(() => {
    const container = textRowRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measurePositions();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [measurePositions]);

  function resolveNearestOffset(clientX: number): number {
    const container = textRowRef.current;

    if (!container) {
      return 0;
    }

    return clampCompasCharOffset(
      findNearestCharOffset(
        charPositions,
        clientX,
        container.getBoundingClientRect().left,
      ),
    );
  }

  function handleBarPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    barra: BarraCompas,
  ) {
    if (modoInsercion !== "compas" || isLineLocked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    barDragRef.current = {
      fromOffset: barra.charOffset,
      pointerId: event.pointerId,
      startX: event.clientX,
      hasMoved: false,
    };
    setDragPreviewOffset(barra.charOffset);
  }

  function handleBarPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = barDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (
      !drag.hasMoved &&
      Math.abs(event.clientX - drag.startX) >= COMPAS_DRAG_THRESHOLD_PX
    ) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      setDragPreviewOffset(resolveNearestOffset(event.clientX));
    }
  }

  function handleBarPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = barDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.hasMoved) {
      const targetOffset = resolveNearestOffset(event.clientX);

      if (targetOffset !== drag.fromOffset) {
        onMoveBarra(lineIndex, drag.fromOffset, targetOffset);
      }

      suppressNextClickRef.current = true;
    } else {
      const selected = barras.find(
        (item) => item.charOffset === drag.fromOffset,
      );

      if (selected) {
        onSelectBarra(selected);
      }
    }

    barDragRef.current = null;
    setDragPreviewOffset(null);
  }

  function handleBarPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    barDragRef.current = null;
    setDragPreviewOffset(null);
  }

  function handleChordPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    acorde: AcordePos,
  ) {
    if (modoInsercion !== "acordes" || isLineLocked) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    chordDragRef.current = {
      fromOffset: acorde.charOffset,
      pointerId: event.pointerId,
      startX: event.clientX,
      hasMoved: false,
    };
    setChordDragPreviewOffset(acorde.charOffset);
  }

  function handleChordPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    const drag = chordDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (
      !drag.hasMoved &&
      Math.abs(event.clientX - drag.startX) >= COMPAS_DRAG_THRESHOLD_PX
    ) {
      drag.hasMoved = true;
    }

    if (drag.hasMoved) {
      setChordDragPreviewOffset(resolveNearestOffset(event.clientX));
    }
  }

  function handleChordPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = chordDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const fromOffset = drag.fromOffset;

    if (drag.hasMoved) {
      const targetOffset = resolveNearestOffset(event.clientX);

      if (targetOffset !== fromOffset) {
        onMoveAcorde(lineIndex, fromOffset, targetOffset);
      }

      suppressNextClickRef.current = true;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      onOpenPicker(lineIndex, fromOffset, rect);
    }

    chordDragRef.current = null;
    setChordDragPreviewOffset(null);
  }

  function handleChordPointerCancel(
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    chordDragRef.current = null;
    setChordDragPreviewOffset(null);
  }

  function handleLineClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (
      modoInsercion === "letra" ||
      isLineEditing ||
      isLineLocked ||
      isDimmed
    ) {
      return;
    }

    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }

    const charOffset =
      getCharOffsetFromClick(event) ?? resolveNearestOffset(event.clientX);

    const container = textRowRef.current;

    if (!container) {
      return;
    }

    const span = container.querySelector(
      `[data-char-index="${charOffset}"]`,
    );
    const pickerRect =
      span?.getBoundingClientRect() ??
      new DOMRect(
        container.getBoundingClientRect().left +
          (charPositions[charOffset]?.center ?? 0),
        container.getBoundingClientRect().top + 24,
        0,
        0,
      );

    if (modoInsercion === "acordes") {
      onOpenPicker(lineIndex, charOffset, pickerRect);
      return;
    }

    onInsertBarra(lineIndex, clampCompasCharOffset(charOffset));
  }

  const characters = [...(mergePreview?.mergedText ?? text)];
  const extensionStart = getCompasExtensionStart(characters.length);
  const letraDirectEdit =
    modoInsercion === "letra" && !isLineLocked && !isDimmed && !isLineEditing;
  const textEditable = letraDirectEdit || (isLineEditing && !isLineLocked);
  const lineCursorClass = isLineLocked
    ? "cursor-default"
    : textEditable || modoInsercion === "letra"
      ? "cursor-text select-text"
      : "cursor-pointer";

  function getAcordeDisplayOffset(acorde: AcordePos): number {
    if (
      chordDragPreviewOffset !== null &&
      chordDragRef.current?.fromOffset === acorde.charOffset
    ) {
      return chordDragPreviewOffset;
    }

    return acorde.charOffset;
  }

  const barrasParaRender = useMemo(() => {
    if (dragPreviewOffset === null) {
      return barras;
    }

    return barras.map((barra) => {
      if (barra.charOffset !== barDragRef.current?.fromOffset) {
        return barra;
      }

      return { ...barra, charOffset: dragPreviewOffset };
    });
  }, [barras, dragPreviewOffset]);
  const compasConfigForLine = useMemo(
    () => ({
      tipoCompas,
      intensidadPlantilla,
      bpm: 0,
      barras: [] as BarraCompas[],
    }),
    [intensidadPlantilla, tipoCompas],
  );
  const compasMarkers = useMemo(
    () =>
      barrasParaRender.length > 0
        ? computeLineCompasMarkersPx(
            barrasParaRender,
            (barra) => getBarraBeatCount(barra, compasConfigForLine, cyclePiecesById),
            (offset) => resolveCharOffsetPx(offset, charPositions),
            (barra, beatIndex) =>
              getBarraIntensidad(barra, compasConfigForLine)[beatIndex] ??
              "medio",
          )
        : [],
    [barrasParaRender, charPositions, compasConfigForLine, cyclePiecesById],
  );
  const draggingMeasureLeftPx =
    dragPreviewOffset !== null && barDragRef.current?.hasMoved
      ? (resolveCharOffsetPx(dragPreviewOffset, charPositions) ?? null)
      : null;
  const activeBeatLeftPx =
    activeBeatAnchors.find((anchor) => anchor.lineIndex === lineIndex)?.leftPx ??
    null;
  const extensionClickable =
    modoInsercion === "compas" && !isLineEditing && !isLineLocked && !isDimmed;
  const chordDragEnabled =
    modoInsercion === "acordes" && !isLineEditing && !isLineLocked && !isDimmed;
  const overlayLocked =
    isLineLocked || modoInsercion === "letra" || isLineEditing;
  const laneBgClass = isLineLocked
    ? "bg-transparent"
    : mergePreview
      ? "bg-transparent"
      : "bg-compositor-config-bg";
  const extensionBgClass = isLineLocked
    ? "border-transparent bg-transparent opacity-50"
    : mergePreview
      ? "border-compositor-config-border/60 bg-transparent"
      : "border-compositor-config-border bg-compositor-config-bg";

  useEffect(() => {
    onMarkersReady?.(lineIndex, compasMarkers);
  }, [compasMarkers, lineIndex, onMarkersReady]);

  return (
    <div
      ref={lineRef}
      className={`relative mb-1.5 overflow-hidden rounded-md border px-2 pb-5 pt-4 transition-opacity ${
        isMergeDestination
          ? `border-compositor-config/70 ring-1 ring-compositor-config/35 ${CIFRADO_EDITOR_LINE_BG_CLASS}`
          : isMergeHighlight
            ? `cifrado-merge-result-highlight border-compositor-config/60 ${CIFRADO_EDITOR_LINE_BG_CLASS}`
            : isLineEditing
            ? "border-compositor-config-border bg-compositor-config-bg/60"
            : isLineLocked
              ? "border-border/60 bg-letra-bg/70"
              : `border-border/80 ${CIFRADO_EDITOR_LINE_BG_CLASS}`
      } ${isDimmed && !isMergeDestination && !isMergeHighlight ? "opacity-40" : ""}`}
    >
      {isMergeDestination ? (
        <div
          className="cifrado-merge-dest-line-shimmer pointer-events-none absolute inset-0 z-[15] rounded-md"
          aria-hidden="true"
        />
      ) : null}
      {lineNumber !== undefined && (
        <span
          className="pointer-events-none absolute left-1.5 top-1.5 z-30 text-[10px] font-bold tabular-nums text-text-muted/80"
          aria-hidden="true"
        >
          {lineNumber}
        </span>
      )}

      {!isLineLocked && onToggleLineEdit && (
        <TapButton
          type="button"
          data-line-pencil=""
          onClick={(event) => {
            event.stopPropagation();
            onToggleLineEdit();
          }}
          className={`absolute right-1.5 top-1.5 z-40 flex size-6 items-center justify-center rounded-md transition-colors ${
            isLineEditing
              ? "bg-compositor-config text-white"
              : hasLineCopyPending
                ? "bg-bg-card text-text-secondary ring-1 ring-compositor-config-border"
                : "text-text-muted hover:bg-bg-card hover:text-text-secondary"
          }`}
          aria-label={isLineEditing ? "Dejar de editar línea" : "Editar línea"}
          aria-pressed={isLineEditing}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </TapButton>
      )}

      {onToggleLineLock && (
        <TapButton
          type="button"
          data-line-lock=""
          onClick={(event) => {
            event.stopPropagation();
            onToggleLineLock();
          }}
          className={`absolute bottom-1.5 right-1.5 z-40 flex size-6 items-center justify-center rounded-md transition-colors ${
            isLineLocked
              ? "bg-compositor-config text-white"
              : "text-text-muted hover:bg-bg-card hover:text-text-secondary"
          }`}
          aria-label={
            isLineLocked ? "Desbloquear renglón" : "Bloquear renglón"
          }
          aria-pressed={isLineLocked}
        >
          {isLineLocked ? (
            <Lock className="size-3.5" aria-hidden="true" />
          ) : (
            <CifradoUnlockIcon className="size-3.5" />
          )}
        </TapButton>
      )}

      <div
        className={
          isDimmed || isLineLocked ? "pointer-events-none" : undefined
        }
      >
      <div
        ref={textLaneRef}
        className={`relative min-h-[2.25rem] rounded px-1.5 py-1 ${laneBgClass} ${lineCursorClass}`}
        onClick={
          textEditable || isLineLocked || isDimmed ? undefined : handleLineClick
        }
      >
        <div ref={textRowRef} className="relative">
        <div
          className={`flex w-full items-baseline pt-4 font-mono text-sm text-letra-text ${
            textEditable ? "select-text" : ""
          }`}
        >
          {textEditable ? (
            <div
              contentEditable
              suppressContentEditableWarning
              className="inline min-w-[1ch] flex-1 whitespace-pre-wrap break-words outline-none focus:ring-1 focus:ring-compositor-config/40"
              onBlur={(event) =>
                onLineTextChange?.(
                  lineIndex,
                  event.currentTarget.textContent ?? "",
                )
              }
            >
              {text || " "}
            </div>
          ) : (
            <span className="inline shrink-0">
              {characters.length === 0 ? (
                <span data-char-index={0} className="text-text-muted">
                  {" "}
                </span>
              ) : (
                characters.map((char, charIndex) => (
                  <span key={charIndex} data-char-index={charIndex}>
                    {char}
                  </span>
                ))
              )}
            </span>
          )}

          <span
            className={`ml-1 inline-flex min-h-[1.25rem] min-w-[10ch] flex-1 border-l border-dashed pl-0.5 ${extensionBgClass} ${
              extensionClickable ? "" : "opacity-70"
            } ${overlayLocked ? "pointer-events-none" : ""}`}
            aria-label="Espacio instrumental"
          >
            {Array.from({ length: COMPAS_EXTENSION_SLOTS }).map((_, slot) => (
              <span
                key={`ext-${slot}`}
                data-char-index={extensionStart + slot}
                className={`inline-block min-w-[1ch] flex-1 ${
                  extensionClickable ? "hover:bg-compositor-config-bg" : ""
                }`}
              >
                {" "}
              </span>
            ))}
          </span>
        </div>

        <div className={overlayLocked ? "pointer-events-none" : undefined}>
        {acordes.map((acorde) => {
          const displayOffset = getAcordeDisplayOffset(acorde);
          const position = charPositions[displayOffset];

          if (!position) {
            return null;
          }

          const isDragging =
            chordDragPreviewOffset !== null &&
            chordDragRef.current?.hasMoved &&
            chordDragRef.current.fromOffset === acorde.charOffset;
          const dotTop = position.bottom + 2;
          const stemTop = 18;
          const stemHeight = Math.max(4, dotTop - stemTop);

          return (
            <div
              key={`acorde-col-${acorde.lineIndex}-${acorde.charOffset}`}
              className="pointer-events-none absolute top-0"
              style={{ left: position.center }}
            >
              <span
                className={`absolute -translate-x-1/2 whitespace-nowrap rounded px-0.5 text-xs font-bold ${CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS}`}
                style={{ top: 6, left: 0 }}
              >
                {formatAcorde(acorde.noteIndex, acorde.modifier, notacion)}
              </span>
              <span
                className={`absolute w-px -translate-x-1/2 ${
                  isDragging ? "bg-compositor-config" : "bg-compositor-config/50"
                }`}
                style={{
                  top: stemTop,
                  left: 0,
                  height: stemHeight,
                }}
                aria-hidden="true"
              />
              <span
                className="absolute size-1 -translate-x-1/2 rounded-full bg-compositor-config"
                style={{ top: dotTop, left: 0 }}
                aria-hidden="true"
              />
            </div>
          );
        })}

        {chordDragEnabled &&
          acordes.map((acorde) => {
            const displayOffset = getAcordeDisplayOffset(acorde);
            const position = charPositions[displayOffset];

            if (!position) {
              return null;
            }

            return (
              <button
                key={`chord-handle-${acorde.lineIndex}-${acorde.charOffset}`}
                type="button"
                aria-label={`${formatAcorde(acorde.noteIndex, acorde.modifier, notacion)}. Arrastrá para mover o tocá para editar.`}
                className="absolute z-20 h-5 w-6 -translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent p-0"
                style={{ left: position.center, top: 4 }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  handleChordPointerDown(event, acorde);
                }}
                onPointerMove={handleChordPointerMove}
                onPointerUp={handleChordPointerUp}
                onPointerCancel={handleChordPointerCancel}
              />
            );
          })}

        {(compasMarkers.length > 0 ||
          (modoInsercion === "compas" && barras.length > 0)) && (
          <div className="relative mt-1 min-h-2">
            {compasMarkers.length > 0 && (
              <CompasMarkersRow
                markers={compasMarkers}
                highlightMeasureLeftPx={draggingMeasureLeftPx}
                activeBeatLeftPx={activeBeatLeftPx}
                playbackHighlight={activeBeatLeftPx !== null}
                showMeasureStem
              />
            )}

            {modoInsercion === "compas" &&
              !isLineEditing &&
              barras.map((barra) => {
                const isDraggingThis =
                  dragPreviewOffset !== null &&
                  barDragRef.current?.fromOffset === barra.charOffset;
                const displayOffset = isDraggingThis
                  ? dragPreviewOffset
                  : barra.charOffset;
                const left =
                  resolveCharOffsetPx(displayOffset, charPositions) ?? 0;
                const isSelected =
                  selectedBarraKey === `${lineIndex}:${barra.charOffset}`;

                return (
                  <button
                    key={`bar-handle-${barra.lineIndex}-${barra.charOffset}`}
                    type="button"
                    aria-label={`Compás ${barra.compasNumero}. Tocá para editar intensidad. Arrastrá para mover.`}
                    aria-pressed={isSelected}
                    className={`absolute bottom-0 z-30 h-3 w-4 -translate-x-1/2 cursor-col-resize touch-none border-0 bg-transparent p-0 ${
                      isSelected ? "ring-2 ring-compositor-config ring-offset-1" : ""
                    }`}
                    style={{ left }}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handleBarPointerDown(event, barra);
                    }}
                    onPointerMove={handleBarPointerMove}
                    onPointerUp={handleBarPointerUp}
                    onPointerCancel={handleBarPointerCancel}
                  />
                );
              })}
          </div>
        )}
        </div>
        </div>
      </div>
      </div>
    </div>
  );
}

type CompasMarkersRowProps = {
  markers: CompasMarker[];
  highlightMeasureLeftPx?: number | null;
  activeBeatLeftPx?: number | null;
  playbackHighlight?: boolean;
  showMeasureStem?: boolean;
};

function CompasMarkersRow({
  markers,
  highlightMeasureLeftPx = null,
  activeBeatLeftPx = null,
  playbackHighlight = false,
  showMeasureStem = false,
}: CompasMarkersRowProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <div
      className={`relative ${showMeasureStem ? "mt-1 min-h-4" : "h-4"}`}
      aria-hidden="true"
    >
      {markers.map((marker, index) => {
        const isDraggingMeasure =
          marker.kind === "measure" &&
          highlightMeasureLeftPx !== null &&
          Math.abs(marker.leftPx - highlightMeasureLeftPx) < 1.5;
        const isActiveBeat =
          activeBeatLeftPx !== null &&
          Math.abs(marker.leftPx - activeBeatLeftPx) < 2;

        if (marker.kind === "measure") {
          const level = marker.intensidad ?? "fuerte";
          const barAppearance = getBeatLevelBarAppearance(level);
          const measureHeight = Math.max(
            getBeatLevelBarHeightPercent(level) * 0.14,
            10,
          );

          return (
            <span
              key={`compas-measure-${index}`}
              className="absolute bottom-0"
              style={{ left: marker.leftPx }}
            >
              {showMeasureStem && (
                <span
                  className="absolute bottom-full left-0 w-px bg-text-muted/75"
                  style={{ height: "2.75rem" }}
                />
              )}
              <span
                className={`absolute bottom-0 left-0 rounded-full transition-all duration-75 ${
                  isDraggingMeasure || isActiveBeat ? "z-10" : ""
                } ${isActiveBeat && playbackHighlight ? "ring-2 ring-blue-400" : ""}`}
                style={{
                  width: isActiveBeat && playbackHighlight ? "0.5rem" : "0.375rem",
                  height:
                    isActiveBeat && playbackHighlight
                      ? `${measureHeight + 4}px`
                      : `${measureHeight}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
            </span>
          );
        }

        const beatLevel = marker.intensidad ?? "medio";
        const beatAppearance = getBeatLevelBarAppearance(beatLevel);
        const beatHeight = Math.max(
          getBeatLevelBarHeightPercent(beatLevel) * 0.1,
          beatLevel === "silencio" ? 4 : 8,
        );

        return (
          <span
            key={`compas-beat-${index}`}
            className={`absolute bottom-0 -translate-x-1/2 rounded-full transition-all duration-75 ${
              isActiveBeat ? "z-10 ring-2 ring-blue-400" : ""
            }`}
            style={{
              left: marker.leftPx,
              width: isActiveBeat && playbackHighlight ? "0.625rem" : "0.5rem",
              height:
                isActiveBeat && playbackHighlight
                  ? `${beatHeight + 4}px`
                  : `${beatHeight}px`,
              backgroundColor: beatAppearance.backgroundColor,
              border: beatAppearance.border,
            }}
          />
        );
      })}
    </div>
  );
}

type CifradoPreviewLineProps = {
  lineIndex: number;
  text: string;
  acordes: AcordePos[];
  barras: BarraCompas[];
  tipoCompas: TipoCompas;
  intensidadPlantilla: import("@/lib/metronomo").MetronomeBeatLevel[];
  showCompas: boolean;
  activeBeatAnchors?: PreviewPlaybackAnchor[];
  onMarkersReady?: (lineIndex: number, markers: CompasMarker[]) => void;
  onCharPositionsReady?: (lineIndex: number, positions: CharPosition[]) => void;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>;
};

function CifradoPreviewLine({
  lineIndex,
  text,
  acordes,
  barras,
  tipoCompas,
  intensidadPlantilla,
  showCompas,
  activeBeatAnchors = [],
  onMarkersReady,
  onCharPositionsReady,
  notacion = "es",
  cyclePiecesById,
}: CifradoPreviewLineProps) {
  const textLaneRef = useRef<HTMLDivElement>(null);
  const [charPositions, setCharPositions] = useState<CharPosition[]>([]);
  const characters = [...text];
  const extensionStart = getCompasExtensionStart(characters.length);
  const compasConfigForLine = useMemo(
    () => ({
      tipoCompas,
      intensidadPlantilla,
      bpm: 0,
      barras: [] as BarraCompas[],
    }),
    [intensidadPlantilla, tipoCompas],
  );
  const activeBeatLeftPx =
    activeBeatAnchors.find((anchor) => anchor.lineIndex === lineIndex)?.leftPx ??
    null;

  const measurePositions = useCallback(() => {
    const container = textLaneRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const spans = container.querySelectorAll("[data-char-index]");
    const positions: CharPosition[] = [];

    spans.forEach((span) => {
      const index = Number(span.getAttribute("data-char-index"));

      if (Number.isNaN(index)) {
        return;
      }

      const rect = span.getBoundingClientRect();
      const left = rect.left - containerRect.left;

      positions[index] = {
        left,
        center: left + rect.width / 2,
        bottom: rect.bottom - containerRect.top,
      };
    });

    setCharPositions(positions);
  }, []);

  useLayoutEffect(() => {
    measurePositions();
  }, [measurePositions, text, showCompas]);

  useEffect(() => {
    const container = textLaneRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      measurePositions();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [measurePositions]);

  const compasMarkers = useMemo(
    () =>
      showCompas && barras.length > 0
        ? computeLineCompasMarkersPx(
            barras,
            (barra) => getBarraBeatCount(barra, compasConfigForLine, cyclePiecesById),
            (offset) => resolveCharOffsetPx(offset, charPositions),
            (barra, beatIndex) =>
              getBarraIntensidad(barra, compasConfigForLine)[beatIndex] ??
              "medio",
          )
        : [],
    [barras, charPositions, compasConfigForLine, cyclePiecesById, showCompas],
  );

  useEffect(() => {
    onMarkersReady?.(lineIndex, compasMarkers);
  }, [compasMarkers, lineIndex, onMarkersReady]);

  useEffect(() => {
    onCharPositionsReady?.(lineIndex, charPositions);
  }, [charPositions, lineIndex, onCharPositionsReady]);

  return (
    <div ref={textLaneRef} className="relative mb-4 overflow-hidden font-mono text-sm text-letra-text">
      <div className="pointer-events-none relative flex w-full items-baseline pt-5">
        <span className="inline shrink-0">
          {characters.length === 0 ? (
            <span data-char-index={0}> </span>
          ) : (
            characters.map((char, charIndex) => (
              <span key={charIndex} data-char-index={charIndex}>
                {char}
              </span>
            ))
          )}
        </span>

        {showCompas && (
          <span
            className="ml-1 inline-flex min-h-[1.25rem] min-w-[10ch] flex-1 border-l border-dashed border-compositor-config-border bg-compositor-config-bg pl-0.5 opacity-70"
            aria-hidden="true"
          >
            {Array.from({ length: COMPAS_EXTENSION_SLOTS }).map((_, slot) => (
              <span
                key={`preview-ext-${slot}`}
                data-char-index={extensionStart + slot}
                className="inline-block min-w-[1ch] flex-1"
              >
                {" "}
              </span>
            ))}
          </span>
        )}
      </div>

      {acordes.map((acorde) => {
        const position = charPositions[acorde.charOffset];

        if (!position) {
          return null;
        }

        const dotTop = position.bottom + 2;
        const stemTop = 18;
        const stemHeight = Math.max(4, dotTop - stemTop);

        return (
          <div
            key={`preview-acorde-${lineIndex}-${acorde.charOffset}`}
            className="pointer-events-none absolute top-0"
            style={{ left: position.center }}
          >
            <span
              className={`absolute -translate-x-1/2 whitespace-nowrap rounded px-0.5 text-xs font-bold ${CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS}`}
              style={{ top: 6, left: 0 }}
            >
              {formatAcorde(acorde.noteIndex, acorde.modifier, notacion)}
            </span>
            <span
              className="absolute w-px -translate-x-1/2 bg-compositor-config/50"
              style={{ top: stemTop, left: 0, height: stemHeight }}
              aria-hidden="true"
            />
            <span
              className="absolute size-1 -translate-x-1/2 rounded-full bg-compositor-config"
              style={{ top: dotTop, left: 0 }}
              aria-hidden="true"
            />
          </div>
        );
      })}

      {compasMarkers.length > 0 && (
        <div className="mt-1.5">
          <CompasMarkersRow
            markers={compasMarkers}
            activeBeatLeftPx={activeBeatLeftPx}
            playbackHighlight={activeBeatLeftPx !== null}
            showMeasureStem={false}
          />
        </div>
      )}
    </div>
  );
}

type CifradoPreviewOverlayProps = {
  lines: string[];
  cifrado: CifradoData;
  barras: BarraCompas[];
  tipoCompas: TipoCompas;
  intensidadPlantilla: import("@/lib/metronomo").MetronomeBeatLevel[];
  showCompas: boolean;
  vistaArmado: VistaArmado;
  activeBeat: ActivePreviewBeat;
  onClose: () => void;
  notacion?: NotacionAcordes;
  cyclePiecesById?: ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>;
};

function CifradoPreviewOverlay({
  lines,
  cifrado,
  barras,
  tipoCompas,
  intensidadPlantilla,
  showCompas,
  vistaArmado,
  activeBeat,
  onClose,
  notacion = "es",
  cyclePiecesById,
}: CifradoPreviewOverlayProps) {
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const previewWidthClass =
    vistaArmado === "celular"
      ? "mx-auto w-full max-w-[390px]"
      : "mx-auto w-full max-w-3xl";

  useEffect(() => {
    if (!activeBeat) {
      return;
    }

    for (const anchor of activeBeat.anchors) {
      lineRefs.current[anchor.lineIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeBeat]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-letra-bg">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-dark px-4 py-3">
        <TapButton
          type="button"
          onClick={onClose}
          className="flex size-10 items-center justify-center rounded-full bg-bg-card text-text-primary"
          aria-label="Cerrar preview"
        >
          <X className="size-5" aria-hidden="true" />
        </TapButton>

        <h2 className={`min-w-0 flex-1 text-center text-lg font-extrabold ${CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS}`}>
          Preview
        </h2>

        <div className="size-10" aria-hidden="true" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className={`${previewWidthClass} rounded-[12px] bg-letra-bg`}>
          {lines.map((line, lineIndex) => (
            <div
              key={lineIndex}
              ref={(element) => {
                lineRefs.current[lineIndex] = element;
              }}
            >
              <CifradoPreviewLine
                lineIndex={lineIndex}
                text={line}
                acordes={cifrado.acordes.filter(
                  (acorde) => acorde.lineIndex === lineIndex,
                )}
                barras={barras.filter((barra) => barra.lineIndex === lineIndex)}
                tipoCompas={tipoCompas}
                intensidadPlantilla={intensidadPlantilla}
                showCompas={showCompas}
                activeBeatAnchors={activeBeat?.anchors}
                notacion={notacion}
                cyclePiecesById={cyclePiecesById}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorSidebarHeader({
  onClose,
  loading,
  showClose = true,
}: {
  onClose: () => void;
  loading: boolean;
  showClose?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h1 className={`min-w-0 flex-1 truncate text-left text-base font-extrabold ${CIFRADO_COMPOSITOR_ACCENT_TEXT_CLASS}`}>
        Edición de canción
      </h1>
      {showClose ? (
        <TapButton
          type="button"
          aria-label="Cerrar editor"
          onClick={onClose}
          disabled={loading}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-dark"
        >
          <X className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>
      ) : null}
    </div>
  );
}

export default function CifradoEditor({
  open,
  isLoggedIn,
  session = null,
  onClose,
  onSaved,
  presentation = "modal",
}: CifradoEditorProps) {
  const isPage = isToolPagePresentation(presentation);
  const isDesktop = useIsDesktop();
  const [phase, setPhase] = useState<EditorPhase>("ingreso");
  const [modoInsercion, setModoInsercion] = useState<ModoInsercion>("acordes");
  const [vistaArmado, setVistaArmado] = useState<VistaArmado>("pc");
  const [draftLyrics, setDraftLyrics] = useState("");
  const [lyricsText, setLyricsText] = useState("");
  const [cifrado, setCifrado] = useState<CifradoData>(createEmptyCifrado());
  const [compasConfig, setCompasConfig] = useState<CompasConfig>(
    createDefaultCompasConfig(),
  );
  const [nombre, setNombre] = useState("");
  const [artista, setArtista] = useState("");
  const [tonalidadIndex, setTonalidadIndex] = useState<NotaIndex>(7);
  const [notacion, setNotacion] = useState<NotacionAcordes>("es");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveValidation, setSaveValidation] = useState<string | null>(null);
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [lockedLines, setLockedLines] = useState<Set<number>>(new Set());
  const [lineCopyBuffer, setLineCopyBuffer] = useState<LineCopyBuffer | null>(
    null,
  );
  const [activeBeat, setActiveBeat] = useState<ActivePreviewBeat>(null);
  const [markersByLine, setMarkersByLine] = useState<
    Record<number, CompasMarker[]>
  >({});
  const [selectedBarra, setSelectedBarra] = useState<SelectedBarra | null>(
    null,
  );
  const [compasToolTab, setCompasToolTab] =
    useState<CifradoCompasToolTab>("guardado");
  const [activePlacementCycleId, setActivePlacementCycleId] = useState<
    string | null
  >(null);
  const [placementCycleCount, setPlacementCycleCount] = useState(1);
  const [lineMergePicking, setLineMergePicking] = useState(false);
  const [lineMergeDestNumber, setLineMergeDestNumber] = useState<number | null>(
    null,
  );
  const [editorHelpOpen, setEditorHelpOpen] = useState(false);
  const [mergeHighlightLineIndex, setMergeHighlightLineIndex] = useState<
    number | null
  >(null);
  const mergeHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIndexRef = useRef(0);
  const playbackBeatsRef = useRef<
    ReturnType<typeof buildDisplayedPreviewPlaybackBeats>
  >([]);
  const bpmRef = useRef(compasConfig.bpm);
  const editingCancionIdRef = useRef<number | undefined>(undefined);
  const cyclesByIdRef = useRef<ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>>(
    new Map(),
  );

  const { savedCycles, cyclesById, cyclesLoading, cyclesError, refreshCycles } =
    useCifradoCycles({
    isLoggedIn,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    enabled: open && phase === "cifrado",
  });

  useEffect(() => {
    cyclesByIdRef.current = cyclesById;
  }, [cyclesById]);

  const selectedBarraKey = selectedBarra
    ? `${selectedBarra.lineIndex}:${selectedBarra.charOffset}`
    : null;

  const intensidadEditPattern = useMemo(() => {
    if (selectedBarra) {
      const barra = compasConfig.barras.find(
        (item) =>
          item.lineIndex === selectedBarra.lineIndex &&
          item.charOffset === selectedBarra.charOffset,
      );

      if (barra) {
        return getBarraIntensidad(barra, compasConfig);
      }
    }

    return getIntensidadPlantilla(compasConfig);
  }, [compasConfig, selectedBarra]);

  const lines = useMemo(() => splitLyricsLines(lyricsText), [lyricsText]);
  const draftStats = useMemo(() => {
    const draftLines = splitLyricsLines(draftLyrics);

    return {
      total: draftLines.length,
      verses: draftLines.filter((line) => line.trim().length > 0).length,
    };
  }, [draftLyrics]);
  const hasCompas = compasConfig.barras.length > 0;

  const lineMergePreview = useMemo(() => {
    if (
      !lineMergePicking ||
      lineMergeDestNumber === null ||
      editingLineIndex === null
    ) {
      return null;
    }

    const destLineIndex = lineMergeDestNumber - 1;

    return computeLineMergePreview(
      lines,
      editingLineIndex,
      destLineIndex,
      cifrado.acordes.filter((acorde) => acorde.lineIndex === destLineIndex),
      compasConfig.barras.filter((barra) => barra.lineIndex === destLineIndex),
    );
  }, [
    lineMergePicking,
    lineMergeDestNumber,
    editingLineIndex,
    lines,
    cifrado.acordes,
    compasConfig.barras,
  ]);

  const playbackBeats = useMemo(
    () => buildDisplayedPreviewPlaybackBeats(markersByLine, lines.length),
    [lines.length, markersByLine],
  );

  useEffect(() => {
    playbackBeatsRef.current = playbackBeats;
  }, [playbackBeats]);

  useEffect(() => {
    bpmRef.current = compasConfig.bpm;
  }, [compasConfig.bpm]);

  const exitLineEditMode = useCallback(() => {
    setEditingLineIndex(null);
    setLineCopyBuffer(null);
    setPicker(null);
    setLineMergePicking(false);
    setLineMergeDestNumber(null);
  }, []);

  useEffect(() => {
    if (editingLineIndex === null) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement;

      if (target.closest("[data-line-edit-surface]")) {
        return;
      }

      if (target.closest("[data-line-edit-fab]")) {
        return;
      }

      if (target.closest("[data-line-pencil]")) {
        return;
      }

      if (target.closest("[data-line-lock]")) {
        return;
      }

      const destRow = target.closest("[data-cifrado-line]");

      if (lineCopyBuffer && destRow && editingLineIndex !== null) {
        const destIndex = Number(destRow.getAttribute("data-cifrado-line"));

        if (
          !Number.isNaN(destIndex) &&
          destIndex !== editingLineIndex &&
          !lockedLines.has(destIndex)
        ) {
          return;
        }
      }

      exitLineEditMode();
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editingLineIndex, exitLineEditMode, lineCopyBuffer, lockedLines]);

  useBodyScrollLock(open);

  useEffect(() => {
    return () => {
      if (mergeHighlightTimerRef.current) {
        clearTimeout(mergeHighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open) {
      setNotacion(readNotacionAcordesPreferida());
    }
  }, [open]);

  function handleNotacionChange(next: NotacionAcordes) {
    setNotacion(next);
    writeNotacionAcordesPreferida(next);
  }

  useHardwareBack(open, () => {
    if (previewOpen) {
      setPreviewOpen(false);
      return;
    }

    onClose();
  });

  useEffect(() => {
    if (!open) {
      editingCancionIdRef.current = undefined;
      setPhase("ingreso");
      setModoInsercion("acordes");
      setVistaArmado("pc");
      setDraftLyrics("");
      setLyricsText("");
      setCifrado(createEmptyCifrado());
      setCompasConfig(createDefaultCompasConfig());
      setNombre("");
      setArtista("");
      setTonalidadIndex(7);
      setPreviewOpen(false);
      setPicker(null);
      setLoading(false);
      setError(null);
      setSaveValidation(null);
      setToast(null);
      setTapCount(0);
      tapTimestampsRef.current = [];
      setPlaying(false);
      setEditingLineIndex(null);
      setLockedLines(new Set());
      setLineCopyBuffer(null);
      setActiveBeat(null);
      setMarkersByLine({});
      setSelectedBarra(null);
      setMergeHighlightLineIndex(null);

      if (mergeHighlightTimerRef.current) {
        clearTimeout(mergeHighlightTimerRef.current);
        mergeHighlightTimerRef.current = null;
      }

      return;
    }

    if (session) {
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
      setSelectedBarra(null);
      setTonalidadIndex(session.tonalidad_default ?? DEFAULT_TONALIDAD);
      setPhase(session.skipIngreso ? "cifrado" : "ingreso");
      setModoInsercion("acordes");
      setError(null);
      setSaveValidation(null);

      if (session.importWarnings?.length) {
        setToast(
          `Propuesta importada (${session.importWarnings.length} aviso${session.importWarnings.length === 1 ? "" : "s"}). Revisá los acordes.`,
        );
      }

      return;
    }

    editingCancionIdRef.current = undefined;
    setPhase("ingreso");
    setModoInsercion("acordes");
    setVistaArmado("pc");
    setDraftLyrics("");
    setLyricsText("");
    setCifrado(createEmptyCifrado());
    setCompasConfig(createDefaultCompasConfig());
    setNombre("");
    setArtista("");
    setTonalidadIndex(DEFAULT_TONALIDAD);
    setPreviewOpen(false);
    setPicker(null);
    setLoading(false);
    setError(null);
    setSaveValidation(null);
    setToast(null);
    setEditingLineIndex(null);
    setLockedLines(new Set());
    setLineCopyBuffer(null);
    setActiveBeat(null);
    setMarkersByLine({});
    setSelectedBarra(null);
  }, [open, session]);

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    setPlaying(false);
    setActiveBeat(null);
    playbackIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!open) {
      stopPlayback();
    }
  }, [open, stopPlayback]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  useEffect(() => {
    if (!playing) {
      if (playbackTimerRef.current !== null) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }

      return;
    }

    let cancelled = false;

    function scheduleNextBeat() {
      if (cancelled) {
        return;
      }

      const beats = playbackBeatsRef.current;

      if (beats.length === 0) {
        setPlaying(false);
        setActiveBeat(null);
        return;
      }

      const beat = beats[playbackIndexRef.current % beats.length];

      setActiveBeat({
        kind: beat.kind,
        anchors: beat.anchors,
      });
      void playCifradoPreviewBeat(beat, cyclesByIdRef.current);

      playbackIndexRef.current += 1;

      const clampedBpm = Math.max(40, Math.min(240, bpmRef.current));
      const beatDurationMs = 60000 / clampedBpm;

      playbackTimerRef.current = setTimeout(scheduleNextBeat, beatDurationMs);
    }

    scheduleNextBeat();

    return () => {
      cancelled = true;

      if (playbackTimerRef.current !== null) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [playing]);

  const handleMarkersReady = useCallback(
    (lineIndex: number, markers: CompasMarker[]) => {
      setMarkersByLine((current) => {
        const previous = current[lineIndex];

        if (
          previous &&
          previous.length === markers.length &&
          previous.every(
            (marker, index) =>
              marker.leftPx === markers[index]?.leftPx &&
              marker.kind === markers[index]?.kind &&
              marker.intensidad === markers[index]?.intensidad,
          )
        ) {
          return current;
        }

        return {
          ...current,
          [lineIndex]: markers,
        };
      });
    },
    [],
  );

  function handleTogglePlayback() {
    if (playing) {
      stopPlayback();
      return;
    }

    if (playbackBeatsRef.current.length === 0) {
      return;
    }

    playbackIndexRef.current = 0;
    setActiveBeat(null);
    setPlaying(true);
  }

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  const existingPickerAcorde = picker
    ? findAcordeAt(cifrado.acordes, picker.lineIndex, picker.charOffset)
    : undefined;

  function handleApplyLyrics() {
    const trimmed = draftLyrics.trim();

    if (!trimmed) {
      setError("Pegá la letra antes de continuar.");
      return;
    }

    setLyricsText(trimmed);
    setCifrado(createEmptyCifrado());
    setCompasConfig(createDefaultCompasConfig());
    setModoInsercion("acordes");
    setPhase("cifrado");
    setError(null);
  }

  function handleLineTextChange(lineIndex: number, newText: string) {
    setLyricsText((current) => {
      const lineArray = splitLyricsLines(current);
      lineArray[lineIndex] = newText;
      return lineArray.join("\n");
    });
  }

  function handleApplyLineCopy(targetLineIndex: number) {
    if (!lineCopyBuffer) {
      return;
    }

    const targetTextLength = lines[targetLineIndex]?.length ?? 0;
    const { sourceTextLength, kind, acordes, barras } = lineCopyBuffer;

    if (kind === "acordes" || kind === "both") {
      setCifrado((current) =>
        applyLineCopyAcordes(
          current,
          targetLineIndex,
          acordes,
          sourceTextLength,
          targetTextLength,
        ),
      );
    }

    if (kind === "compas" || kind === "both") {
      setCompasConfig((current) =>
        applyLineCopyCompas(
          current,
          targetLineIndex,
          barras,
          sourceTextLength,
          targetTextLength,
        ),
      );
    }

    setToast("Copiado al renglón");
    setLineCopyBuffer(null);
  }

  function handlePasteToLine(targetLineIndex: number) {
    if (lockedLines.has(targetLineIndex)) {
      return;
    }

    handleApplyLineCopy(targetLineIndex);
    setEditingLineIndex(null);
    setPicker(null);
  }

  function handleToggleLineEdit(lineIndex: number) {
    if (lockedLines.has(lineIndex)) {
      return;
    }

    if (
      lineCopyBuffer &&
      editingLineIndex !== null &&
      lineIndex !== editingLineIndex
    ) {
      handlePasteToLine(lineIndex);
      return;
    }

    setEditingLineIndex((current) => {
      if (current === lineIndex) {
        setLineMergePicking(false);
        setLineMergeDestNumber(null);
        return null;
      }

      setLineMergePicking(false);
      setLineMergeDestNumber(null);
      return lineIndex;
    });
    setPicker(null);
  }

  function handleToggleLineLock(lineIndex: number) {
    setLockedLines((current) => {
      const next = new Set(current);

      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }

      return next;
    });

    if (editingLineIndex === lineIndex) {
      setEditingLineIndex(null);
      setLineCopyBuffer(null);
      setPicker(null);
    }
  }

  function handleCopyLine(kind: LineCopyKind) {
    if (editingLineIndex === null) {
      return;
    }

    const acordes = cifrado.acordes.filter(
      (acorde) => acorde.lineIndex === editingLineIndex,
    );
    const barras = compasConfig.barras.filter(
      (barra) => barra.lineIndex === editingLineIndex,
    );

    if (kind === "acordes" && acordes.length === 0) {
      setToast("Este renglón no tiene acordes");
      return;
    }

    if (kind === "compas" && barras.length === 0) {
      setToast("Este renglón no tiene compás");
      return;
    }

    if (kind === "both" && acordes.length === 0 && barras.length === 0) {
      setToast("Este renglón no tiene acordes ni compás");
      return;
    }

    setLineCopyBuffer({
      kind,
      sourceTextLength: lines[editingLineIndex]?.length ?? 0,
      acordes,
      barras,
    });
    setToast("Tocá otro renglón para pegar");
  }

  function handleDeleteLine() {
    if (editingLineIndex === null) {
      return;
    }

    const lineArray = splitLyricsLines(lyricsText);

    if (lineArray.length <= 1) {
      setError("La canción debe tener al menos un renglón.");
      return;
    }

    const lineIndex = editingLineIndex;

    setLyricsText(lineArray.filter((_, index) => index !== lineIndex).join("\n"));
    setCifrado((current) => deleteCifradoLine(current, lineIndex));
    setCompasConfig((current) => deleteCompasLine(current, lineIndex));
    setLockedLines((current) => removeLockedLineIndex(current, lineIndex));
    setEditingLineIndex(null);
    setLineCopyBuffer(null);
    setError(null);
  }

  function handleInsertLineBelow() {
    if (editingLineIndex === null) {
      return;
    }

    const lineIndex = editingLineIndex;

    setLyricsText((current) => {
      const lineArray = splitLyricsLines(current);
      lineArray.splice(lineIndex + 1, 0, "");
      return lineArray.join("\n");
    });
    setCifrado((current) => insertCifradoLineBelow(current, lineIndex));
    setCompasConfig((current) => insertCompasLineBelow(current, lineIndex));
    setLockedLines((current) => insertLockedLineBelow(current, lineIndex));
    setEditingLineIndex(lineIndex + 1);
    setError(null);
  }

  function handleSetModoInsercion(modo: ModoInsercion) {
    setModoInsercion(modo);
    if (modo !== "compas") {
      setSelectedBarra(null);
    }
    exitLineEditMode();
  }

  function handleOpenPicker(
    lineIndex: number,
    charOffset: number,
    rect: DOMRect,
  ) {
    const x = Math.min(rect.left, window.innerWidth - 300);
    const y = Math.min(rect.bottom + 8, window.innerHeight - 280);

    setPicker({ lineIndex, charOffset, x, y });
  }

  function handleApplyAcorde(noteIndex: NotaIndex, modifier: Modificador) {
    if (!picker) {
      return;
    }

    setCifrado((current) =>
      upsertAcorde(current, {
        lineIndex: picker.lineIndex,
        charOffset: picker.charOffset,
        noteIndex,
        modifier,
      }),
    );
    setPicker(null);
  }

  function handleRemoveAcorde() {
    if (!picker) {
      return;
    }

    setCifrado((current) =>
      removeAcordeAt(current, picker.lineIndex, picker.charOffset),
    );
    setPicker(null);
  }

  function handleInsertBarra(lineIndex: number, charOffset: number) {
    const clampedOffset = clampCompasCharOffset(charOffset);
    const existing = compasConfig.barras.find(
      (barra) =>
        barra.lineIndex === lineIndex && barra.charOffset === clampedOffset,
    );

    if (existing) {
      if (
        selectedBarra?.lineIndex === lineIndex &&
        selectedBarra.charOffset === clampedOffset
      ) {
        setSelectedBarra(null);
      }

      setCompasConfig((current) =>
        renumberLineBarrasCompas(
          removeBarraCompasAt(current, lineIndex, clampedOffset),
          lineIndex,
        ),
      );
      return;
    }

    if (compasToolTab === "guardado" && !activePlacementCycleId) {
      setToast("Elegí un ciclo guardado en la lista.");
      return;
    }

    const textLength = lines[lineIndex]?.length ?? 0;
    const lineAcordes = cifrado.acordes.filter(
      (acorde) => acorde.lineIndex === lineIndex,
    );
    const lineBarras = compasConfig.barras.filter(
      (barra) => barra.lineIndex === lineIndex,
    );
    const contentEnd = getLineContentEndOffset(
      textLength,
      lineAcordes,
      lineBarras,
    );
    const offsets = computeEvenCompasPlacementOffsets(
      placementCycleCount,
      clampedOffset,
      contentEnd,
    );

    setCompasConfig((current) => {
      const template = resolvePlacementBarraTemplate(current);

      if (!template) {
        return current;
      }

      const next = placeCompasBarrasOnLine(
        current,
        lineIndex,
        offsets,
        template,
      );

      if (offsets.length < placementCycleCount) {
        setToast(
          `Se colocaron ${offsets.length} compases en este renglón (el espacio no alcanza para ${placementCycleCount}).`,
        );
      }

      return next;
    });
  }

  function resolvePlacementBarraTemplate(
    config: CompasConfig,
  ): Omit<BarraCompas, "lineIndex" | "charOffset" | "compasNumero"> | null {
    if (compasToolTab === "guardado" && !activePlacementCycleId) {
      return null;
    }

    const activeCycle =
      compasToolTab === "guardado" && activePlacementCycleId
        ? savedCycles.find((cycle) => cycle.id === activePlacementCycleId)
        : null;
    const golpes = activeCycle
      ? activeCycle.piece.cycleGolpes
      : getBeatCountForCompas(config.tipoCompas);
    const intensidad = buildIntensidadForGolpes(
      golpes,
      getIntensidadPlantilla(config),
    );

    return {
      tipoCompas: config.tipoCompas,
      intensidad,
      cycleId: activeCycle?.id ?? null,
    };
  }

  function handleApplyCyclesToAllLines() {
    if (compasToolTab === "guardado" && !activePlacementCycleId) {
      setToast("Elegí un ciclo guardado en la lista.");
      return;
    }

    if (lines.length === 0) {
      setToast("No hay renglones para aplicar compases.");
      return;
    }

    setSelectedBarra(null);
    setCompasConfig((current) => {
      const template = resolvePlacementBarraTemplate(current);

      if (!template) {
        return current;
      }

      let next = current;
      let shortenedLines = 0;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        const textLength = lines[lineIndex]?.length ?? 0;
        const lineAcordes = cifrado.acordes.filter(
          (acorde) => acorde.lineIndex === lineIndex,
        );
        const contentEnd = getLineContentEndOffset(textLength, lineAcordes, []);
        const offsets = computeEvenCompasPlacementOffsets(
          placementCycleCount,
          0,
          contentEnd,
        );

        next = placeCompasBarrasOnLine(next, lineIndex, offsets, template, {
          replaceExisting: true,
        });

        if (offsets.length < placementCycleCount) {
          shortenedLines += 1;
        }
      }

      if (shortenedLines > 0) {
        setToast(
          `Se aplicaron compases en ${lines.length} renglones. ${shortenedLines} renglón${shortenedLines === 1 ? "" : "es"} no alcanzó para ${placementCycleCount}.`,
        );
      } else {
        setToast(
          `Se aplicaron ${placementCycleCount} compases en ${lines.length} renglones.`,
        );
      }

      return next;
    });
  }

  function handleStartLineMerge() {
    if (editingLineIndex === null || lines.length < 2) {
      return;
    }

    setLineCopyBuffer(null);
    setMergeHighlightLineIndex(null);

    if (mergeHighlightTimerRef.current) {
      clearTimeout(mergeHighlightTimerRef.current);
      mergeHighlightTimerRef.current = null;
    }

    setLineMergePicking(true);
    setLineMergeDestNumber(editingLineIndex === 0 ? 2 : 1);
  }

  function handleCancelLineMerge() {
    setLineMergePicking(false);
    setLineMergeDestNumber(null);
  }

  function handleConfirmLineMerge() {
    if (editingLineIndex === null || lineMergeDestNumber === null) {
      return;
    }

    const sourceLineIndex = editingLineIndex;
    const destLineIndex = lineMergeDestNumber - 1;

    if (destLineIndex < 0 || destLineIndex >= lines.length) {
      setToast("Elegí un número de renglón válido.");
      return;
    }

    if (destLineIndex === sourceLineIndex) {
      setToast("Elegí un renglón distinto al actual.");
      return;
    }

    if (lockedLines.has(destLineIndex)) {
      setToast("Ese renglón está bloqueado.");
      return;
    }

    const destText = lines[destLineIndex] ?? "";
    const destAcordes = cifrado.acordes.filter(
      (acorde) => acorde.lineIndex === destLineIndex,
    );
    const destBarras = compasConfig.barras.filter(
      (barra) => barra.lineIndex === destLineIndex,
    );
    const attachOffset = getLineMergeAttachOffset(
      destText.length,
      destAcordes,
      destBarras,
    );

    const mergedLines = mergeLyricsLineInto(
      lines,
      sourceLineIndex,
      destLineIndex,
    );

    setLyricsText(mergedLines.join("\n"));
    setCifrado((current) =>
      mergeCifradoLineInto(
        current,
        sourceLineIndex,
        destLineIndex,
        attachOffset,
      ),
    );
    setCompasConfig((current) =>
      mergeCompasLineInto(
        current,
        sourceLineIndex,
        destLineIndex,
        attachOffset,
      ),
    );
    setLockedLines((current) => {
      const next = new Set<number>();

      for (const index of current) {
        if (index === sourceLineIndex) {
          continue;
        }

        let adjusted = index;

        if (sourceLineIndex < index) {
          adjusted -= 1;
        }

        next.add(adjusted);
      }

      return next;
    });

    setLineMergePicking(false);
    setLineMergeDestNumber(null);
    setEditingLineIndex(null);
    setLineCopyBuffer(null);
    setPicker(null);
    setSelectedBarra(null);

    const highlightIndex =
      sourceLineIndex < destLineIndex ? destLineIndex - 1 : destLineIndex;

    setMergeHighlightLineIndex(highlightIndex);

    if (mergeHighlightTimerRef.current) {
      clearTimeout(mergeHighlightTimerRef.current);
    }

    mergeHighlightTimerRef.current = setTimeout(() => {
      setMergeHighlightLineIndex(null);
      mergeHighlightTimerRef.current = null;
    }, 3400);

    requestAnimationFrame(() => {
      const lineElement = document.querySelector(
        `[data-cifrado-line="${highlightIndex}"]`,
      );

      lineElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    setToast(`Renglón ${sourceLineIndex + 1} unido al ${destLineIndex + 1}.`);
  }

  function handleSelectBarra(barra: BarraCompas) {
    setSelectedBarra({
      lineIndex: barra.lineIndex,
      charOffset: barra.charOffset,
    });
  }

  function handleSelectSavedPlacementCycle(cycleId: string | null) {
    setActivePlacementCycleId(cycleId);
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

        const nextPattern = cycleIntensidadSlot(
          getBarraIntensidad(barra, current),
          slotIndex,
          getBarraTipoCompas(barra, current),
        );

        return updateBarraIntensidad(
          current,
          selectedBarra.lineIndex,
          selectedBarra.charOffset,
          nextPattern,
        );
      }

      return {
        ...current,
        intensidadPlantilla: cycleIntensidadSlot(
          getIntensidadPlantilla(current),
          slotIndex,
          current.tipoCompas,
        ),
      };
    });
  }

  function handleMoveBarra(
    lineIndex: number,
    fromOffset: number,
    toOffset: number,
  ) {
    setCompasConfig((current) =>
      renumberLineBarrasCompas(
        moveBarraCompas(current, lineIndex, fromOffset, toOffset),
        lineIndex,
      ),
    );
  }

  function handleMoveAcorde(
    lineIndex: number,
    fromOffset: number,
    toOffset: number,
  ) {
    setCifrado((current) =>
      moveAcorde(current, lineIndex, fromOffset, toOffset),
    );
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
    if (!isLoggedIn) {
      setSaveValidation("Iniciá sesión para guardar en el cancionero.");
      return;
    }

    if (phase !== "cifrado") {
      setSaveValidation("Aplicá la letra y empezá a cifrar antes de guardar.");
      return;
    }

    if (!nombre.trim()) {
      setSaveValidation("Completá el nombre de la canción.");
      nombreInputRef.current?.focus();
      nombreInputRef.current?.scrollIntoView({ block: "nearest" });
      return;
    }

    if (!lyricsText.trim()) {
      setSaveValidation("La letra no puede estar vacía.");
      return;
    }

    setLoading(true);
    setError(null);
    setSaveValidation(null);

    const supabase = createClient();
    const cancionIdToSave = editingCancionIdRef.current ?? session?.cancionId;

    try {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      if (!authSession) {
        setSaveValidation("Iniciá sesión para guardar en el cancionero.");
        return;
      }

      const clampedBpm = Math.max(40, Math.min(240, compasConfig.bpm));
      const payload = {
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
        bpm_default: clampedBpm,
        tiene_cifrado_avanzado: true as const,
      };

      const editingId = cancionIdToSave;

      let savedId = editingId;

      if (editingId != null) {
        await updateCancionCifradoAvanzado(supabase, editingId, {
          nombre: payload.nombre,
          artista: payload.artista,
          letra: payload.letra,
          cifrado: payload.cifrado,
          compas_config: payload.compas_config,
          tonalidad_default: payload.tonalidad_default,
          bpm_default: payload.bpm_default,
        });
      } else {
        const { data: inserted, error: saveError } = await supabase
          .from("canciones_guardadas")
          .insert({
            sala_id: null,
            url_letra: null,
            ...payload,
          })
          .select("id")
          .single();

        if (saveError) {
          throw saveError;
        }

        savedId = inserted?.id;
      }

      setToast(editingId != null ? "Canción actualizada" : "Canción guardada");

      if (savedId == null) {
        throw new Error("No se pudo guardar la canción.");
      }

      onSaved({
        id: savedId,
        nombre: payload.nombre,
        artista: payload.artista,
        letra: payload.letra,
        tiene_cifrado_avanzado: true,
      });
      onClose();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar la canción";
      setSaveValidation(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!open && !isPage) {
    return null;
  }

  const armadoWidthClass =
    vistaArmado === "celular"
      ? "mx-auto w-full max-w-[390px]"
      : "w-full";

  const editorTree = (
    <div
      className={
        isPage
          ? "flex min-h-0 flex-1 flex-col bg-bg-app"
          : "fixed inset-0 z-50 flex flex-col bg-bg-app"
      }
    >
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className={`min-h-0 flex-1 ${
              phase === "ingreso"
                ? "flex flex-col overflow-hidden p-4 lg:overflow-hidden"
                : isDesktop
                  ? "flex flex-col overflow-hidden px-4 pb-4 pt-4"
                  : "flex flex-col overflow-y-auto p-4 lg:overflow-hidden"
            }`}
          >
            {phase === "ingreso" ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <label className={labelClassName} htmlFor="cifrado-letra-ingreso">
                  Letra (sin acordes)
                </label>
                <textarea
                  id="cifrado-letra-ingreso"
                  value={draftLyrics}
                  onChange={(event) => {
                    setDraftLyrics(event.target.value);
                    if (error) {
                      setError(null);
                    }
                  }}
                  className={`${textareaClassName} min-h-[240px] flex-1 resize-none lg:min-h-0`}
                  placeholder="Pegá aquí la letra de la canción…"
                />
                <TapButton
                  type="button"
                  onClick={handleApplyLyrics}
                  disabled={!draftLyrics.trim()}
                  className={`mt-3 px-4 py-2.5 text-sm font-bold disabled:opacity-50 lg:hidden ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
                >
                  Aplicar y empezar a cifrar
                </TapButton>
              </div>
            ) : (
              <div
                className={`relative flex min-h-0 w-full flex-1 flex-col ${
                  isDesktop ? CIFRADO_EDITOR_PC_SHELL_CLASS : ""
                }`}
                onWheel={isDesktop ? forwardVerticalWheel : undefined}
              >
                {isDesktop ? (
                  <CifradoEditorPcToolbar
                    modoInsercion={modoInsercion}
                    onSetModoInsercion={handleSetModoInsercion}
                    hasCompas={hasCompas}
                    playing={playing}
                    onTogglePlayback={handleTogglePlayback}
                    compasToolTab={compasToolTab}
                    onCompasToolTabChange={setCompasToolTab}
                    tipoCompas={compasConfig.tipoCompas}
                    onTipoCompasChange={(tipo) =>
                      setCompasConfig((current) =>
                        resizeCompasConfigIntensidad(current, tipo),
                      )
                    }
                    intensidadPattern={intensidadEditPattern}
                    onCycleIntensidadSlot={handleCycleIntensidadSlot}
                    showClearIntensidadSelection={Boolean(selectedBarra)}
                    onClearIntensidadSelection={() => setSelectedBarra(null)}
                    activeCycleId={activePlacementCycleId}
                    savedCycles={savedCycles}
                    cyclesLoading={cyclesLoading}
                    cyclesError={cyclesError}
                    onRefreshCycles={refreshCycles}
                    onSelectSavedCycle={handleSelectSavedPlacementCycle}
                    placementCycleCount={placementCycleCount}
                    onPlacementCycleCountChange={setPlacementCycleCount}
                    onApplyCyclesToAllLines={handleApplyCyclesToAllLines}
                    onOpenHelp={() => setEditorHelpOpen(true)}
                  />
                ) : (
                  <div className="mb-2 shrink-0">
                    <div className="flex items-start justify-between gap-x-3 gap-y-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-3 gap-y-2">
                        <div
                          className={CIFRADO_EDITOR_TOOLBAR_SEGMENTED_CLASS}
                          role="tablist"
                          aria-label="Modo edición"
                        >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={modoInsercion === "acordes"}
                              onClick={() => handleSetModoInsercion("acordes")}
                              className={cifradoEditorToolbarSegmentedButtonClass(
                                modoInsercion === "acordes",
                              )}
                            >
                              Acordes
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={modoInsercion === "compas"}
                              onClick={() => handleSetModoInsercion("compas")}
                              className={cifradoEditorToolbarSegmentedButtonClass(
                                modoInsercion === "compas",
                              )}
                            >
                              Compás
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={modoInsercion === "letra"}
                              onClick={() => handleSetModoInsercion("letra")}
                              className={cifradoEditorToolbarSegmentedButtonClass(
                                modoInsercion === "letra",
                              )}
                            >
                            Letra
                          </button>
                        </div>

                        {modoInsercion === "compas" ? (
                          <div className={CIFRADO_EDITOR_COMPAS_PANEL_CLASS}>
                            <CifradoCompasToolPanel
                              tab={compasToolTab}
                              onTabChange={setCompasToolTab}
                              tipoCompas={compasConfig.tipoCompas}
                              onTipoCompasChange={(tipo) =>
                                setCompasConfig((current) =>
                                  resizeCompasConfigIntensidad(current, tipo),
                                )
                              }
                              intensidadPattern={intensidadEditPattern}
                              onCycleIntensidadSlot={handleCycleIntensidadSlot}
                              showClearIntensidadSelection={Boolean(selectedBarra)}
                              onClearIntensidadSelection={() => setSelectedBarra(null)}
                              activeCycleId={activePlacementCycleId}
                              savedCycles={savedCycles}
                              cyclesLoading={cyclesLoading}
                              cyclesError={cyclesError}
                              onRefreshCycles={refreshCycles}
                              onSelectSavedCycle={handleSelectSavedPlacementCycle}
                              placementCycleCount={placementCycleCount}
                              onPlacementCycleCountChange={setPlacementCycleCount}
                              onApplyCyclesToAllLines={handleApplyCyclesToAllLines}
                            />
                          </div>
                        ) : null}
                      </div>

                      <div className="ml-auto flex shrink-0 items-center gap-2">
                        <CifradoEditorHelpButton onClick={() => setEditorHelpOpen(true)} />

                        {hasCompas ? (
                          <TapButton
                            type="button"
                            onClick={handleTogglePlayback}
                            className={`shrink-0 ${CIFRADO_EDITOR_PLAY_BUTTON_CLASS}`}
                            aria-label={playing ? "Pausar compás" : "Reproducir compás"}
                          >
                            {playing ? (
                              <Pause className="size-5" aria-hidden="true" />
                            ) : (
                              <Play className="size-5" aria-hidden="true" />
                            )}
                          </TapButton>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                <div className={`relative flex min-h-0 flex-1 flex-col ${armadoWidthClass}`}>
                <div
                  className={`relative flex min-h-0 flex-1 flex-col overflow-hidden ${
                    isDesktop
                      ? `rounded-b-[12px] ${CIFRADO_EDITOR_SHEET_BG_CLASS}`
                      : `rounded-[12px] ${CIFRADO_EDITOR_SHEET_BG_CLASS}`
                  }`}
                  onWheel={forwardVerticalWheel}
                >
                <div
                  data-tool-vertical-scroll=""
                  className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2 touch-pan-y"
                >
                  {lines.map((line, lineIndex) => {
                    const isEditing = editingLineIndex === lineIndex;
                    const isMergeDestination =
                      lineMergePicking &&
                      lineMergeDestNumber !== null &&
                      lineMergeDestNumber === lineIndex + 1 &&
                      lineIndex !== editingLineIndex;
                    const isMergeHighlight =
                      mergeHighlightLineIndex === lineIndex;

                    return (
                      <div
                        key={lineIndex}
                        data-cifrado-line={lineIndex}
                        {...(isEditing ? { "data-line-edit-surface": "" } : {})}
                        onClick={(event) => {
                          if (
                            !lineCopyBuffer ||
                            editingLineIndex === null ||
                            lineIndex === editingLineIndex ||
                            lockedLines.has(lineIndex)
                          ) {
                            return;
                          }

                          const target = event.target as HTMLElement;

                          if (
                            target.closest("[data-line-edit-fab]") ||
                            target.closest("[data-line-pencil]") ||
                            target.closest("[data-line-lock]")
                          ) {
                            return;
                          }

                          handlePasteToLine(lineIndex);
                        }}
                      >
                        <CifradoLineEditor
                          lineIndex={lineIndex}
                          text={line}
                          acordes={cifrado.acordes.filter(
                            (acorde) => acorde.lineIndex === lineIndex,
                          )}
                          barras={compasConfig.barras.filter(
                            (barra) => barra.lineIndex === lineIndex,
                          )}
                          modoAvanzado
                          modoInsercion={modoInsercion}
                          tipoCompas={compasConfig.tipoCompas}
                          intensidadPlantilla={getIntensidadPlantilla(compasConfig)}
                          selectedBarraKey={selectedBarraKey}
                          activeBeatAnchors={activeBeat?.anchors}
                          isLineEditing={isEditing}
                          lineNumber={lineIndex + 1}
                          isMergeDestination={isMergeDestination}
                          isMergeHighlight={isMergeHighlight}
                          mergePreview={
                            isMergeDestination ? lineMergePreview : null
                          }
                          isLineLocked={lockedLines.has(lineIndex)}
                          isDimmed={
                            editingLineIndex !== null &&
                            editingLineIndex !== lineIndex &&
                            !(
                              lineMergePicking &&
                              lineMergeDestNumber === lineIndex + 1
                            ) &&
                            !isMergeHighlight
                          }
                          hasLineCopyPending={
                            lineCopyBuffer !== null &&
                            editingLineIndex !== null &&
                            editingLineIndex !== lineIndex
                          }
                          onToggleLineEdit={() =>
                            handleToggleLineEdit(lineIndex)
                          }
                          onToggleLineLock={() =>
                            handleToggleLineLock(lineIndex)
                          }
                          onOpenPicker={handleOpenPicker}
                          onInsertBarra={handleInsertBarra}
                          onSelectBarra={handleSelectBarra}
                          onMoveAcorde={handleMoveAcorde}
                          onMoveBarra={handleMoveBarra}
                          cyclePiecesById={cyclesById}
                          onLineTextChange={handleLineTextChange}
                          onMarkersReady={handleMarkersReady}
                          notacion={notacion}
                        />

                        {isEditing && (
                          <LineEditFabBar
                            hasLineCopyPending={lineCopyBuffer !== null}
                            lineMergePicking={lineMergePicking}
                            lineMergeDestNumber={lineMergeDestNumber}
                            mergePreview={lineMergePreview}
                            sourceLineNumber={lineIndex + 1}
                            totalLines={lines.length}
                            onLineMergeDestNumberChange={setLineMergeDestNumber}
                            onStartLineMerge={handleStartLineMerge}
                            onConfirmLineMerge={handleConfirmLineMerge}
                            onCancelLineMerge={handleCancelLineMerge}
                            onDelete={handleDeleteLine}
                            onInsertBelow={handleInsertLineBelow}
                            onCopy={handleCopyLine}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              </div>
              </div>
            )}

            {error && phase !== "ingreso" && (
              <p className="mx-auto mt-3 max-w-3xl shrink-0 text-sm text-[var(--tuner-lejos)]">
                {error}
              </p>
            )}
          </div>
        </div>

        {phase === "cifrado" && (
          <aside className="flex w-full shrink-0 flex-col border-t border-border bg-bg-card lg:w-80 lg:border-l lg:border-t-0 lg:bg-[color-mix(in_srgb,var(--compositor-config)_5%,var(--bg-card))]">
            <EditorSidebarHeader
              onClose={onClose}
              loading={loading}
              showClose={!isPage}
            />

            <div
              data-tool-vertical-scroll=""
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y"
            >
              <div className="space-y-3 p-3">
                <VozPcConfigCard title="Vista previa">
                  <div className={CIFRADO_CONTROLS_SEGMENTED_CLASS}>
                    <button
                      type="button"
                      onClick={() => setVistaArmado("pc")}
                      className={cifradoSegmentedIconButtonClass(vistaArmado === "pc")}
                    >
                      <Monitor className="size-3.5" aria-hidden="true" />
                      PC
                    </button>
                    <button
                      type="button"
                      onClick={() => setVistaArmado("celular")}
                      className={cifradoSegmentedIconButtonClass(vistaArmado === "celular")}
                    >
                      <Smartphone className="size-3.5" aria-hidden="true" />
                      Cel.
                    </button>
                  </div>

                  <TapButton
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className={`mt-3 ${CIFRADO_CONTROLS_SECONDARY_BUTTON_CLASS}`}
                  >
                    Preview
                  </TapButton>
                </VozPcConfigCard>
              </div>

              <div className="space-y-3 px-3 pb-3">
                <VozPcConfigCard title="Canción">
                  <label
                    className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
                    htmlFor="cifrado-nombre"
                  >
                    Nombre *
                  </label>
                  <input
                    id="cifrado-nombre"
                    ref={nombreInputRef}
                    value={nombre}
                    onChange={(event) => {
                      setNombre(event.target.value);
                      if (saveValidation) {
                        setSaveValidation(null);
                      }
                    }}
                    className={inputClassName}
                    placeholder="Nombre de la canción"
                  />
                  <label
                    className={`${CIFRADO_CONTROLS_SECTION_LABEL_CLASS} mt-4`}
                    htmlFor="cifrado-artista"
                  >
                    Artista
                  </label>
                  <input
                    id="cifrado-artista"
                    value={artista}
                    onChange={(event) => setArtista(event.target.value)}
                    className={inputClassName}
                    placeholder="Artista"
                  />
                </VozPcConfigCard>

                {notacion !== "numero" && (
                  <VozPcConfigCard title="Tonalidad">
                    <select
                      id="cifrado-tonalidad-sidebar"
                      value={tonalidadIndex}
                      onChange={(event) =>
                        setTonalidadIndex(Number(event.target.value) as NotaIndex)
                      }
                      className={inputClassName}
                    >
                      {NOTA_INDICES.map((index) => (
                        <option key={index} value={index}>
                          {getNotaLabel(index, notacion)}
                        </option>
                      ))}
                    </select>
                  </VozPcConfigCard>
                )}

                <VozPcConfigCard title="Tempo">
                  <label
                    className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
                    htmlFor="cifrado-bpm-sidebar"
                  >
                    BPM
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="cifrado-bpm-sidebar"
                      type="number"
                      min={40}
                      max={240}
                      value={compasConfig.bpm}
                      onChange={(event) =>
                        setCompasConfig((current) => ({
                          ...current,
                          bpm: Number(event.target.value) || current.bpm,
                        }))
                      }
                      className={`${inputClassName} min-w-0 flex-1 text-center`}
                    />
                    <TapButton
                      type="button"
                      onClick={handleTapTempo}
                      className="min-w-[5.25rem] shrink-0 rounded-[10px] border border-border bg-bg-card px-4 text-xs font-semibold text-text-secondary"
                    >
                      Tap{tapCount > 0 ? ` (${tapCount})` : ""}
                    </TapButton>
                  </div>
                  <CifradoNotacionToggle
                    notacion={notacion}
                    onChange={handleNotacionChange}
                    embedded
                  />
                </VozPcConfigCard>
              </div>
            </div>

            <div className="border-t border-border p-3">
              {saveValidation && (
                <p
                  className="mb-3 rounded-lg border border-[var(--tuner-lejos)]/40 bg-[var(--tuner-lejos)]/10 px-3 py-2 text-sm text-[var(--tuner-lejos)]"
                  role="alert"
                >
                  {saveValidation}
                </p>
              )}
              <TapButton
                type="button"
                onClick={() => void handleSave()}
                disabled={loading || phase !== "cifrado"}
                className={`w-full ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
              >
                {loading ? "Guardando…" : "Guardar"}
              </TapButton>
            </div>
          </aside>
        )}

        {phase === "ingreso" && (
          <aside className="flex w-full shrink-0 flex-col border-t border-border bg-bg-card lg:w-80 lg:border-l lg:border-t-0">
            <EditorSidebarHeader
              onClose={onClose}
              loading={loading}
              showClose={!isPage}
            />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
                <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
                  Datos de la canción
                </p>
                <label
                  className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}
                  htmlFor="cifrado-nombre-ingreso"
                >
                  Nombre
                </label>
                <input
                  id="cifrado-nombre-ingreso"
                  ref={nombreInputRef}
                  value={nombre}
                  onChange={(event) => {
                    setNombre(event.target.value);
                    if (saveValidation) {
                      setSaveValidation(null);
                    }
                  }}
                  className={inputClassName}
                  placeholder="Nombre de la canción"
                />
                <label
                  className={`${CIFRADO_CONTROLS_SECTION_LABEL_CLASS} mt-4`}
                  htmlFor="cifrado-artista-ingreso"
                >
                  Artista
                </label>
                <input
                  id="cifrado-artista-ingreso"
                  value={artista}
                  onChange={(event) => setArtista(event.target.value)}
                  className={inputClassName}
                  placeholder="Artista"
                />
              </div>

              <div className={CIFRADO_CONTROLS_PANEL_BOX_CLASS}>
                <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
                  Vista previa
                </p>
                {draftLyrics.trim() ? (
                  <>
                    <p className="mt-2 text-sm font-medium text-text-primary">
                      {draftStats.verses} versos · {draftStats.total} renglones
                    </p>
                    <p className="mt-2 line-clamp-5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-text-muted">
                      {draftLyrics.trim()}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">
                    Pegá la letra a la izquierda para ver un resumen acá.
                  </p>
                )}
              </div>

              <div>
                <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>Consejos</p>
                <ul className="space-y-2 text-xs leading-relaxed text-text-muted">
                  <li>· Un renglón por verso; líneas vacías entre estrofas.</li>
                  <li>· Pegá solo la letra, sin acordes (los agregás después).</li>
                  <li>· Podés completar nombre y artista ahora o al guardar.</li>
                </ul>
              </div>

              {error && (
                <p
                  className="rounded-lg border border-[var(--tuner-lejos)]/40 bg-[var(--tuner-lejos)]/10 px-3 py-2 text-sm text-[var(--tuner-lejos)]"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </div>

            <div className="hidden shrink-0 border-t border-border p-4 lg:block">
              <TapButton
                type="button"
                onClick={handleApplyLyrics}
                disabled={!draftLyrics.trim()}
                className={`w-full ${CIFRADO_EDITOR_PRIMARY_BUTTON_CLASS}`}
              >
                Aplicar y empezar a cifrar
              </TapButton>
            </div>
          </aside>
        )}
      </div>

      {previewOpen && (
        <CifradoPreviewOverlay
          lines={lines}
          cifrado={cifrado}
          barras={compasConfig.barras}
          tipoCompas={compasConfig.tipoCompas}
          intensidadPlantilla={getIntensidadPlantilla(compasConfig)}
          showCompas={hasCompas}
          vistaArmado={vistaArmado}
          activeBeat={activeBeat}
          onClose={() => setPreviewOpen(false)}
          notacion={notacion}
          cyclePiecesById={cyclesById}
        />
      )}

      {picker && (
        <ChordPicker
          state={picker}
          existing={existingPickerAcorde}
          tonalidadIndex={tonalidadIndex}
          notacion={notacion}
          onApply={handleApplyAcorde}
          onRemove={handleRemoveAcorde}
          onClose={() => setPicker(null)}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-lg bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      <CifradoEditorHelpModal
        open={editorHelpOpen}
        onClose={() => setEditorHelpOpen(false)}
      />
    </div>
  );

  if (isPage) {
    return editorTree;
  }

  return createPortal(editorTree, document.body);
}
