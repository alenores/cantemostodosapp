"use client";

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
  type CifradoEditorPersistPayload,
  type CifradoEditorSession,
} from "@/lib/cifrado-editor-session";
import { clampBpm } from "@/lib/cifrado";
import { normalizeModoTonal } from "@/lib/cifrado-escala";
import { dispatchCancioneroSyncFinished } from "@/lib/offline/cancionero-events";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [session, setSession] = useState<CifradoEditorSession | null>(null);
  const [ready, setReady] = useState(false);
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

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
  }, [editingId, router, supabase]);

  const persistCancionero = useCallback(
    async (id: number | undefined, payload: CifradoEditorPersistPayload) => {
      if (id != null) {
        await updateCancionCifradoAvanzado(supabase, id, payload);
        return id;
      }

      const { data, error } = await supabase
        .from("canciones_guardadas")
        .insert({
          sala_id: null,
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

  const syncCancionero = useCallback(async () => {
    if (online) {
      try {
        await syncCancioneroLocal(supabase, { force: true });
      } catch {
        // La sync automática cubrirá el refresco.
      }
    }

    dispatchCancioneroSyncFinished();
  }, [online, supabase]);

  const handleSavedMobile = useCallback(async () => {
    await syncCancionero();
    router.push("/canciones/cancionero");
  }, [router, syncCancionero]);

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
          onClose={() => {}}
          onSaved={() => {
            void syncCancionero();
          }}
        />
      ) : (
        <CifradoEditorMobile
          session={session}
          isLoggedIn
          backHref="/canciones/cancionero"
          backAriaLabel="Volver al cancionero"
          onPersist={persistCancionero}
          onSaved={() => {
            void handleSavedMobile();
          }}
        />
      )}
    </div>
  );
}
