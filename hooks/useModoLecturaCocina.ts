"use client";

import type {
  LecturaCompasPlaybackState,
  LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { useLetraZoom } from "@/hooks/useLetraZoom";
import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from "react";

type UseModoLecturaCocinaOptions = {
  /** Modo lectura activo (modoLectura / open según pantalla). */
  active: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Cambia por canción: reinicia scroll, zoom y estado de vista. */
  contentKey: string | number | null;
  /** Iframe embebido (Cifra Club) para auto-scroll visual. */
  embedIframeRef?: RefObject<HTMLIFrameElement | null>;
};

/**
 * Estado y lógica compartidos del modo lectura (menú, paneles, ocultar
 * acordes/compases, auto-scroll y zoom). No incluye lo propio de cada
 * pantalla (cola, buscar, lista lateral ni extras de canto).
 */
export function useModoLecturaCocina({
  active,
  scrollRef,
  contentKey,
  embedIframeRef,
}: UseModoLecturaCocinaOptions) {
  const [overlayAbierto, setOverlayAbierto] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [compasesOcultos, setCompasesOcultos] = useState(false);
  const [acordesOcultos, setAcordesOcultos] = useState(false);
  const [zoomPanelAbierto, setZoomPanelAbierto] = useState(false);
  const [tonoPanelAbierto, setTonoPanelAbierto] = useState(false);
  const [lecturaCompasPlayback, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
  const [lecturaTonalidad, setLecturaTonalidad] =
    useState<LecturaTonalidadState | null>(null);

  const autoScroll = useLetraAutoScroll(scrollRef, {
    enabled: active,
    contentKey,
    embedIframeRef,
  });

  const zoom = useLetraZoom(
    contentKey == null ? null : String(contentKey),
  );

  useEffect(() => {
    setCompasesOcultos(false);
    setAcordesOcultos(false);
    setLecturaCompasPlayback(null);
    setLecturaTonalidad(null);
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(false);
    setOverlayAbierto(false);
  }, [contentKey]);

  const toggleCompasesOcultos = useCallback(() => {
    setCompasesOcultos((ocultos) => !ocultos);
  }, []);

  const toggleAcordesOcultos = useCallback(() => {
    setAcordesOcultos((ocultos) => !ocultos);
  }, []);

  const abrirZoom = useCallback(() => {
    setTonoPanelAbierto(false);
    setZoomPanelAbierto(true);
  }, []);

  const abrirTono = useCallback(() => {
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(true);
  }, []);

  const handleLecturaCompasPlaybackStateChange = useCallback(
    (state: LecturaCompasPlaybackState | null) => {
      setLecturaCompasPlayback(state);
    },
    [],
  );

  const handleLecturaTonalidadStateChange = useCallback(
    (state: LecturaTonalidadState | null) => {
      setLecturaTonalidad(state);
    },
    [],
  );

  /** Limpia estado de vista al salir del modo lectura. */
  const resetVista = useCallback(() => {
    setOverlayAbierto(false);
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(false);
    setAfinadorOpen(false);
    setCompasesOcultos(false);
    setAcordesOcultos(false);
    setLecturaCompasPlayback(null);
    setLecturaTonalidad(null);
  }, []);

  return {
    overlayAbierto,
    setOverlayAbierto,
    afinadorOpen,
    setAfinadorOpen,
    compasesOcultos,
    toggleCompasesOcultos,
    setCompasesOcultos,
    acordesOcultos,
    toggleAcordesOcultos,
    setAcordesOcultos,
    zoomPanelAbierto,
    setZoomPanelAbierto,
    tonoPanelAbierto,
    setTonoPanelAbierto,
    abrirZoom,
    abrirTono,
    lecturaCompasPlayback,
    handleLecturaCompasPlaybackStateChange,
    lecturaTonalidad,
    handleLecturaTonalidadStateChange,
    autoScroll,
    zoom,
    resetVista,
  };
}
