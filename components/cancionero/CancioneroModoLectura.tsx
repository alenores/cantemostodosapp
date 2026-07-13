"use client";

import CancioneroLecturaListaPanel from "@/components/cancionero/CancioneroLecturaListaPanel";
import type {
  LecturaCompasPlaybackState,
  LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import LetraCifradoLecturaShell from "@/components/cifrado/LetraCifradoLecturaShell";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
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
import { useLetraAutoScroll } from "@/hooks/useLetraAutoScroll";
import { useLetraZoom } from "@/hooks/useLetraZoom";
import { getLetraZoomStyle } from "@/lib/letra-zoom";
import {
  getLecturaFabMenuTopCss,
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
  getLetraTextScrollEndPadding,
} from "@/lib/sala-layout";
import type { CancionCancionero, CancionCifradoDetalle } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Minimize2,
  Music,
  Music2,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Type,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FLOAT_BTN_SECONDARY =
  "rounded-2xl border border-accent/50 bg-bg-dark text-text-primary shadow-[0_4px_16px_rgba(0,0,0,0.5)]";
const FLOAT_BTN_DISABLED = "pointer-events-none opacity-40";
const LECTURA_FAB_CASCADE_STEP_MS = 55;

type FabOptionProps = {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  cascadeIndex: number;
  disabled?: boolean;
  iconAfter?: boolean;
  className?: string;
};

function CancioneroLecturaFabOption({
  icon: Icon,
  label,
  onClick,
  cascadeIndex,
  disabled = false,
  iconAfter = false,
  className = "",
}: FabOptionProps) {
  const iconNode = <Icon className="size-4 shrink-0" aria-hidden="true" />;

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
  const [overlayAbierto, setOverlayAbierto] = useState(false);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [compasesOcultos, setCompasesOcultos] = useState(false);
  const [zoomPanelAbierto, setZoomPanelAbierto] = useState(false);
  const [tonoPanelAbierto, setTonoPanelAbierto] = useState(false);
  const [lecturaCompasPlayback, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
  const [lecturaTonalidad, setLecturaTonalidad] =
    useState<LecturaTonalidadState | null>(null);

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
    autoScrollLevel,
    accelerate: accelerateAutoScroll,
    decelerate: decelerateAutoScroll,
  } = useLetraAutoScroll(letraScrollRef, {
    enabled: open,
    contentKey,
  });

  const {
    level: letraZoomLevel,
    factor: letraZoomFactor,
    decrease: decreaseLetraZoom,
    increase: increaseLetraZoom,
  } = useLetraZoom(contentKey);

  const letraZoomStyle = getLetraZoomStyle(letraZoomFactor);
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
    if (!open) {
      return;
    }

    setCompasesOcultos(false);
    setLecturaCompasPlayback(null);
    setLecturaTonalidad(null);
    setZoomPanelAbierto(false);
    setTonoPanelAbierto(false);
    setOverlayAbierto(false);
  }, [contentKey, open]);

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

  useHardwareBack(open && !afinadorOpen, handleLecturaBack);

  if (!open || !portalMounted) {
    return null;
  }

  let cascadeIndex = 0;
  const showActivarCompases =
    Boolean(lecturaCompasPlayback?.hasCompases) && compasesOcultos;

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
              onToggleCompasesOcultos={() =>
                setCompasesOcultos((ocultos) => !ocultos)
              }
              onCompasPlaybackStateChange={
                handleLecturaCompasPlaybackStateChange
              }
              onTonalidadStateChange={handleLecturaTonalidadStateChange}
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

      <div
        className="fixed z-50 hidden flex-col items-end gap-2 lg:flex"
        style={{
          top: getLecturaTopChromeTopCss(),
          right: lecturaFixedRightCss,
        }}
      >
        <TapButton
          type="button"
          aria-label="Contraer"
          onClick={onContraer}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${LECTURA_TOP_CHIP}`}
        >
          <Minimize2 className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="text-text-primary">Contraer</span>
        </TapButton>
        <TapButton
          type="button"
          aria-label="Afinador"
          onClick={() => setAfinadorOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${LECTURA_TOP_CHIP}`}
        >
          <AudioLines className="size-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="text-text-primary">Afinador</span>
        </TapButton>
      </div>

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

      {overlayAbierto ? (
        <>
          <button
            type="button"
            data-no-tap-feedback
            className="fixed inset-0 z-40 cursor-default border-0 bg-transparent outline-none lg:hidden"
            aria-label="Cerrar menú de controles"
            onClick={() => setOverlayAbierto(false)}
          />

          <div
            className="pointer-events-none fixed z-40 flex flex-col items-end gap-2 lg:hidden"
            style={{
              top: getLecturaFabMenuTopCss(),
              right: lecturaFixedRightCss,
            }}
            role="menu"
            aria-label="Controles de modo lectura"
          >
            <CancioneroLecturaFabOption
              icon={Minimize2}
              label="Contraer"
              cascadeIndex={cascadeIndex++}
              onClick={onContraer}
            />
            {!menuCompacto ? (
              <>
                <CancioneroLecturaFabOption
                  icon={SkipBack}
                  label="Anterior"
                  cascadeIndex={cascadeIndex++}
                  disabled={!tieneAnterior}
                  onClick={() => {
                    setOverlayAbierto(false);
                    onAnterior();
                  }}
                  className="lg:hidden"
                />
                <CancioneroLecturaFabOption
                  icon={SkipForward}
                  label="Siguiente"
                  iconAfter
                  cascadeIndex={cascadeIndex++}
                  disabled={!tieneSiguiente}
                  onClick={() => {
                    setOverlayAbierto(false);
                    onSiguiente();
                  }}
                  className="lg:hidden"
                />
              </>
            ) : null}
            {showActivarCompases ? (
              <CancioneroLecturaFabOption
                icon={Music2}
                label="Activar compases"
                cascadeIndex={cascadeIndex++}
                onClick={() => {
                  setOverlayAbierto(false);
                  setCompasesOcultos(false);
                }}
              />
            ) : null}
            {lecturaTonalidad ? (
              <CancioneroLecturaFabOption
                icon={Music}
                label="Cambiar de tono"
                cascadeIndex={cascadeIndex++}
                onClick={() => {
                  setOverlayAbierto(false);
                  setTonoPanelAbierto(true);
                }}
                className="lg:hidden"
              />
            ) : null}
            {lecturaZoomEligible ? (
              <CancioneroLecturaFabOption
                icon={Type}
                label="Tamaño letra"
                cascadeIndex={cascadeIndex++}
                onClick={() => {
                  setOverlayAbierto(false);
                  setZoomPanelAbierto(true);
                }}
                className="lg:hidden"
              />
            ) : null}
            <CancioneroLecturaFabOption
              icon={AudioLines}
              label="Afinador"
              cascadeIndex={cascadeIndex++}
              onClick={() => {
                setOverlayAbierto(false);
                setAfinadorOpen(true);
              }}
            />
          </div>
        </>
      ) : null}

      <LecturaZoomPanel
        open={zoomPanelAbierto}
        level={letraZoomLevel}
        enabled={lecturaZoomEligible}
        onDecrease={decreaseLetraZoom}
        onIncrease={increaseLetraZoom}
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
        zoomLevel={letraZoomLevel}
        zoomEnabled={lecturaZoomEligible}
        onZoomDecrease={decreaseLetraZoom}
        onZoomIncrease={increaseLetraZoom}
        autoScrollLevel={autoScrollLevel}
        autoScrollEnabled
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

      <AfinadorLayer open={afinadorOpen} onOpenChange={setAfinadorOpen} />
    </div>,
    document.body,
  );
}
