"use client";

import CifradoEditor from "@/components/ui/CifradoEditor";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { dispatchCancioneroSyncFinished } from "@/lib/offline/cancionero-events";
import { syncCancioneroLocal } from "@/lib/offline/cancionero-sync";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function EditorCancionesPageClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;

  useEffect(() => {
    async function loadSession() {
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
      }
    }

    void loadSession();
  }, [router, supabase]);

  if (isLoggedIn !== true) {
    return null;
  }

  return (
    <div className="tool-page-layout flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <CifradoEditor
        open
        presentation="page"
        isLoggedIn
        onClose={() => {}}
        onSaved={async () => {
          if (online) {
            try {
              await syncCancioneroLocal(supabase, { force: true });
            } catch {
              // La sync automática cubrirá el refresco.
            }
          }

          dispatchCancioneroSyncFinished();
        }}
      />
    </div>
  );
}
