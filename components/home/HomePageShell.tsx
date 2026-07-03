"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import AutoScrollControl from "@/components/home/AutoScrollControl";
import ColaIndividualSheet from "@/components/home/ColaIndividualSheet";
import BuscadorModal from "@/components/salas/BuscadorModal";
import CancionActivaSection from "@/components/salas/CancionActivaSection";
import ColaAvisoToast from "@/components/salas/ColaAvisoToast";
import { TapButton } from "@/components/ui/TapFeedback";
import { useColaIndividual } from "@/hooks/useColaIndividual";
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { triggerHaptic } from "@/lib/haptic";
import {
  COLA_AVISO_EXIT_MS,
  COLA_AVISO_SHOW_DELAY_MS,
  getLetraModoLecturaHorizontalPadding,
  getLecturaColaAvisoTopCss,
  getLecturaFabMenuTopCss,
  getLecturaTopChromeTopCss,
  getSalaMainFooterPaddingCss,
  LECTURA_TOP_CHROME_SIDE_PX,
} from "@/lib/sala-layout";
import type { LucideIcon } from "lucide-react";
import {
  ListMusic,
  Minimize2,
  Music2,
  Search,
  SkipForward,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { SalaColaBootstrapSkeleton } from "@/components/salas/SalasSkeletons";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
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
};

function HomeModoLecturaFabOption({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  iconAfter = false,
  cascadeIndex,
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
      }`}
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
  onCerrar: () => void;
  onContraer: () => void;
  onSiguiente: () => void;
  onCola: () => void;
  onBuscar: () => void;
  onAfinador: () => void;
};

function HomeModoLecturaOverlay({
  abierto,
  pendientesCount,
  onCerrar,
  onContraer,
  onSiguiente,
  onCola,
  onBuscar,
  onAfinador,
}: HomeModoLecturaOverlayProps) {
  if (!abierto) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="Cerrar menú de controles"
        onClick={onCerrar}
      />

      <div
        className="pointer-events-none fixed z-40 flex flex-col items-end gap-2"
        style={{
          top: getLecturaFabMenuTopCss(),
          right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
        }}
        role="menu"
        aria-label="Controles de modo lectura"
      >
        <HomeModoLecturaFabOption
          icon={Minimize2}
          label="Contraer"
          cascadeIndex={0}
          onClick={onContraer}
        />
        <HomeModoLecturaFabOption
          icon={Search}
          label="Buscar"
          cascadeIndex={1}
          onClick={() => {
            onCerrar();
            onBuscar();
          }}
        />
        <HomeModoLecturaFabOption
          icon={SkipForward}
          label="Siguiente"
          iconAfter
          cascadeIndex={2}
          disabled={pendientesCount === 0}
          onClick={() => {
            onCerrar();
            onSiguiente();
          }}
        />
        <HomeModoLecturaFabOption
          icon={ListMusic}
          label={`Cola · ${pendientesCount}`}
          cascadeIndex={3}
          onClick={() => {
            onCerrar();
            onCola();
          }}
        />
        <HomeModoLecturaFabOption
          icon={Music2}
          label="Afinador"
          cascadeIndex={4}
          onClick={() => {
            onCerrar();
            onAfinador();
          }}
        />
      </div>
    </>
  );
}

export default function HomePageShell() {
  const navigateWithProgress = useNavigateWithProgress();
  const cola = useColaIndividual();
  const colaAvisoShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const colaAvisoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const openColaRef = useRef<(() => void) | null>(null);
  const handleSiguienteRef = useRef<(() => void) | null>(null);
  const letraScrollRef = useRef<HTMLDivElement>(null);

  const [buscadorOpen, setBuscadorOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [overlayAbierto, setOverlayAbierto] = useState(false);
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
    setOverlayAbierto(false);
    setModoLectura(false);
  }, []);

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

  const headerLupa = !modoLectura ? (
    <TapButton
      type="button"
      aria-label="Buscar canción"
      onClick={() => setBuscadorOpen(true)}
      className="flex size-9 items-center justify-center rounded-full border border-border/60 bg-bg-dark/80 text-text-primary"
    >
      <Search className="size-4 text-accent" aria-hidden="true" />
    </TapButton>
  ) : null;

  return (
    <div
      className="flex flex-col overflow-hidden bg-bg-sala"
      style={{ height: "100dvh" }}
    >
      <main
        className={`relative flex min-h-0 flex-col ${
          modoLectura ? "overflow-hidden" : "flex-1 overflow-hidden"
        }`}
        style={
          modoLectura
            ? { height: "100dvh" }
            : { paddingBottom: getSalaMainFooterPaddingCss() }
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
              nombreRevealGeneration={cancionNombreRevealGen}
              headerAction={headerLupa}
            />
          )}
        </div>

        <ColaIndividualSheet
          items={cola.items}
          onOpenBuscador={() => setBuscadorOpen(true)}
          presentacionOculta={modoLectura}
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
          {cola.cancionActiva?.nombre ? (
            <div
              className={`pointer-events-none fixed z-[45] max-w-[min(75vw,calc(100%-3.25rem))] px-2.5 py-1.5 ${LECTURA_TOP_CHIP}`}
              style={{
                top: getLecturaTopChromeTopCss(),
                left: getLetraModoLecturaHorizontalPadding(),
              }}
            >
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                <span
                  key={
                    cancionNombreRevealGen > 0
                      ? `reveal-${cancionNombreRevealGen}`
                      : "initial"
                  }
                  className={`min-w-0 flex-1 truncate text-[12px] font-semibold leading-snug text-accent ${
                    cancionNombreRevealGen > 0 ? "cola-nombre-reveal block" : ""
                  }`}
                >
                  {cola.cancionActiva.nombre}
                </span>
                {cola.cancionActiva.artista ? (
                  <>
                    <span
                      className="shrink-0 text-[10px] leading-snug text-text-muted/70"
                      aria-hidden="true"
                    >
                      ·
                    </span>
                    <span className="max-w-[38%] shrink-0 truncate text-[10px] leading-snug text-text-muted">
                      {cola.cancionActiva.artista}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          <TapButton
            type="button"
            aria-label={
              overlayAbierto
                ? "Cerrar controles"
                : "Abrir controles de modo lectura"
            }
            onClick={() => setOverlayAbierto((open) => !open)}
            className={`fixed z-50 flex size-9 items-center justify-center ${LECTURA_TOP_CHIP} ${
              overlayAbierto ? "border-accent/45" : ""
            }`}
            style={{
              top: getLecturaTopChromeTopCss(),
              right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
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
            onCerrar={() => setOverlayAbierto(false)}
            onContraer={salirModoLectura}
            onSiguiente={() => void handleSiguienteRef.current?.()}
            onCola={() => openColaRef.current?.()}
            onBuscar={() => setBuscadorOpen(true)}
            onAfinador={() => navigateWithProgress("/")}
          />

          <AutoScrollControl
            level={autoScrollLevel}
            enabled={Boolean(cola.cancionActiva)}
            onAccelerate={accelerateAutoScroll}
            onDecelerate={decelerateAutoScroll}
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
            right: `max(${LECTURA_TOP_CHROME_SIDE_PX}px, env(safe-area-inset-right, 0px))`,
          }}
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
