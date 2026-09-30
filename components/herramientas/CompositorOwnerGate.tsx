"use client";

import CompositorPageClient from "@/components/herramientas/CompositorPageClient";
import { getActiveUserId } from "@/lib/auth/offline-user";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo, useState } from "react";

export default function CompositorOwnerGate({ ownerUserId }: { ownerUserId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    let authChanged = false;
    void getActiveUserId(supabase).then((currentUserId) => {
      if (active && !authChanged) setAllowed(currentUserId === ownerUserId);
    }).catch(() => {
      if (active && !authChanged) setAllowed(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" && !session) return;
      authChanged = true;
      if (active) setAllowed(session?.user.id === ownerUserId);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [ownerUserId, supabase]);

  if (!allowed) return null;
  return <CompositorPageClient />;
}
