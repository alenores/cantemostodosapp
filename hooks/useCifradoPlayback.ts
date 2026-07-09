"use client";

import { splitLyricsLines } from "@/components/cifrado/CifradoLyricsView";
import {
  computeTapBpm,
  transponerCifrado,
  type CompasMarker,
  type NotaIndex,
} from "@/lib/cifrado";
import { DEFAULT_MODO_TONAL, type ModoTonal } from "@/lib/cifrado-escala";
import {
  buildDisplayedPreviewPlaybackBeats,
} from "@/lib/cifrado-preview-play";
import { playCifradoPreviewBeat } from "@/lib/cifrado-cycle-playback";
import { useCifradoCycles } from "@/hooks/useCifradoCycles";
import {
  computeCifradoPlaybackScrollTop,
  getActivePlaybackLineIndex,
} from "@/lib/cifrado-playback-scroll";
import {
  readNotacionAcordesPreferida,
  writeNotacionAcordesPreferida,
  type NotacionAcordes,
} from "@/lib/notacion-acordes";
import type { CancionCifradoDetalle } from "@/types";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

type ActivePreviewBeat = {
  kind: CompasMarker["kind"];
  anchors: { lineIndex: number; leftPx: number }[];
} | null;

type UseCifradoPlaybackOptions = {
  detalle: CancionCifradoDetalle | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  enabled: boolean;
};

export function useCifradoPlayback({
  detalle,
  scrollRef,
  enabled,
}: UseCifradoPlaybackOptions) {
  const [notacion, setNotacion] = useState<NotacionAcordes>("es");
  const [tonalidadIndex, setTonalidadIndex] = useState<NotaIndex>(7);
  const [modoTonal, setModoTonal] = useState<ModoTonal>(DEFAULT_MODO_TONAL);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
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
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const cyclesByIdRef = useRef<
    ReadonlyMap<string, import("@/lib/compositor").CompositorPiece>
  >(new Map());

  const { cyclesById } = useCifradoCycles({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    enabled,
  });

  useEffect(() => {
    cyclesByIdRef.current = cyclesById;
  }, [cyclesById]);

  const lines = useMemo(
    () => splitLyricsLines(detalle?.letra ?? ""),
    [detalle?.letra],
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

  const activeBeatAnchors = activeBeat?.anchors ?? [];
  const canPlay = enabled && playbackBeats.length > 0;

  const activePlaybackLineIndex = useMemo(() => {
    if (!playing || !activeBeat) {
      return null;
    }

    return getActivePlaybackLineIndex(activeBeat.anchors);
  }, [activeBeat, playing]);

  useEffect(() => {
    setNotacion(readNotacionAcordesPreferida());
  }, [detalle?.id]);

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
    bpmRef.current = bpm;
  }, [bpm]);

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
    if (!enabled) {
      stopPlayback();
    }
  }, [enabled, stopPlayback]);

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
  }, [activePlaybackLineIndex, lines.length, playing, scrollRef]);

  const handleNotacionChange = useCallback((next: NotacionAcordes) => {
    setNotacion(next);
    writeNotacionAcordesPreferida(next);
  }, []);

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

  const handleLineRef = useCallback(
    (lineIndex: number, element: HTMLDivElement | null) => {
      lineRefs.current[lineIndex] = element;
    },
    [],
  );

  const handleTogglePlayback = useCallback(() => {
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
  }, [playing, scrollRef, stopPlayback]);

  const handleTapTempo = useCallback(() => {
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
  }, []);

  return {
    notacion,
    tonalidadIndex,
    modoTonal,
    bpm,
    tapCount,
    playing,
    canPlay,
    cifradoDisplay,
    activeBeatAnchors,
    activePlaybackLineIndex,
    handleNotacionChange,
    handleTonalidadChange: setTonalidadIndex,
    handleModoTonalChange: setModoTonal,
    handleBpmChange: setBpm,
    handleTapTempo,
    handleTogglePlayback,
    handleMarkersReady,
    handleLineRef,
  };
}
