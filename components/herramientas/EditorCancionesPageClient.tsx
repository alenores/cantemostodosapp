"use client";

import { hayConexion } from "@/lib/conexion";
import CifradoEditorMobile from "@/components/cifrado/CifradoEditorMobile";
import CifradoEditor from "@/components/ui/CifradoEditor";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  fetchCancionCifradoDetalle,
  updateCancionCifradoAvanzado,
} from "@/lib/cancionero";
import {
  buildCifradoEditorSession,
  type CifradoSaveResult,
  type CifradoEditorPersistPayload,
  type CifradoEditorSession,
} from "@/lib/cifrado-editor-session";
import { clampBpm } from "@/lib/cifrado";
import { normalizeModoTonal } from "@/lib/cifrado-escala";
import {
  dispatchCancioneroSyncFinished,
  requestCancioneroUpdateCheck,
} from "@/lib/offline/cancionero-events";
import {
  getCancioneroLocalAll,
  mergeCancioneroLocalUpdates,
} from "@/lib/offline/cancionero-store";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function EditorCancionesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const isDesktop = useIsDesktop();
  const idParam = searchParams.get("id");
  const editingId = idParam ? Number(idParam) : null;
  const desde = searchParams.get("desde");
  const backHref =
    desde === "hub" ? "/canciones" : "/canciones/cancionero";
  const backAriaLabel =
    desde === "hub" ? "Volver a Canciones" : "Volver al cancionero";
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [session, setSession] = useState<CifradoEditorSession | null>(null);
  const [ready, setReady] = useState(false);
  const online = hayConexion();

  useEffect(() => {
    async function loadSession() {
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
        setReady(true);
        return;
      }

      try {
        const { data: ownerRow, error: ownerError } = await supabase
          .from("canciones_guardadas")
          .select("user_id")
          .eq("id", editingId)
          .is("sala_id", null)
          .maybeSingle();

        if (ownerError) throw ownerError;
        if (!ownerRow || ownerRow.user_id !== authSession?.user.id) {
          router.replace(backHref);
          return;
        }

        const detalle = await fetchCancionCifradoDetalle(supabase, editingId);

        if (detalle) {
          setSession(
            buildCifradoEditorSession({
              cancionId: editingId,
              nombre: detalle.nombre,
              artista: detalle.artista ?? "",
              letra: detalle.letra ?? "",
              esAvanzada: true,
              detalle,
            }),
          );
        } else {
          const { data } = await supabase
            .from("canciones_guardadas")
            .select("nombre, artista, letra")
            .eq("id", editingId)
            .is("sala_id", null)
            .maybeSingle();

          if (data) {
            setSession(
              buildCifradoEditorSession({
                cancionId: editingId,
                nombre: data.nombre,
                artista: data.artista ?? "",
                letra: data.letra ?? "",
                esAvanzada: false,
              }),
            );
          }
        }
      } catch {
        // Si falla la carga, se abre el editor en blanco.
      }

      setReady(true);
    }

    void loadSession();
  }, [backHref, editingId, router, supabase]);

  const persistCancionero = useCallback(
    async (id: number | undefined, payload: CifradoEditorPersistPayload) => {
      if (id != null) {
        await updateCancionCifradoAvanzado(supabase, id, payload);
        return id;
      }

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        throw new Error("Iniciá sesión para guardar la canción.");
      }

      const { data, error } = await supabase
        .from("canciones_guardadas")
        .insert({
          sala_id: null,
          user_id: authData.user.id,
          url_letra: null,
          nombre: payload.nombre.trim(),
          artista: payload.artista?.trim() || null,
          letra: payload.letra,
          cifrado: payload.cifrado,
          compas_config: payload.compas_config,
          tonalidad_default: payload.tonalidad_default,
          modo_tonal_default: normalizeModoTonal(payload.modo_tonal_default),
          bpm_default: clampBpm(payload.bpm_default),
          tiene_cifrado_avanzado: true,
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return Number(data.id);
    },
    [supabase],
  );

  const actualizarCopiaLocalEditada = useCallback(
    async (result?: CifradoSaveResult) => {
      if (!result) return;

      try {
        const localSongs = await getCancioneroLocalAll();
        if (!localSongs.some((song) => song.id === result.id)) return;

        const { data, error } = await supabase
          .from("canciones_guardadas")
          .select(
            "id, nombre, artista, letra, url_letra, updated_at, tiene_cifrado_avanzado, user_id, cifrado, compas_config, tonalidad_default, modo_tonal_default, bpm_default",
          )
          .eq("id", result.id)
          .is("sala_id", null)
          .maybeSingle();

        if (error || !data?.updated_at) return;

        await mergeCancioneroLocalUpdates([
          {
            ...data,
            url_letra: data.url_letra ?? "",
            updated_at: new Date(data.updated_at).toISOString(),
          },
        ]);
        dispatchCancioneroSyncFinished();
      } catch {
        // La consulta general de novedades queda como respaldo.
      }
    },
    [supabase],
  );

  const syncCancionero = useCallback(async () => {
    if (online) requestCancioneroUpdateCheck();
  }, [online]);

  const handleSavedMobile = useCallback(async (result?: CifradoSaveResult) => {
    await actualizarCopiaLocalEditada(result);
    await syncCancionero();
    router.push(backHref);
  }, [actualizarCopiaLocalEditada, backHref, router, syncCancionero]);

  const handleSavedDesktop = useCallback(async (result?: CifradoSaveResult) => {
    await actualizarCopiaLocalEditada(result);
    await syncCancionero();
  }, [actualizarCopiaLocalEditada, syncCancionero]);

  if (isLoggedIn !== true || (editingId != null && !ready)) {
    return null;
  }

  return (
    <div className="tool-page-layout flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      {isDesktop ? (
        <CifradoEditor
          open
          presentation="page"
          isLoggedIn
          session={session}
          onClose={() => {
            router.push(backHref);
          }}
          showPageClose
          onSaved={(result) => void handleSavedDesktop(result)}
        />
      ) : (
        <CifradoEditorMobile
          session={session}
          isLoggedIn
          showBasicSongsTab
          backHref={backHref}
          backAriaLabel={backAriaLabel}
          onPersist={persistCancionero}
          onSaved={(result) => void handleSavedMobile(result)}
        />
      )}
    </div>
  );
}
