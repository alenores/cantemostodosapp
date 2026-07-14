"use client";

import LetraCifradoLecturaShell, {
  type LecturaCompasPlaybackState,
  type LecturaTonalidadState,
} from "@/components/cifrado/LetraCifradoLecturaShell";
import NotaCancionFab from "@/components/herramientas/NotaCancionFab";
import { TapButton } from "@/components/ui/TapFeedback";
import { useHardwareBack } from "@/hooks/useHardwareBack";
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
import { ArrowLeft, Eye, EyeOff, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TogglePillProps = {
  active: boolean;
  onLabel: string;
  offLabel: string;
  onClick: () => void;
};

function TogglePill({ active, onLabel, offLabel, onClick }: TogglePillProps) {
  return (
    <TapButton
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-2 text-xs font-semibold text-text-primary"
    >
      {active ? (
        <Eye className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <EyeOff className="size-4 shrink-0" aria-hidden="true" />
      )}
      {active ? offLabel : onLabel}
    </TapButton>
  );
}

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

  const [, setLecturaCompasPlayback] =
    useState<LecturaCompasPlaybackState | null>(null);
  const [, setLecturaTonalidad] = useState<LecturaTonalidadState | null>(null);

  const goToList = useCallback(() => {
    navigateWithProgress("/practica/entrenador-canciones");
  }, [navigateWithProgress]);

  const goToEditor = useCallback(() => {
    if (id == null) {
      return;
    }

    navigateWithProgress(`/practica/entrenador-canciones/editor?id=${id}`);
  }, [id, navigateWithProgress]);

  useHardwareBack(true, goToList);

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
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
        <TapButton
          type="button"
          aria-label="Editar canción"
          onClick={goToEditor}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-entrenador-canciones)] text-[var(--text-on-light)]"
        >
          <Pencil className="size-5" aria-hidden="true" />
        </TapButton>
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
          />
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-bg-darker px-4 py-2.5 lg:hidden">
        {hasCompases ? (
          <TogglePill
            active={!compasesOcultos}
            onLabel="Mostrar compases"
            offLabel="Ocultar compases"
            onClick={() => setCompasesOcultos((ocultos) => !ocultos)}
          />
        ) : null}
        <TogglePill
          active={!acordesOcultos}
          onLabel="Mostrar acordes"
          offLabel="Ocultar acordes"
          onClick={() => setAcordesOcultos((ocultos) => !ocultos)}
        />
      </div>

      <NotaCancionFab mode="view" nota={cancion?.nota_general ?? ""} />
    </div>
  );
}
