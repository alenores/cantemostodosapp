"use client";

import CancioneroLecturaListaPanel from "@/components/cancionero/CancioneroLecturaListaPanel";
import LetraCifradoLecturaShell from "@/components/cifrado/LetraCifradoLecturaShell";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import LecturaPcTopChrome from "@/components/home/LecturaPcTopChrome";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import { buildCancioneroLecturaNavItems } from "@/components/home/lecturaModoNavItems";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import LecturaCancionChip, {
  LECTURA_TOP_CHIP,
} from "@/components/salas/LecturaCancionChip";
import LetraTexto from "@/components/salas/LetraTexto";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useModoLecturaCocina } from "@/hooks/useModoLecturaCocina";
import { getLetraZoomStyle } from "@/lib/letra-zoom";
import {
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
  getLetraTextScrollEndPadding,
} from "@/lib/sala-layout";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import { SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CancioneroModoLecturaProps = {
  open: boolean;
  cancion: CancionCancionero;
  cifradoDetalle?: CancionCifradoDetalle | null;
  cifradoLoading?: boolean;
  items: CancionCancionero[];
  onSelectCancion: (cancion: CancionCancionero) => void;
  onAnterior: () => void;
  onSiguiente: () => void;
  tieneAnterior: boolean;
  tieneSiguiente: boolean;
  onContraer: () => void;
};

export default function CancioneroModoLectura({
  open,
  cancion,
  cifradoDetalle = null,
  cifradoLoading = false,
  items,
  onSelectCancion,
  onAnterior,
  onSiguiente,
  tieneAnterior,
  tieneSiguiente,
  onContraer,
}: CancioneroModoLecturaProps) {
  const isDesktop = useIsDesktop();
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const [portalMounted, setPortalMounted] = useState(false);

  useBodyScrollLock(open);

  const showCifradoAvanzado = Boolean(
    cifradoDetalle?.letra?.trim() && cancion.tiene_cifrado_avanzado,
  );
  const textoPlano = cancion.letra?.trim() ?? "";
  const contentKey = `${cancion.id}::${cancion.nombre}`;
  const lecturaConListaLateral = open && isDesktop;
  const lecturaFixedRightCss = getLecturaFixedRightCss(lecturaConListaLateral);
  const menuCompacto = lecturaConListaLateral;

  const {
    overlayAbierto,
    setOverlayAbierto,
    afinadorOpen,
    setAfinadorOpen,
    compasesOcultos,
    setCompasesOcultos,
    toggleCompasesOcultos,
    acordesOcultos,
    toggleAcordesOcultos,
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
    temaLectura,
    cambiarTemaLectura,
  } = useModoLecturaCocina({
    active: open,
    scrollRef: letraScrollRef,
    contentKey,
  });

  const letraZoomStyle = getLetraZoomStyle(zoom.factor);
  const scrollEndPadding = getLetraTextScrollEndPadding();
  const lecturaZoomEligible = showCifradoAvanzado || Boolean(textoPlano);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.removeAttribute("data-modo-lectura");
      return;
    }

    document.body.setAttribute("data-modo-lectura", "true");
    return () => {
      document.body.removeAttribute("data-modo-lectura");
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      resetVista();
    }
  }, [open, resetVista]);

  const handleLecturaBack = useCallback(() => {
    if (tonoPanelAbierto) {
      setTonoPanelAbierto(false);
      return;
    }

    if (zoomPanelAbierto) {
      setZoomPanelAbierto(false);
      return;
    }

    if (overlayAbierto) {
      setOverlayAbierto(false);
      return;
    }

    onContraer();
  }, [onContraer, overlayAbierto, tonoPanelAbierto, zoomPanelAbierto]);

  const lecturaNavItems = useMemo(() => {
    if (menuCompacto) {
      return [];
    }

    return buildCancioneroLecturaNavItems({
      tieneAnterior,
      tieneSiguiente,
      onAnterior,
      onSiguiente,
    });
  }, [menuCompacto, onAnterior, onSiguiente, tieneAnterior, tieneSiguiente]);

  useHardwareBack(open && !afinadorOpen, handleLecturaBack);

  if (!open || !portalMounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[350] flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <LecturaCancionChip
            nombre={cancion.nombre}
            artista={cancion.artista}
            nombreRevealKey={contentKey}
            nombreRevealClass=""
            reservarColaLateral={lecturaConListaLateral}
          />

          {showCifradoAvanzado && cifradoDetalle ? (
            <LetraCifradoLecturaShell
              detalle={cifradoDetalle}
              scrollRef={letraScrollRef}
              scrollEndPadding={scrollEndPadding}
              letraZoomStyle={letraZoomStyle}
              compasesOcultos={compasesOcultos}
              onToggleCompasesOcultos={toggleCompasesOcultos}
              acordesOcultos={acordesOcultos}
              onToggleAcordesOcultos={toggleAcordesOcultos}
              onCompasPlaybackStateChange={
                handleLecturaCompasPlaybackStateChange
              }
              onTonalidadStateChange={handleLecturaTonalidadStateChange}
              temaLectura={temaLectura}
              onTemaLecturaChange={cambiarTemaLectura}
            />
          ) : (
            <div className="relative h-full min-h-0 w-full overflow-hidden">
              <div
                ref={letraScrollRef}
                data-cancionero-letra-scroll=""
                className="h-full min-h-0 w-full touch-pan-y overscroll-y-contain overflow-y-auto bg-letra-bg"
                style={letraZoomStyle}
              >
                {cifradoLoading ? (
                  <div
                    className="flex min-h-[12rem] items-center justify-center px-4"
                    role="status"
                    aria-live="polite"
                    aria-label="Cargando cifrado"
                  >
                    <p className="text-sm text-text-muted">Cargando cifrado…</p>
                  </div>
                ) : textoPlano ? (
                  <LetraTexto
                    texto={textoPlano}
                    edgeToEdge
                    fillViewport
                    compactHorizontalPadding
                    scrollEndPadding={scrollEndPadding}
                  />
                ) : (
                  <p className="px-4 py-8 text-center text-sm text-text-muted">
                    Esta canción no tiene letra disponible.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <CancioneroLecturaListaPanel
          items={items}
          cancionActivaId={cancion.id}
          onSelectCancion={onSelectCancion}
        />
      </div>

      <LecturaPcTopChrome
        fixedRightCss={lecturaFixedRightCss}
        onContraer={onContraer}
        onAfinador={() => setAfinadorOpen(true)}
      />

      <TapButton
        type="button"
        aria-label={
          overlayAbierto
            ? "Cerrar controles"
            : "Abrir controles de modo lectura"
        }
        onClick={() => {
          setZoomPanelAbierto(false);
          setTonoPanelAbierto(false);
          setOverlayAbierto((current) => !current);
        }}
        className={`fixed z-50 flex size-9 items-center justify-center lg:hidden ${LECTURA_TOP_CHIP} ${
          overlayAbierto ? "border-accent/45" : ""
        }`}
        style={{
          top: getLecturaTopChromeTopCss(),
          right: lecturaFixedRightCss,
        }}
      >
        {overlayAbierto ? (
          <X className="size-4 text-text-primary" aria-hidden="true" />
        ) : (
          <SlidersHorizontal
            className="size-4 text-accent"
            aria-hidden="true"
          />
        )}
      </TapButton>

      <ModoLecturaOverlay
        abierto={overlayAbierto}
        fixedRightCss={lecturaFixedRightCss}
        mobileOnly
        navItems={lecturaNavItems}
        hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
        compasesOcultos={compasesOcultos}
        acordesOcultos={acordesOcultos}
        showAcordesOption={showCifradoAvanzado}
        showTonoOption={Boolean(lecturaTonalidad)}
        showZoomOption={lecturaZoomEligible}
        onCerrar={() => setOverlayAbierto(false)}
        onContraer={onContraer}
        onAfinador={() => setAfinadorOpen(true)}
        onActivarCompases={() => setCompasesOcultos(false)}
        onToggleAcordesOcultos={toggleAcordesOcultos}
        onAbrirZoom={abrirZoom}
        onAbrirTono={abrirTono}
        temaLectura={temaLectura}
        onTemaLecturaChange={cambiarTemaLectura}
      />

      <LecturaZoomPanel
        open={zoomPanelAbierto}
        level={zoom.level}
        enabled={lecturaZoomEligible}
        onDecrease={zoom.decrease}
        onIncrease={zoom.increase}
        onClose={() => setZoomPanelAbierto(false)}
      />

      {lecturaTonalidad ? (
        <LecturaTonoPanel
          open={tonoPanelAbierto}
          tonalidadIndex={lecturaTonalidad.tonalidadIndex}
          notacion={lecturaTonalidad.notacion}
          onTonalidadChange={lecturaTonalidad.setTonalidad}
          onClose={() => setTonoPanelAbierto(false)}
        />
      ) : null}

      <LecturaBottomControls
        showZoom={lecturaZoomEligible}
        zoomLevel={zoom.level}
        zoomEnabled={lecturaZoomEligible}
        onZoomDecrease={zoom.decrease}
        onZoomIncrease={zoom.increase}
        autoScrollLevel={autoScroll.autoScrollLevel}
        autoScrollEnabled
        hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
        compasesOcultos={compasesOcultos}
        onToggleCompasesOcultos={toggleCompasesOcultos}
        compasPlaying={lecturaCompasPlayback?.playing ?? false}
        compasCanPlay={lecturaCompasPlayback?.canPlay ?? false}
        compasBpm={lecturaCompasPlayback?.bpm ?? 120}
        onCompasTogglePlayback={() => lecturaCompasPlayback?.toggle()}
        onCompasBpmDecrease={() => lecturaCompasPlayback?.decreaseBpm()}
        onCompasBpmIncrease={() => lecturaCompasPlayback?.increaseBpm()}
        fixedRightCss={lecturaFixedRightCss}
        onAutoScrollAccelerate={autoScroll.accelerate}
        onAutoScrollDecelerate={autoScroll.decelerate}
      />

      <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />
    </div>,
    document.body,
  );
}
