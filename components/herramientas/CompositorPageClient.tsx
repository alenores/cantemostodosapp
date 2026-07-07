"use client";

import CompositorModal from "@/components/ui/CompositorModal";
import { useCompositor } from "@/hooks/useCompositor";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { createClient } from "@/lib/supabase/client";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { useEffect, useMemo, useState } from "react";

export default function CompositorPageClient() {
  const online = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const compositor = useCompositor({
    isLoggedIn,
    online,
    cyclesEnabled: true,
  });

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsLoggedIn(
        Boolean(
          session?.user &&
            mapUserToUsuarioActivo(session.user).id !==
              OFFLINE_GUEST_USUARIO.id,
        ),
      );
    }

    void loadSession();
  }, [supabase]);

  useEffect(() => {
    return () => {
      compositor.stop();
    };
  }, [compositor.stop]);

  return (
    <div className="tool-page-layout flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <CompositorModal
        open
        presentation="page"
        isLoggedIn={isLoggedIn}
        online={online}
        onClose={() => {}}
        {...compositor}
      />
    </div>
  );
}
