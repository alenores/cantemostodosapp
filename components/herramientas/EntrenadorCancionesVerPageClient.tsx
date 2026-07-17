"use client";

import LetraCifradoLecturaShell from "@/components/cifrado/LetraCifradoLecturaShell";
import NotaCancionFab from "@/components/herramientas/NotaCancionFab";
import LecturaBottomControls from "@/components/home/LecturaBottomControls";
import { type LecturaFabItem } from "@/components/home/LecturaFabOption";
import LecturaPcTopChrome from "@/components/home/LecturaPcTopChrome";
import ModoLecturaOverlay from "@/components/home/ModoLecturaOverlay";
import LecturaTonoPanel from "@/components/home/LecturaTonoPanel";
import LecturaZoomPanel from "@/components/home/LecturaZoomPanel";
import LecturaCancionChip, {
  LECTURA_TOP_CHIP,
} from "@/components/salas/LecturaCancionChip";
import AfinadorLayer from "@/components/ui/AfinadorLayer";
import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useModoLecturaCocina } from "@/hooks/useModoLecturaCocina";
import { getLetraZoomStyle } from "@/lib/letra-zoom";
import {
  getLecturaFixedRightCss,
  getLecturaTopChromeTopCss,
} from "@/lib/sala-layout";
import {
  ANOTACION_TIPO_LABEL,
  DEFAULT_ANOTACION_VISIBILITY,
  type Anotacion,
  type AnotacionTipo,
  type AnotacionVisibility,
} from "@/lib/anotaciones-practica";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  cancionPracticaToDetalle,
  getCancionPractica,
  type CancionPractica,
} from "@/lib/canciones-practica";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { getLetraTextScrollEndPadding } from "@/lib/sala-layout";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import {
  Eye,
  EyeOff,
  NotebookPen,
  Pencil,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function EntrenadorCancionesVerPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateWithProgress = useNavigateWithProgress();
  const supabase = useMemo(() => createClient(), []);
  const idParam = searchParams.get("id");
  const id = idParam ? Number(idParam) : null;

  const scrollRef = useRef<HTMLDivElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [cancion, setCancion] = useState<CancionPractica | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anotacionesVisibility, setAnotacionesVisibility] =
    useState<AnotacionVisibility>(DEFAULT_ANOTACION_VISIBILITY);
  const [notaLectura, setNotaLectura] = useState<Anotacion | null>(null);
  const [notaGeneralOpen, setNotaGeneralOpen] = useState(false);

  const cocina = useModoLecturaCocina({
    active: true,
    scrollRef,
    contentKey: id,
  });
  const {
    overlayAbierto,
    setOverlayAbierto,
    compasesOcultos,
    toggleCompasesOcultos,
    acordesOcultos,
    toggleAcordesOcultos,
    zoomPanelAbierto,
    setZoomPanelAbierto,
    tonoPanelAbierto,
    setTonoPanelAbierto,
    abrirZoom,
    abrirTono,
    afinadorOpen,
    setAfinadorOpen,
    lecturaCompasPlayback,
    handleLecturaCompasPlaybackStateChange,
    lecturaTonalidad,
    handleLecturaTonalidadStateChange,
    autoScroll,
    zoom,
    temaLectura,
    cambiarTemaLectura,
  } = cocina;

  const letraZoomStyle = getLetraZoomStyle(zoom.factor);
  const lecturaFixedRightCss = getLecturaFixedRightCss();

  const toggleAnotacionTipo = useCallback((tipo: AnotacionTipo) => {
    setAnotacionesVisibility((current) => ({
      ...current,
      [tipo]: !current[tipo],
    }));
  }, []);

  const goToList = useCallback(() => {
    navigateWithProgress("/practica/entrenador-canciones");
  }, [navigateWithProgress]);

  const goToEditor = useCallback(() => {
    if (id == null) {
      return;
    }

    navigateWithProgress(`/practica/entrenador-canciones/editor?id=${id}`);
  }, [id, navigateWithProgress]);

  const handleLecturaBack = useCallback(() => {
    if (notaLectura) {
      setNotaLectura(null);
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

    goToList();
  }, [
    goToList,
    notaLectura,
    overlayAbierto,
    setOverlayAbierto,
    setTonoPanelAbierto,
    setZoomPanelAbierto,
    tonoPanelAbierto,
    zoomPanelAbierto,
  ]);

  useHardwareBack(!notaGeneralOpen && !afinadorOpen, handleLecturaBack);
  useBodyScrollLock(true);

  useEffect(() => {
    document.body.setAttribute("data-modo-lectura", "true");

    return () => {
      document.body.removeAttribute("data-modo-lectura");
    };
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const loggedIn = Boolean(
        session?.user &&
          mapUserToUsuarioActivo(session.user).id !== OFFLINE_GUEST_USUARIO.id,
      );

      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        router.replace("/");
        return;
      }

      if (id == null || Number.isNaN(id)) {
        setError("Canción no encontrada.");
        setReady(true);
        return;
      }

      try {
        const data = await getCancionPractica(supabase, id);

        if (!data) {
          setError("No se encontró la canción de práctica.");
          setReady(true);
          return;
        }

        setCancion(data);
        setReady(true);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo abrir la canción",
        );
        setReady(true);
      }
    }

    void load();
  }, [id, router, supabase]);

  const detalle = useMemo(
    () => (cancion ? cancionPracticaToDetalle(cancion) : null),
    [cancion],
  );

  const hasCompases = Boolean(cancion?.compas_config?.barras?.length);
  const notaGeneral = cancion?.nota_general ?? "";
  const tieneNotaGeneral = notaGeneral.trim().length > 0;
  const anotaciones = useMemo(() => cancion?.anotaciones ?? [], [cancion]);
  const anotacionTiposPresentes = useMemo(
    () => Array.from(new Set(anotaciones.map((anotacion) => anotacion.tipo))),
    [anotaciones],
  );

  const openNotaGeneral = useCallback(() => {
    setNotaGeneralOpen(true);
  }, []);

  const lecturaExtraItems = useMemo<LecturaFabItem[]>(() => {
    const items: LecturaFabItem[] = anotacionTiposPresentes.map((tipo) => ({
      key: `anotacion-${tipo}`,
      icon: anotacionesVisibility[tipo] ? EyeOff : Eye,
      label: `${anotacionesVisibility[tipo] ? "Ocultar" : "Mostrar"} ${ANOTACION_TIPO_LABEL[tipo].toLowerCase()}`,
      onClick: () => toggleAnotacionTipo(tipo),
    }));

    items.push({
      key: "nota-general",
      icon: NotebookPen,
      label: "Nota de la canción",
      onClick: openNotaGeneral,
    });

    items.push({
      key: "editar",
      icon: Pencil,
      label: "Editar",
      onClick: goToEditor,
    });

    return items;
  }, [
    anotacionTiposPresentes,
    anotacionesVisibility,
    goToEditor,
    openNotaGeneral,
    toggleAnotacionTipo,
  ]);

  if (isLoggedIn !== true || !ready) {
    return null;
  }

  if (error && !cancion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-center text-sm text-red-200">{error}</p>
        <button
          type="button"
          onClick={goToList}
          className="rounded-[10px] bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary"
        >
          Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-sala max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:h-dvh">
      {detalle ? (
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <LecturaCancionChip
            nombre={cancion?.nombre ?? "Canción"}
            artista={cancion?.artista}
            nombreRevealKey={String(id ?? "")}
            nombreRevealClass=""
          />
          <LetraCifradoLecturaShell
            detalle={detalle}
            scrollRef={scrollRef}
            scrollEndPadding={getLetraTextScrollEndPadding()}
            letraZoomStyle={letraZoomStyle}
            compasesOcultos={compasesOcultos}
            onToggleCompasesOcultos={toggleCompasesOcultos}
            acordesOcultos={acordesOcultos}
            onToggleAcordesOcultos={toggleAcordesOcultos}
            onCompasPlaybackStateChange={handleLecturaCompasPlaybackStateChange}
            onTonalidadStateChange={handleLecturaTonalidadStateChange}
            anotaciones={anotaciones}
            anotacionesVisibility={anotacionesVisibility}
            onToggleAnotacionTipo={toggleAnotacionTipo}
            onOpenNota={(anotacion) => setNotaLectura(anotacion)}
            onOpenNotaGeneral={openNotaGeneral}
            tieneNotaGeneral={tieneNotaGeneral}
            onEdit={goToEditor}
            temaLectura={temaLectura}
            onTemaLecturaChange={cambiarTemaLectura}
          />
        </div>
      ) : null}

      <LecturaPcTopChrome
        fixedRightCss={lecturaFixedRightCss}
        onContraer={goToList}
        onAfinador={() => setAfinadorOpen(true)}
      />

      <TapButton
        type="button"
        aria-label={
          overlayAbierto ? "Cerrar controles" : "Abrir controles de modo lectura"
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
          <SlidersHorizontal className="size-4 text-accent" aria-hidden="true" />
        )}
      </TapButton>

      <ModoLecturaOverlay
        abierto={overlayAbierto}
        fixedRightCss={lecturaFixedRightCss}
        mobileOnly
        hasCompases={hasCompases}
        compasesOcultos={compasesOcultos}
        acordesOcultos={acordesOcultos}
        showAcordesOption
        showTonoOption={Boolean(lecturaTonalidad)}
        showZoomOption
        extraItems={lecturaExtraItems}
        onCerrar={() => setOverlayAbierto(false)}
        onContraer={goToList}
        onAfinador={() => setAfinadorOpen(true)}
        onActivarCompases={() => toggleCompasesOcultos()}
        onToggleAcordesOcultos={toggleAcordesOcultos}
        onAbrirZoom={abrirZoom}
        onAbrirTono={abrirTono}
        temaLectura={temaLectura}
        onTemaLecturaChange={cambiarTemaLectura}
      />

      {detalle ? (
        <>
          <LecturaZoomPanel
            open={zoomPanelAbierto}
            level={zoom.level}
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
            showZoom
            zoomLevel={zoom.level}
            onZoomDecrease={zoom.decrease}
            onZoomIncrease={zoom.increase}
            autoScrollLevel={autoScroll.autoScrollLevel}
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
        </>
      ) : null}

      <NotaCancionFab
        mode="view"
        nota={notaGeneral}
        hideTrigger
        open={notaGeneralOpen}
        onOpenChange={setNotaGeneralOpen}
      />

      {notaLectura
        ? createPortal(
            <div className="fixed inset-0 z-[95] flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
              <button
                type="button"
                aria-label="Cerrar nota"
                className="absolute inset-0 bg-black/60"
                onClick={() => setNotaLectura(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Nota del renglón"
                className="relative z-10 flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-xl"
              >
                <header className="flex shrink-0 items-center gap-2.5 border-b border-border px-4 py-3">
                  <NotebookPen
                    className="size-5 shrink-0 text-[var(--accent-entrenador-canciones)]"
                    aria-hidden="true"
                  />
                  <h2 className="min-w-0 flex-1 text-base font-extrabold text-text-primary">
                    Nota del renglón
                  </h2>
                  <TapButton
                    type="button"
                    aria-label="Cerrar"
                    onClick={() => setNotaLectura(null)}
                    className="flex size-9 items-center justify-center rounded-full bg-bg-dark"
                  >
                    <X className="size-4 text-text-primary" aria-hidden="true" />
                  </TapButton>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                    {notaLectura.texto?.trim()
                      ? notaLectura.texto
                      : "Esta nota está vacía."}
                  </p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
