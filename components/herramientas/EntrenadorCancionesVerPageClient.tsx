"use client";

import LetraCifradoLecturaShell, {
  type LecturaCompasPlaybackState,
  type LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import LecturaTogglesFab from "@/components/herramientas/LecturaTogglesFab";
import NotaCancionFab from "@/components/herramientas/NotaCancionFab";
import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import {
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
import { ArrowLeft, NotebookPen, X } from "lucide-react";
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

  const [compasesOcultos, setCompasesOcultos] = useState(false);
  const [acordesOcultos, setAcordesOcultos] = useState(false);
  const [anotacionesVisibility, setAnotacionesVisibility] =
    useState<AnotacionVisibility>(DEFAULT_ANOTACION_VISIBILITY);
  const [notaLectura, setNotaLectura] = useState<Anotacion | null>(null);
  const [notaGeneralOpen, setNotaGeneralOpen] = useState(false);

  const [, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
  const [, setLecturaTonalidad] = useState<LecturaTonalidadState | null>(null);

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

  useHardwareBack(notaLectura !== null, () => setNotaLectura(null));
  useHardwareBack(
    notaLectura === null && !notaGeneralOpen,
    goToList,
  );
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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app max-lg:fixed max-lg:inset-0 max-lg:z-40 max-lg:h-dvh">
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-bg-darker px-4 py-3">
        <TapButton
          type="button"
          aria-label="Volver al Entrenador de canciones"
          onClick={goToList}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-bg-card"
        >
          <ArrowLeft className="size-5 text-text-primary" aria-hidden="true" />
        </TapButton>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-text-primary">
            {cancion?.nombre ?? "Canción"}
          </p>
          {cancion?.artista ? (
            <p className="truncate text-xs text-text-muted">
              {cancion.artista}
            </p>
          ) : null}
        </div>
      </header>

      {detalle ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LetraCifradoLecturaShell
            detalle={detalle}
            scrollRef={scrollRef}
            scrollEndPadding={getLetraTextScrollEndPadding()}
            compasesOcultos={compasesOcultos}
            onToggleCompasesOcultos={() =>
              setCompasesOcultos((ocultos) => !ocultos)
            }
            acordesOcultos={acordesOcultos}
            onToggleAcordesOcultos={() =>
              setAcordesOcultos((ocultos) => !ocultos)
            }
            onCompasPlaybackStateChange={setLecturaCompasPlayback}
            onTonalidadStateChange={setLecturaTonalidad}
            anotaciones={anotaciones}
            anotacionesVisibility={anotacionesVisibility}
            onToggleAnotacionTipo={toggleAnotacionTipo}
            onOpenNota={(anotacion) => setNotaLectura(anotacion)}
            onOpenNotaGeneral={openNotaGeneral}
            tieneNotaGeneral={tieneNotaGeneral}
            onEdit={goToEditor}
          />
        </div>
      ) : null}

      <LecturaTogglesFab
        compasesDisponibles={hasCompases}
        compasesOcultos={compasesOcultos}
        onToggleCompases={() => setCompasesOcultos((ocultos) => !ocultos)}
        acordesOcultos={acordesOcultos}
        onToggleAcordes={() => setAcordesOcultos((ocultos) => !ocultos)}
        anotacionesVisibility={anotacionesVisibility}
        anotacionTiposPresentes={anotacionTiposPresentes}
        onToggleAnotacionTipo={toggleAnotacionTipo}
        onOpenNotaGeneral={openNotaGeneral}
        tieneNotaGeneral={tieneNotaGeneral}
        onEdit={goToEditor}
      />

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
