"use client";

import CifradoEditorMobile from "@/components/cifrado/CifradoEditorMobile";
import NotaCancionFab from "@/components/herramientas/NotaCancionFab";
import CifradoEditor from "@/components/ui/CifradoEditor";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import type { Anotacion } from "@/lib/anotaciones-practica";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import type {
  CifradoEditorSession,
  CifradoSaveResult,
} from "@/lib/cifrado-editor-session";
import {
  cancionPracticaToEditorSession,
  getCancionPractica,
  insertCancionPractica,
  updateCancionPractica,
  updateCancionPracticaNota,
} from "@/lib/canciones-practica";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const LIST_HREF = "/practica/entrenador-canciones";

function verHref(id: number): string {
  return `/practica/entrenador-canciones/ver?id=${id}`;
}

/**
 * Misma base que EditorCancionesPageClient:
 * PC → CifradoEditor / celular → CifradoEditorMobile.
 * Solo cambia el destino de guardado (canciones_practica).
 */
export default function EntrenadorCancionesEditorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigateWithProgress = useNavigateWithProgress();
  const supabase = useMemo(() => createClient(), []);
  const isDesktop = useIsDesktop();
  const idParam = searchParams.get("id");
  const editingId = idParam ? Number(idParam) : null;

  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [session, setSession] = useState<CifradoEditorSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [notaSaving, setNotaSaving] = useState(false);
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);

  const backHref =
    editingId != null && !Number.isNaN(editingId) ? verHref(editingId) : LIST_HREF;

  const goBack = useCallback(() => {
    navigateWithProgress(backHref);
  }, [backHref, navigateWithProgress]);

  useHardwareBack(true, goBack);

  useEffect(() => {
    async function load() {
      const {
        data: { session: authSession },
      } = await supabase.auth.getSession();

      const loggedIn = Boolean(
        authSession?.user &&
          mapUserToUsuarioActivo(authSession.user).id !==
            OFFLINE_GUEST_USUARIO.id,
      );

      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        router.replace("/");
        return;
      }

      if (editingId == null || Number.isNaN(editingId)) {
        setSession(null);
        setAnotaciones([]);
        setReady(true);
        return;
      }

      try {
        const cancion = await getCancionPractica(supabase, editingId);

        if (!cancion) {
          setError("No se encontró la canción de práctica.");
          setReady(true);
          return;
        }

        setSession(cancionPracticaToEditorSession(cancion));
        setNota(cancion.nota_general ?? "");
        setAnotaciones(cancion.anotaciones ?? []);
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
  }, [editingId, router, supabase]);

  const persistPractica = useCallback(
    async (
      id: number | undefined,
      payload: Parameters<typeof insertCancionPractica>[1],
    ) => {
      const payloadConAnotaciones = { ...payload, anotaciones };

      if (id != null) {
        await updateCancionPractica(supabase, id, payloadConAnotaciones);
        return id;
      }

      return insertCancionPractica(supabase, payloadConAnotaciones);
    },
    [anotaciones, supabase],
  );

  const handleSaveNota = useCallback(
    async (value: string) => {
      if (editingId == null || Number.isNaN(editingId)) {
        return;
      }

      setNotaSaving(true);

      try {
        await updateCancionPracticaNota(supabase, editingId, value);
        setNota(value.trim());
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "No se pudo guardar la nota",
        );
      } finally {
        setNotaSaving(false);
      }
    },
    [editingId, supabase],
  );

  const handleSaved = useCallback(
    (result?: CifradoSaveResult) => {
      if (result?.id != null) {
        navigateWithProgress(verHref(result.id));
        return;
      }

      navigateWithProgress(LIST_HREF);
    },
    [navigateWithProgress],
  );

  if (isLoggedIn !== true || !ready) {
    return null;
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <p className="text-center text-sm text-red-200">{error}</p>
        <button
          type="button"
          onClick={goBack}
          className="rounded-[10px] bg-bg-card px-4 py-2 text-sm font-semibold text-text-primary"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="tool-page-layout flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      {isDesktop ? (
        <CifradoEditor
          open
          presentation="page"
          isLoggedIn
          session={session}
          onClose={goBack}
          showPageClose
          onPersist={persistPractica}
          onSaved={handleSaved}
          anotaciones={{ items: anotaciones, onChange: setAnotaciones }}
        />
      ) : (
        <CifradoEditorMobile
          session={session}
          isLoggedIn
          onClose={goBack}
          exitIcon="close"
          backAriaLabel="Cerrar editor"
          onPersist={persistPractica}
          onSaved={handleSaved}
          anotaciones={{ items: anotaciones, onChange: setAnotaciones }}
        />
      )}

      {editingId != null && !Number.isNaN(editingId) ? (
        <NotaCancionFab
          mode="edit"
          nota={nota}
          onSave={handleSaveNota}
          saving={notaSaving}
        />
      ) : null}
    </div>
  );
}
