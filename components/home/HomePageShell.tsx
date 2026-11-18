"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import ColaIndividualSheet from "@/components/home/ColaIndividualSheet";
import ColaBarraProxima from "@/components/salas/ColaBarraProxima";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import { LECTURA_TOP_CHIP } from "@/components/salas/LecturaCancionChip";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import VideoFlotante from "@/components/video/VideoFlotante";
import { TapButton } from "@/components/ui/TapFeedback";
import { useCancionYoutube } from "@/hooks/useCancionYoutube";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useVideoLectura } from "@/hooks/useVideoLectura";
import { parseCancioneroUrlId } from "@/lib/cancionero-url";
import { useModoLecturaCocina } from "@/hooks/useModoLecturaCocina";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_AVISO_EXIT_MS,
  COLA_AVISO_SHOW_DELAY_MS,
  CONTROL_LETRA_HORIZONTAL_INSET,
  getLecturaColaAvisoTopCss,
  getLecturaFabMenuTopCss,
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
  getSalaMainFooterPaddingCss,
} from "@/lib/sala-layout";
import { SlidersHorizontal, X } from "lucide-react";
import {
  IndividualFilaSkeleton,
  SalaColaBootstrapSkeleton,
} from "@/components/salas/SalasSkeletons";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const arrastrarColaRef = useRef<((clientY: number, clientX: number) => void) | null>(null);
  const handleSiguienteRef = useRef<(() => void) | null>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);
  const embedIframeRef = useRef<HTMLIFrameElement>(null);

  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [lecturaZoomEligible, setLecturaZoomEligible] = useState(false);
  const lecturaPantallaCompleta = modoLectura && !colaSidePanel;
  const lecturaConColaLateral = modoLectura && colaSidePanel;
  const lecturaFixedRightCss = getLecturaFixedRightCss(lecturaConColaLateral);
  const lecturaFilterTopCss = getLecturaFabMenuTopCss();
  const lecturaOverlayMenuTopCss = `calc(${lecturaFilterTopCss} + 44px)`;
  const cancionActivaDelCancionero = Boolean(
    cola.cancionActiva?.url_letra.startsWith("cancionero://"),
  );
  const cancionActivaCancioneroId = parseCancioneroUrlId(
    cola.cancionActiva?.url_letra ?? null,
  );
  // Video solo con la canción expandida (modo lectura) y del Cancionero.
  const youtubeVideoId = useCancionYoutube({
    cancionId: modoLectura ? cancionActivaCancioneroId : null,
  });
  const video = useVideoLectura(
    modoLectura ? youtubeVideoId : null,
    cancionActivaCancioneroId,
  );
  const lecturaExtraItems = useMemo(
    () => (video.fabItem ? [video.fabItem] : []),
    [video.fabItem],
  );
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

  const mostrarColaAviso = useCallback((texto: string) => {
    if (colaAvisoShowTimerRef.current) {
      clearTimeout(colaAvisoShowTimerRef.current);
    }

    if (colaAvisoHideTimerRef.current) {
      clearTimeout(colaAvisoHideTimerRef.current);
    }

    setColaAvisoExiting(false);
    setColaAviso(null);

    colaAvisoShowTimerRef.current = setTimeout(() => {
      setColaAviso(texto);
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

  const handleColaAdded = useCallback(() => {
    triggerHaptic();
    mostrarColaAviso("Canción sumada a la lista");
  }, [mostrarColaAviso]);

  const vaciarCola = cola.vaciarTodo;
  const handleDeleteAll = useCallback(async () => {
    try {
      await vaciarCola();
    } catch {
      mostrarColaAviso("No se pudo borrar la lista. Probá de nuevo.");
    }
  }, [mostrarColaAviso, vaciarCola]);

  const salirModoLectura = useCallback(() => {
    resetVista();
    setModoLectura(false);
  }, [resetVista]);

  const handleModoLecturaBack = useCallback(() => {
    if (video.abierto) {
      video.cerrar();
      return;
    }

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
  }, [overlayAbierto, salirModoLectura, tonoPanelAbierto, video, zoomPanelAbierto]);

  useHardwareBack(modoLectura, handleModoLecturaBack);

  useEffect(() => {
    if (modoLectura) {
      document.body.setAttribute("data-modo-lectura", "true");
      document.body.setAttribute("data-hide-app-header", "true");
    } else {
      document.body.removeAttribute("data-modo-lectura");
      document.body.removeAttribute("data-hide-app-header");
    }

    return () => {
      document.body.removeAttribute("data-modo-lectura");
      document.body.removeAttribute("data-hide-app-header");
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

  // La lupa vive en la barrita de la fila (celular); en PC, en el panel lateral.
  const proximaCola = useMemo(() => {
    const proxima = [...cola.items]
      .sort((a, b) => a.orden - b.orden)
      .find((item) => item.estado === "pendiente" && !cola.noDisponibles.has(item.id));
    return proxima ? { nombre: proxima.nombre, artista: proxima.artista } : null;
  }, [cola.items, cola.noDisponibles]);

  const handleExpand = useCallback(() => {
    setModoLectura(true);
  }, []);

  const listaMovil =
    !colaSidePanel &&
    !modoLectura &&
    !cola.loading &&
    !cola.activaNoDisponible;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala">
      <main
        className={`sala-cantar-main relative flex min-h-0 flex-1 flex-col ${
          lecturaPantallaCompleta
            ? "overflow-hidden"
            : "overflow-hidden lg:flex-row"
        }`}
        style={
          lecturaPantallaCompleta
            ? undefined
            : { paddingBottom: getSalaMainFooterPaddingCss() }
        }
      >
        {listaMovil ? null : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {cola.loading ? (
            colaSidePanel ? (
              <SalaColaBootstrapSkeleton />
            ) : (
              <IndividualFilaSkeleton />
            )
          ) : cola.activaNoDisponible ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <h2>{cola.cancionActiva?.nombre}</h2>
              <p>Requiere conexión</p>
              <p className="text-sm text-text-muted">La canción sigue en tu lista. Sin internet podés usar las que están guardadas en el celular.</p>
              <TapButton onClick={() => void cola.avanzar()} disabled={!cola.puedeAvanzar}>Siguiente disponible</TapButton>
              <TapButton onClick={() => setBuscadorOpen(true)}>Buscar canción descargada</TapButton>
              <TapButton onClick={() => openColaRef.current?.()}>Ver fila</TapButton>
            </div>
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
              temaLectura={cancionActivaDelCancionero ? temaLectura : undefined}
              onTemaLecturaChange={
                cancionActivaDelCancionero ? cambiarTemaLectura : undefined
              }
              onCerrarLectura={modoLectura ? salirModoLectura : undefined}
              lecturaZoom={
                modoLectura && lecturaZoomEligible
                  ? {
                      level: zoom.level,
                      onDecrease: zoom.decrease,
                      onIncrease: zoom.increase,
                    }
                  : undefined
              }
              onAfinadorLectura={
                modoLectura ? () => setAfinadorOpen(true) : undefined
              }
              onVideoLectura={
                modoLectura
                  ? video.abierto
                    ? video.cerrar
                    : video.abrir
                  : undefined
              }
              videoLecturaAbierto={video.abierto}
              mostrarChipLectura={false}
              barraExterna={lecturaPantallaCompleta}
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
                      siguienteDisabled: !cola.puedeAvanzar,
                      showSiguiente: Boolean(cola.cancionActiva),
                      barra: !colaSidePanel,
                      proxima: proximaCola,
                      onBuscar: () => setBuscadorOpen(true),
                      onArrastrarFila: (clientY, clientX) =>
                        arrastrarColaRef.current?.(clientY, clientX),
                    }
                  : null
              }
            />
          )}
        </div>
        )}

        {lecturaPantallaCompleta ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
            style={{
              paddingLeft: CONTROL_LETRA_HORIZONTAL_INSET,
              paddingRight: CONTROL_LETRA_HORIZONTAL_INSET,
              paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
            }}
          >
            <div className="pointer-events-auto">
            <ColaBarraProxima
              mostrarActual
              cancionActual={
                cola.cancionActiva
                  ? {
                      nombre: cola.cancionActiva.nombre,
                      artista: cola.cancionActiva.artista,
                    }
                  : null
              }
              proxima={null}
              pendientesCount={cola.pendientesCount}
              aviso={colaAviso}
              showSiguiente={Boolean(cola.cancionActiva)}
              siguienteDisabled={!cola.puedeAvanzar}
              onBuscar={() => setBuscadorOpen(true)}
              onSiguiente={() => void handleSiguienteRef.current?.()}
              onAbrir={() => openColaRef.current?.()}
              onArrastrar={(clientY, clientX) =>
                arrastrarColaRef.current?.(clientY, clientX)
              }
            />
            </div>
          </div>
        ) : null}

        <ColaIndividualSheet
          anclada={listaMovil}
          onExpandActiva={handleExpand}
          items={cola.items}
          noDisponibles={cola.noDisponibles}
          onOpenBuscador={() => setBuscadorOpen(true)}
          presentacionOculta={lecturaPantallaCompleta}
          onRequestOpen={(open) => {
            openColaRef.current = open;
          }}
          onRequestArrastre={(arrastrar) => {
            arrastrarColaRef.current = arrastrar;
          }}
          onRequestSiguiente={(siguiente) => {
            handleSiguienteRef.current = siguiente;
          }}
          onSiguiente={cola.avanzar}
          onDeleteAll={handleDeleteAll}
          onDeleteItem={cola.eliminarItem}
          onVolverAPendiente={cola.volverAPendiente}
          onReorder={cola.reordenarPendientes}
          onAgregarALista={cola.agregarALista}
        />
      </main>

      {modoLectura ? (
        <>
          <TapButton
            type="button"
            aria-label="Cerrar"
            onClick={() => {
              setOverlayAbierto(false);
              salirModoLectura();
            }}
            className={`fixed z-50 flex size-9 items-center justify-center lg:hidden ${LECTURA_TOP_CHIP}`}
            style={{ top: getLecturaTopChromeTopCss(), right: lecturaFixedRightCss }}
          >
            <X className="size-4 text-black" aria-hidden="true" />
          </TapButton>

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
              top: lecturaFilterTopCss,
              right: lecturaFixedRightCss,
            }}
          >
            <SlidersHorizontal
              className="size-4 text-black"
              aria-hidden="true"
            />
          </TapButton>

          <ModoLecturaOverlay
            abierto={overlayAbierto}
            fixedRightCss={lecturaFixedRightCss}
            showContraerOption={false}
            menuTopCss={lecturaOverlayMenuTopCss}
            navItems={[]}
            extraItems={lecturaExtraItems}
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
            tonalidadIndex={lecturaTonalidad?.tonalidadIndex}
            onTonalidadChange={lecturaTonalidad?.setTonalidad}
            zoomLevel={zoom.level}
            zoomEnabled={Boolean(cola.cancionActiva)}
            onZoomDecrease={zoom.decrease}
            onZoomIncrease={zoom.increase}
            temaLectura={cancionActivaDelCancionero ? temaLectura : undefined}
            onTemaLecturaChange={
              cancionActivaDelCancionero ? cambiarTemaLectura : undefined
            }
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
            showDesktopZoom={false}
            bottomCss={
              lecturaPantallaCompleta
                ? "calc(96px + env(safe-area-inset-bottom, 0px))"
                : undefined
            }
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

      {video.videoId ? (
        <VideoFlotante
          videoId={video.videoId}
          titulo={cola.cancionActiva?.nombre}
          onCerrar={video.cerrar}
        />
      ) : null}

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
