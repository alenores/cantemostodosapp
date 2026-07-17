"use client";

import {
  CifradoLyricsBlock,
  splitLyricsLines,
} from "@/components/cifrado/CifradoLyricsView";
import CifradoSettingsFields, {
  type CifradoSettingsFieldsProps,
} from "@/components/cifrado/CifradoSettingsFields";
import AutoScrollControl from "@/components/home/AutoScrollControl";
import LetraTexto from "@/components/salas/LetraTexto";
import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import {
  computeTapBpm,
  transponerCifrado,
  type CompasMarker,
  type NotaIndex,
} from "@/lib/cifrado";
import { DEFAULT_MODO_TONAL, type ModoTonal } from "@/lib/cifrado-escala";
import {
  readNotacionAcordesPreferida,
  writeNotacionAcordesPreferida,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import {
  buildDisplayedPreviewPlaybackBeats,
} from "@/lib/cifrado-preview-play";
import { playCifradoPreviewBeat } from "@/lib/cifrado-cycle-playback";
import { useCifradoCycles } from "@/hooks/useCifradoCycles";
import {
  computeCifradoPlaybackScrollTop,
  getActivePlaybackLineIndex,
} from "@/lib/cifrado-playback-scroll";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import { ChevronLeft, Pause, Play, SlidersHorizontal, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type ActivePreviewBeat = {
  kind: CompasMarker["kind"];
  anchors: { lineIndex: number; leftPx: number }[];
} | null;

type ViewerMode = "standard" | "cifrado-sin-compas" | "cifrado-con-compas";

type CifradoViewerModalProps = {
  open: boolean;
  cancion: CancionCancionero | CancionCifradoDetalle | null;
  cifradoDetalle?: CancionCifradoDetalle | null;
  onClose: () => void;
};

const SETTINGS_CHIP_CLASS =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";

function isCifradoDetalle(
  cancion: CancionCancionero | CancionCifradoDetalle,
): cancion is CancionCifradoDetalle {
  return "cifrado" in cancion;
}

function resolveDetalle(
  cancion: CancionCancionero | CancionCifradoDetalle | null,
  explicit: CancionCifradoDetalle | null | undefined,
): CancionCifradoDetalle | null {
  if (!cancion?.tiene_cifrado_avanzado) {
    return null;
  }

  if (explicit && explicit.id === cancion.id) {
    return explicit;
  }

  if (isCifradoDetalle(cancion)) {
    return cancion;
  }

  return null;
}

type CifradoSettingsPanelProps = CifradoSettingsFieldsProps;

type CifradoSettingsSidebarProps = CifradoSettingsPanelProps & {
  onClose: () => void;
};

function CifradoSettingsSidebar({
  onClose,
  ...fields
}: CifradoSettingsSidebarProps) {
  return (
    <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-border bg-bg-card lg:flex">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-text-primary">Ajustes</h2>
        <TapButton
          type="button"
          aria-label="Cerrar ajustes"
          onClick={onClose}
          className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
        >
          <X className="size-4 text-text-primary" aria-hidden="true" />
        </TapButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <CifradoSettingsFields {...fields} />
      </div>
    </aside>
  );
}

type CifradoSettingsSheetProps = CifradoSettingsPanelProps & {
  open: boolean;
  onClose: () => void;
};

function CifradoSettingsSheet({
  open,
  onClose,
  ...fields
}: CifradoSettingsSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[360] flex flex-col justify-end lg:hidden">
      <button
        type="button"
        aria-label="Cerrar ajustes"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className="relative z-10 max-h-[min(70vh,520px)] overflow-y-auto rounded-t-amplio border border-border bg-bg-card px-4 pt-4 shadow-xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-text-primary">Ajustes</h2>
          <TapButton
            type="button"
            aria-label="Cerrar ajustes"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
          >
            <X className="size-4 text-text-primary" aria-hidden="true" />
          </TapButton>
        </div>

        <CifradoSettingsFields {...fields} />
      </div>
    </div>
  );
}

export default function CifradoViewerModal({
  open,
  cancion,
  cifradoDetalle = null,
  onClose,
}: CifradoViewerModalProps) {
  const [notacion, setNotacion] = useState<NotacionAcordes>("es");
  const [tonalidadIndex, setTonalidadIndex] = useState<NotaIndex>(7);
  const [modoTonal, setModoTonal] = useState<ModoTonal>(DEFAULT_MODO_TONAL);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeBeat, setActiveBeat] = useState<ActivePreviewBeat>(null);
  const [markersByLine, setMarkersByLine] = useState<
    Record<number, CompasMarker[]>
  >({});
  const [tapCount, setTapCount] = useState(0);

  const tapTimestampsRef = useRef<number[]>([]);
  const tapResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackIndexRef = useRef(0);
  const playbackBeatsRef = useRef<
    ReturnType<typeof buildDisplayedPreviewPlaybackBeats>
  >([]);
  const bpmRef = useRef(bpm);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const cyclesByIdRef = useRef<
    ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>
  >(new Map());

  const detalle = useMemo(
    () => resolveDetalle(cancion, cifradoDetalle),
    [cancion, cifradoDetalle],
  );

  const compasConfig = detalle?.compas_config;
  const showCompas = Boolean(compasConfig?.barras?.length);

  const { cyclesById } = useCifradoCycles({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    enabled: open && showCompas,
  });

  useEffect(() => {
    cyclesByIdRef.current = cyclesById;
  }, [cyclesById]);
  const tipoCompas = compasConfig?.tipoCompas ?? "4-4";
  const barras = compasConfig?.barras ?? [];

  const tieneLetra = Boolean(cancion?.letra?.trim());
  const loadingCifrado =
    Boolean(cancion?.tiene_cifrado_avanzado) && !detalle && open;

  const viewerMode: ViewerMode = !cancion?.tiene_cifrado_avanzado
    ? "standard"
    : showCompas
      ? "cifrado-con-compas"
      : "cifrado-sin-compas";

  const showAutoScroll =
    viewerMode === "standard" || viewerMode === "cifrado-sin-compas";
  const showSettingsButton = viewerMode !== "standard";
  const showPlayButton = viewerMode === "cifrado-con-compas";

  const {
    autoScrollLevel,
    accelerate: accelerateAutoScroll,
    decelerate: decelerateAutoScroll,
    reset: resetAutoScroll,
  } = useLetraAutoScroll(scrollRef, {
    enabled: open && showAutoScroll && tieneLetra,
    contentKey: cancion?.id ?? null,
  });

  useBodyScrollLock(open);
  useHardwareBack(open, () => {
    if (settingsOpen) {
      setSettingsOpen(false);
      return;
    }

    onClose();
  });

  useEffect(() => {
    if (open) {
      setNotacion(readNotacionAcordesPreferida());
    } else {
      setSettingsOpen(false);
    }
  }, [open]);

  function handleNotacionChange(next: NotacionAcordes) {
    setNotacion(next);
    writeNotacionAcordesPreferida(next);
  }

  useEffect(() => {
    if (!detalle) {
      return;
    }

    setTonalidadIndex(detalle.tonalidad_default);
    setModoTonal(detalle.modo_tonal_default ?? DEFAULT_MODO_TONAL);
    setBpm(detalle.bpm_default);
    setPlaying(false);
    setActiveBeat(null);
    setMarkersByLine({});
    lineRefs.current = {};
  }, [detalle?.id, detalle]);

  useEffect(() => {
    if (!open || !cancion) {
      return;
    }

    resetAutoScroll();
    setPlaying(false);
    setActiveBeat(null);
    setSettingsOpen(false);
    scrollRef.current?.scrollTo(0, 0);
  }, [cancion?.id, open, resetAutoScroll]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const lines = useMemo(
    () => splitLyricsLines(detalle?.letra ?? cancion?.letra ?? ""),
    [cancion?.letra, detalle?.letra],
  );

  const semitonosTransposicion = detalle
    ? tonalidadIndex - detalle.tonalidad_default
    : 0;

  const cifradoDisplay = useMemo(() => {
    if (!detalle) {
      return null;
    }

    if (semitonosTransposicion === 0) {
      return detalle.cifrado;
    }

    return transponerCifrado(detalle.cifrado, semitonosTransposicion);
  }, [detalle, semitonosTransposicion]);

  const playbackBeats = useMemo(
    () => buildDisplayedPreviewPlaybackBeats(markersByLine, lines.length),
    [lines.length, markersByLine],
  );

  const activePlaybackLineIndex = useMemo(() => {
    if (!playing || !activeBeat) {
      return null;
    }

    return getActivePlaybackLineIndex(activeBeat.anchors);
  }, [activeBeat, playing]);

  const handleLineRef = useCallback(
    (lineIndex: number, element: HTMLDivElement | null) => {
      lineRefs.current[lineIndex] = element;
    },
    [],
  );

  useEffect(() => {
    if (!playing || activePlaybackLineIndex === null) {
      return;
    }

    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      return;
    }

    const lineOffsets = lines.map((_, lineIndex) => {
      const lineEl = lineRefs.current[lineIndex];

      if (!lineEl) {
        return 0;
      }

      return lineEl.offsetTop;
    });

    const targetScrollTop = computeCifradoPlaybackScrollTop(
      activePlaybackLineIndex,
      lineOffsets,
    );

    scrollEl.scrollTo({
      top: targetScrollTop,
      behavior: "smooth",
    });
  }, [activePlaybackLineIndex, lines.length, playing]);

  useEffect(() => {
    playbackBeatsRef.current = playbackBeats;
  }, [playbackBeats]);

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    setActiveBeat(null);

    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
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

      if (playbackIndexRef.current >= beats.length) {
        setPlaying(false);
        setActiveBeat(null);
        return;
      }

      const beat = beats[playbackIndexRef.current];

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
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setPlaying(true);
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
      setBpm(nextBpm);
    }
  }

  if (!open || !cancion) {
    return null;
  }

  const activeBeatAnchors = activeBeat?.anchors ?? [];
  const canPlay = showCompas && playbackBeats.length > 0;
  const settingsPanelOpen = settingsOpen && Boolean(detalle);
  const settingsPanelProps = {
    showCompas,
    notacion,
    tonalidadIndex,
    modoTonal,
    bpm,
    tapCount,
    onNotacionChange: handleNotacionChange,
    onTonalidadChange: setTonalidadIndex,
    onModoTonalChange: setModoTonal,
    onBpmChange: setBpm,
    onTapTempo: handleTapTempo,
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[350] flex flex-col bg-bg-app">
        <header className="flex shrink-0 items-center gap-3 border-b border-border bg-bg-dark px-4 py-3">
          <TapButton
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-text-secondary"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Volver
          </TapButton>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-lg font-extrabold text-accent">
              {cancion.nombre}
            </h1>
            {cancion.artista && (
              <p className="truncate text-xs text-text-muted">
                {cancion.artista}
              </p>
            )}
          </div>

          <div className="w-[4.5rem] shrink-0" aria-hidden="true" />
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto bg-letra-bg px-4 py-5"
          >
            {loadingCifrado ? (
              <p className="py-8 text-center text-sm text-text-muted">
                Cargando cifrado…
              </p>
            ) : cifradoDisplay && cancion.letra ? (
              <div className="mx-auto max-w-3xl lg:max-w-5xl">
                <CifradoLyricsBlock
                  letra={cancion.letra ?? ""}
                  acordes={cifradoDisplay.acordes}
                  barras={barras}
                  lineTerminalOffsets={compasConfig?.lineTerminalOffsets}
                  tipoCompas={tipoCompas}
                  showCompas={showCompas}
                  activeBeatAnchors={activeBeatAnchors}
                  activePlaybackLineIndex={activePlaybackLineIndex}
                  onMarkersReady={handleMarkersReady}
                  onLineRef={handleLineRef}
                  letraSheet
                  notacion={notacion}
                  cyclePiecesById={cyclesById}
                />
              </div>
            ) : tieneLetra ? (
              <LetraTexto texto={cancion.letra!} edgeToEdge />
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                Esta canción no tiene letra guardada.
              </p>
            )}
          </div>

          {settingsPanelOpen ? (
            <CifradoSettingsSidebar
              {...settingsPanelProps}
              onClose={() => setSettingsOpen(false)}
            />
          ) : null}
        </div>

        <footer className="shrink-0 border-t border-border bg-bg-dark px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {showAutoScroll ? (
              <AutoScrollControl
                placement="inline"
                level={autoScrollLevel}
                enabled={tieneLetra}
                onAccelerate={accelerateAutoScroll}
                onDecelerate={decelerateAutoScroll}
              />
            ) : null}

            {showPlayButton ? (
              <TapButton
                type="button"
                onClick={handleTogglePlayback}
                disabled={!canPlay}
                aria-label={playing ? "Pausar compás" : "Reproducir compás"}
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
              >
                {playing ? (
                  <Pause className="size-5" aria-hidden="true" />
                ) : (
                  <Play className="size-5 fill-current" aria-hidden="true" />
                )}
              </TapButton>
            ) : null}

            {showSettingsButton ? (
              <TapButton
                type="button"
                aria-label={
                  settingsPanelOpen
                    ? "Ocultar ajustes de cifrado"
                    : "Mostrar ajustes de cifrado"
                }
                aria-pressed={settingsPanelOpen}
                onClick={() => setSettingsOpen((open) => !open)}
                className={`flex size-9 shrink-0 items-center justify-center ${SETTINGS_CHIP_CLASS}${
                  settingsPanelOpen ? " ring-1 ring-accent/60" : ""
                }`}
              >
                <SlidersHorizontal
                  className="size-4 text-accent"
                  aria-hidden="true"
                />
              </TapButton>
            ) : null}
          </div>
        </footer>
      </div>

      <CifradoSettingsSheet
        open={settingsPanelOpen}
        {...settingsPanelProps}
        onClose={() => setSettingsOpen(false)}
      />
    </>,
    document.body,
  );
}
