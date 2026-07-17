"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import LecturaPcTopChrome from "@/components/home/LecturaPcTopChrome";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import { buildColaLecturaNavItems } from "@/components/home/lecturaModoNavItems";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import ColaIndividualSheet from "@/components/home/ColaIndividualSheet";
import CantarControlHeaderActions from "@/components/salas/CantarControlHeaderActions";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useModoLecturaCocina } from "@/hooks/useModoLecturaCocina";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_AVISO_EXIT_MS,
  COLA_AVISO_SHOW_DELAY_MS,
  getLecturaColaAvisoTopCss,
  getLecturaFabMenuTopCss,
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
  getSalaMainFooterPaddingCss,
} from "@/lib/sala-layout";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SalaColaBootstrapSkeleton } from "@/components/salas/SalasSkeletons";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";

export default function HomePageShell() {
  const cola = useColaIndividual();
  const colaSidePanel = useColaSidePanel();
  const colaAvisoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const colaAvisoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openColaRef = useRef<(() => void) | null>(null);
  const handleSiguienteRef = useRef<(() => void) | null>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const embedIframeRef = useRef<HTMLIFrameElement>(null);

  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [lecturaZoomEligible, setLecturaZoomEligible] = useState(false);
  const lecturaPantallaCompleta = modoLectura && !colaSidePanel;
  const lecturaConColaLateral = modoLectura && colaSidePanel;
  const lecturaFixedRightCss = getLecturaFixedRightCss(lecturaConColaLateral);
  const [colaAviso, setColaAviso] = useState<string | null>(null);
  const [colaAvisoExiting, setColaAvisoExiting] = useState(false);
  const [cancionNombreRevealGen, setCancionNombreRevealGen] = useState(0);
  const prevCancionRevealKeyRef = useRef<string | null>(null);

  const cancionActivaScrollKey = cola.cancionActiva
    ? `${cola.cancionActiva.nombre}::${cola.cancionActiva.url_letra}`
    : null;

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
    active: modoLectura,
    scrollRef: letraScrollRef,
    contentKey: cancionActivaScrollKey,
    embedIframeRef,
  });

  const handleColaAdded = useCallback(() => {
    triggerHaptic();

    if (colaAvisoShowTimerRef.current) {
      clearTimeout(colaAvisoShowTimerRef.current);
    }

    if (colaAvisoHideTimerRef.current) {
      clearTimeout(colaAvisoHideTimerRef.current);
    }

    setColaAvisoExiting(false);
    setColaAviso(null);

    colaAvisoShowTimerRef.current = setTimeout(() => {
      setColaAviso("Canción sumada a la lista");
      colaAvisoShowTimerRef.current = null;

      colaAvisoHideTimerRef.current = setTimeout(() => {
        setColaAvisoExiting(true);

        colaAvisoHideTimerRef.current = setTimeout(() => {
          setColaAviso(null);
          setColaAvisoExiting(false);
          colaAvisoHideTimerRef.current = null;
        }, COLA_AVISO_EXIT_MS);
      }, 2500);
    }, COLA_AVISO_SHOW_DELAY_MS);
  }, []);

  const salirModoLectura = useCallback(() => {
    resetVista();
    setModoLectura(false);
  }, [resetVista]);

  const handleModoLecturaBack = useCallback(() => {
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

    salirModoLectura();
  }, [overlayAbierto, salirModoLectura, tonoPanelAbierto, zoomPanelAbierto]);

  useHardwareBack(modoLectura, handleModoLecturaBack);

  useEffect(() => {
    if (modoLectura) {
      document.body.setAttribute("data-modo-lectura", "true");
    } else {
      document.body.removeAttribute("data-modo-lectura");
    }

    return () => {
      document.body.removeAttribute("data-modo-lectura");
    };
  }, [modoLectura]);

  useEffect(() => {
    const revealKey = cola.cancionActiva
      ? `${cola.cancionActiva.nombre}::${cola.cancionActiva.url_letra}`
      : null;

    if (prevCancionRevealKeyRef.current === null) {
      prevCancionRevealKeyRef.current = revealKey;
      return;
    }

    if (revealKey !== null && prevCancionRevealKeyRef.current !== revealKey) {
      prevCancionRevealKeyRef.current = revealKey;
      setCancionNombreRevealGen((generation) => generation + 1);
      return;
    }

    if (revealKey === null) {
      prevCancionRevealKeyRef.current = null;
    }
  }, [cola.cancionActiva]);

  useEffect(() => {
    return () => {
      if (colaAvisoShowTimerRef.current) {
        clearTimeout(colaAvisoShowTimerRef.current);
      }

      if (colaAvisoHideTimerRef.current) {
        clearTimeout(colaAvisoHideTimerRef.current);
      }
    };
  }, []);

  const headerActions =
    !modoLectura && !colaSidePanel ? (
      <CantarControlHeaderActions onSearch={() => setBuscadorOpen(true)} />
    ) : null;

  const handleExpand = useCallback(() => {
    setModoLectura(true);
  }, []);

  const lecturaNavItems = useMemo(() => {
    if (lecturaConColaLateral) {
      return [];
    }

    return buildColaLecturaNavItems({
      pendientesCount: cola.pendientesCount,
      onBuscar: () => setBuscadorOpen(true),
      onSiguiente: () => void handleSiguienteRef.current?.(),
      onCola: () => openColaRef.current?.(),
    });
  }, [cola.pendientesCount, lecturaConColaLateral]);

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
    >
      <main
        className={`sala-cantar-main relative flex min-h-0 flex-col ${
          lecturaPantallaCompleta
            ? "overflow-hidden"
            : "flex-1 overflow-hidden lg:flex-row"
        }`}
        style={
          lecturaPantallaCompleta
            ? { height: "100dvh" }
            : { paddingBottom: getSalaMainFooterPaddingCss() }
        }
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {cola.loading ? (
            <SalaColaBootstrapSkeleton />
          ) : (
            <CancionActivaSection
              cancionNombre={cola.cancionActiva?.nombre ?? null}
              artista={cola.cancionActiva?.artista ?? null}
              urlLetra={cola.cancionActiva?.url_letra ?? null}
              letraTexto={cola.cancionActiva?.letra_texto ?? null}
              modoLectura={modoLectura}
              letraScrollRef={letraScrollRef}
              embedIframeRef={embedIframeRef}
              nombreRevealGeneration={cancionNombreRevealGen}
              headerAction={headerActions}
              letraZoomFactor={zoom.factor}
              onLecturaZoomEligibleChange={setLecturaZoomEligible}
              compasesOcultos={compasesOcultos}
              onToggleCompasesOcultos={toggleCompasesOcultos}
              acordesOcultos={acordesOcultos}
              onToggleAcordesOcultos={toggleAcordesOcultos}
              onLecturaCompasPlaybackStateChange={
                handleLecturaCompasPlaybackStateChange
              }
              onLecturaTonalidadStateChange={handleLecturaTonalidadStateChange}
              onExpand={
                !modoLectura && cola.cancionActiva ? handleExpand : undefined
              }
              controlFilaActions={
                !modoLectura
                  ? {
                      pendientesCount: cola.pendientesCount,
                      colaAviso,
                      colaAvisoExiting,
                      onOpenFila: () => openColaRef.current?.(),
                      onSiguiente: () => void handleSiguienteRef.current?.(),
                      siguienteDisabled: cola.pendientesCount === 0,
                      showSiguiente: Boolean(cola.cancionActiva),
                    }
                  : null
              }
            />
          )}
        </div>

        <ColaIndividualSheet
          items={cola.items}
          onOpenBuscador={() => setBuscadorOpen(true)}
          presentacionOculta={lecturaPantallaCompleta}
          onRequestOpen={(open) => {
            openColaRef.current = open;
          }}
          onRequestSiguiente={(siguiente) => {
            handleSiguienteRef.current = siguiente;
          }}
          onSiguiente={cola.avanzar}
          onDeleteAll={cola.vaciarTodo}
          onDeleteItem={cola.eliminarItem}
          onVolverAPendiente={cola.volverAPendiente}
          onReorder={cola.reordenarPendientes}
          onAgregarALista={cola.agregarALista}
        />
      </main>

      {modoLectura ? (
        <>
          <LecturaPcTopChrome
            fixedRightCss={lecturaFixedRightCss}
            onContraer={salirModoLectura}
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
              setOverlayAbierto((open) => !open);
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

          {!overlayAbierto ? (
            <TapButton
              type="button"
              aria-label="Buscar"
              onClick={() => setBuscadorOpen(true)}
              className={`fixed z-50 flex size-9 items-center justify-center lg:hidden ${LECTURA_TOP_CHIP}`}
              style={{
                top: getLecturaFabMenuTopCss(),
                right: lecturaFixedRightCss,
              }}
            >
              <Search className="size-4 text-accent" aria-hidden="true" />
            </TapButton>
          ) : null}

          <ModoLecturaOverlay
            abierto={overlayAbierto}
            fixedRightCss={lecturaFixedRightCss}
            navItems={lecturaNavItems}
            showZoomOption={lecturaZoomEligible}
            showTonoOption={Boolean(lecturaTonalidad)}
            showAcordesOption={Boolean(lecturaTonalidad)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            acordesOcultos={acordesOcultos}
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
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
            enabled={Boolean(cola.cancionActiva)}
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
            zoomEnabled={Boolean(cola.cancionActiva)}
            onZoomDecrease={zoom.decrease}
            onZoomIncrease={zoom.increase}
            autoScrollLevel={autoScroll.autoScrollLevel}
            autoScrollEnabled={Boolean(cola.cancionActiva)}
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
        </>
      ) : null}

      {modoLectura && colaAviso ? (
        <ColaAvisoToast
          message={colaAviso}
          exiting={colaAvisoExiting}
          className="fixed z-[48]"
          style={{
            top: getLecturaColaAvisoTopCss(),
            right: lecturaFixedRightCss,
          }}
        />
      ) : null}

      <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />

      {buscadorOpen ? (
        <BuscadorModal
          open={buscadorOpen}
          variant="home"
          onClose={() => setBuscadorOpen(false)}
          onColaAdded={handleColaAdded}
          usuarioLogueado={cola.usuarioLogueado}
          hasActivaOPendiente={cola.hasActivaOPendiente}
          onVerAhora={cola.verAhora}
          onAgregarALista={cola.agregarALista}
        />
      ) : null}

      <AppReadyMarker />
    </div>
  );
}
