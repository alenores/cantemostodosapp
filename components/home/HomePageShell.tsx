"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import type { LecturaCompasPlaybackState } from "@/components/cifrado/LetraCifradoLecturaShell";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import ColaIndividualSheet from "@/components/home/ColaIndividualSheet";
import CantarControlHeaderActions from "@/components/salas/CantarControlHeaderActions";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { useLetraZoom } from "@/hooks/useLetraZoom";
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
import type { LucideIcon } from "lucide-react";
import {
  ListMusic,
  Minimize2,
  Music2,
  Search,
  SkipForward,
  SlidersHorizontal,
  Type,
  X,
} from "lucide-react";
import { SalaColaBootstrapSkeleton } from "@/components/salas/SalasSkeletons";
import { useColaSidePanel } from "@/hooks/useColaSidePanel";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useCallback, useEffect, useRef, useState } from "react";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";
const LECTURA_TOP_CHIP =
  "rounded-full border border-border/50 bg-bg-dark/90 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-md";
const LECTURA_FAB_CASCADE_STEP_MS = 55;

type HomeModoLecturaFabOptionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  iconAfter?: boolean;
  cascadeIndex: number;
  className?: string;
};

function HomeModoLecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  iconAfter = false,
  cascadeIndex,
  className = "",
}: HomeModoLecturaFabOptionProps) {
  const iconNode = (
    <Icon className="size-4 shrink-0" aria-hidden="true" />
  );

  return (
    <TapButton
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`sala-lectura-fab-item pointer-events-auto flex items-center gap-2 px-4 py-2 text-sm font-medium ${FLOAT_BTN_SECONDARY} ${
        disabled ? FLOAT_BTN_DISABLED : ""
      } ${className}`}
      style={{
        animationDelay: `${cascadeIndex * LECTURA_FAB_CASCADE_STEP_MS}ms`,
      }}
    >
      {iconAfter ? (
        <>
          <span>{label}</span>
          {iconNode}
        </>
      ) : (
        <>
          {iconNode}
          <span>{label}</span>
        </>
      )}
    </TapButton>
  );
}

type HomeModoLecturaOverlayProps = {
  abierto: boolean;
  pendientesCount: number;
  fixedRightCss: string;
  menuCompacto?: boolean;
  showZoomOption?: boolean;
  onCerrar: () => void;
  onContraer: () => void;
  onSiguiente: () => void;
  onCola: () => void;
  onBuscar: () => void;
  onAfinador: () => void;
  onAbrirZoom?: () => void;
};

function HomeModoLecturaOverlay({
  abierto,
  pendientesCount,
  fixedRightCss,
  menuCompacto = false,
  showZoomOption = false,
  onCerrar,
  onContraer,
  onSiguiente,
  onCola,
  onBuscar,
  onAfinador,
  onAbrirZoom,
}: HomeModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  let cascadeIndex = 0;

  return (
    <>
      <button
        type="button"
        data-no-tap-feedback
        className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none"
        aria-label="Cerrar menú de controles"
        onClick={onCerrar}
      />

      <div
        className="pointer-events-none fixed z-40 flex flex-col items-end gap-2"
        style={{
          top: getLecturaFabMenuTopCss(),
          right: fixedRightCss,
        }}
        role="menu"
        aria-label="Controles de modo lectura"
      >
        <HomeModoLecturaFabOption
          icon={Minimize2}
          label="Contraer"
          cascadeIndex={cascadeIndex++}
          onClick={onContraer}
        />
        {!menuCompacto ? (
          <>
            <HomeModoLecturaFabOption
              icon={Search}
              label="Buscar"
              cascadeIndex={cascadeIndex++}
              onClick={() => {
                onCerrar();
                onBuscar();
              }}
            />
            <HomeModoLecturaFabOption
              icon={SkipForward}
              label="Siguiente"
              iconAfter
              cascadeIndex={cascadeIndex++}
              disabled={pendientesCount === 0}
              onClick={() => {
                onCerrar();
                onSiguiente();
              }}
            />
            <HomeModoLecturaFabOption
              icon={ListMusic}
              label={`Fila · ${pendientesCount}`}
              cascadeIndex={cascadeIndex++}
              onClick={() => {
                onCerrar();
                onCola();
              }}
            />
          </>
        ) : null}
        <HomeModoLecturaFabOption
          icon={Music2}
          label="Afinador"
          cascadeIndex={cascadeIndex++}
          onClick={() => {
            onCerrar();
            onAfinador();
          }}
        />
        {showZoomOption ? (
          <HomeModoLecturaFabOption
            icon={Type}
            label="Tamaño letra"
            cascadeIndex={cascadeIndex++}
            onClick={() => {
              onCerrar();
              onAbrirZoom?.();
            }}
            className="lg:hidden"
          />
        ) : null}
      </div>
    </>
  );
}

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
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [overlayAbierto, setOverlayAbierto] = useState(false);
  const [lecturaZoomEligible, setLecturaZoomEligible] = useState(false);
  const [compasesOcultos, setCompasesOcultos] = useState(false);
  const [zoomPanelAbierto, setZoomPanelAbierto] = useState(false);
  const [lecturaCompasPlayback, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
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
    autoScrollLevel,
    accelerate: accelerateAutoScroll,
    decelerate: decelerateAutoScroll,
  } = useLetraAutoScroll(letraScrollRef, {
    enabled: modoLectura,
    contentKey: cancionActivaScrollKey,
    embedIframeRef,
  });

  const {
    level: letraZoomLevel,
    factor: letraZoomFactor,
    decrease: decreaseLetraZoom,
    increase: increaseLetraZoom,
  } = useLetraZoom(cancionActivaScrollKey);

  useEffect(() => {
    setCompasesOcultos(false);
    setLecturaCompasPlayback(null);
    setZoomPanelAbierto(false);
  }, [cancionActivaScrollKey]);

  const handleLecturaCompasPlaybackStateChange = useCallback(
    (state: LecturaCompasPlaybackState | null) => {
      setLecturaCompasPlayback(state);
    },
    [],
  );

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
    setOverlayAbierto(false);
    setZoomPanelAbierto(false);
    setAfinadorOpen(false);
    setCompasesOcultos(false);
    setLecturaCompasPlayback(null);
    setModoLectura(false);
  }, []);

  const handleModoLecturaBack = useCallback(() => {
    if (zoomPanelAbierto) {
      setZoomPanelAbierto(false);
      return;
    }

    if (overlayAbierto) {
      setOverlayAbierto(false);
      return;
    }

    salirModoLectura();
  }, [overlayAbierto, salirModoLectura, zoomPanelAbierto]);

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
              letraZoomFactor={letraZoomFactor}
              onLecturaZoomEligibleChange={setLecturaZoomEligible}
              compasesOcultos={compasesOcultos}
              onToggleCompasesOcultos={() =>
                setCompasesOcultos((ocultos) => !ocultos)
              }
              onLecturaCompasPlaybackStateChange={
                handleLecturaCompasPlaybackStateChange
              }
              onExpand={
                !modoLectura && cola.cancionActiva ? handleExpand : undefined
              }
            />
          )}
        </div>

        <ColaIndividualSheet
          items={cola.items}
          onOpenBuscador={() => setBuscadorOpen(true)}
          presentacionOculta={lecturaPantallaCompleta}
          onExpand={
            !modoLectura && cola.cancionActiva
              ? () => setModoLectura(true)
              : undefined
          }
          onRequestOpen={(open) => {
            openColaRef.current = open;
          }}
          onRequestSiguiente={(siguiente) => {
            handleSiguienteRef.current = siguiente;
          }}
          colaAviso={!modoLectura ? colaAviso : null}
          colaAvisoExiting={colaAvisoExiting}
          onSiguiente={cola.avanzar}
          onDeleteAll={cola.vaciarTodo}
          onDeleteItem={cola.eliminarItem}
          onVolverAPendiente={cola.volverAPendiente}
          onReorder={cola.reordenarPendientes}
        />
      </main>

      {modoLectura ? (
        <>

          <TapButton
            type="button"
            aria-label={
              overlayAbierto
                ? "Cerrar controles"
                : "Abrir controles de modo lectura"
            }
            onClick={() => {
              setZoomPanelAbierto(false);
              setOverlayAbierto((open) => !open);
            }}
            className={`fixed z-50 flex size-9 items-center justify-center ${LECTURA_TOP_CHIP} ${
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

          <HomeModoLecturaOverlay
            abierto={overlayAbierto}
            pendientesCount={cola.pendientesCount}
            fixedRightCss={lecturaFixedRightCss}
            menuCompacto={lecturaConColaLateral}
            showZoomOption={lecturaZoomEligible}
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
            onSiguiente={() => void handleSiguienteRef.current?.()}
            onCola={() => openColaRef.current?.()}
            onBuscar={() => setBuscadorOpen(true)}
            onAfinador={() => setAfinadorOpen(true)}
            onAbrirZoom={() => setZoomPanelAbierto(true)}
          />

          <LecturaZoomPanel
            open={zoomPanelAbierto}
            level={letraZoomLevel}
            enabled={Boolean(cola.cancionActiva)}
            onDecrease={decreaseLetraZoom}
            onIncrease={increaseLetraZoom}
            onClose={() => setZoomPanelAbierto(false)}
          />

          <LecturaBottomControls
            showZoom={lecturaZoomEligible}
            zoomLevel={letraZoomLevel}
            zoomEnabled={Boolean(cola.cancionActiva)}
            onZoomDecrease={decreaseLetraZoom}
            onZoomIncrease={increaseLetraZoom}
            autoScrollLevel={autoScrollLevel}
            autoScrollEnabled={Boolean(cola.cancionActiva)}
            hasCompases={Boolean(lecturaCompasPlayback?.hasCompases)}
            compasesOcultos={compasesOcultos}
            onToggleCompasesOcultos={() =>
              setCompasesOcultos((ocultos) => !ocultos)
            }
            compasPlaying={lecturaCompasPlayback?.playing ?? false}
            compasCanPlay={lecturaCompasPlayback?.canPlay ?? false}
            compasBpm={lecturaCompasPlayback?.bpm ?? 120}
            onCompasTogglePlayback={() => lecturaCompasPlayback?.toggle()}
            onCompasBpmDecrease={() => lecturaCompasPlayback?.decreaseBpm()}
            onCompasBpmIncrease={() => lecturaCompasPlayback?.increaseBpm()}
            fixedRightCss={lecturaFixedRightCss}
            onAutoScrollAccelerate={accelerateAutoScroll}
            onAutoScrollDecelerate={decelerateAutoScroll}
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
