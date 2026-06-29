"use client";

import { parsePresenceState } from "@/lib/presence";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { PresenceUsuario } from "@/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

export function useSalasPresence(
  salaIds: number[],
  enabled: boolean,
): Record<number, PresenceUsuario[]> {
  const [presenceBySalaId, setPresenceBySalaId] = useState<
    Record<number, PresenceUsuario[]>
  >({});

  const salaIdsKey = useMemo(
    () =>
      salaIds
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    [salaIds],
  );

  useEffect(() => {
    const ids = salaIdsKey
      ? salaIdsKey.split(",").map((id) => Number(id))
      : [];

    if (!enabled || ids.length === 0) {
      setPresenceBySalaId({});
      return;
    }

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];
    let cancelled = false;

    function updateSalaPresence(salaId: number, channel: RealtimeChannel) {
      const usuarios = parsePresenceState(channel.presenceState());
      setPresenceBySalaId((current) => ({
        ...current,
        [salaId]: usuarios,
      }));
    }

    async function subscribeAll() {
      const authed = await ensureRealtimeAuth(supabase);

      if (cancelled || !authed) {
        return;
      }

      for (const salaId of ids) {
        const channel = supabase
          .channel(`presence-sala-${salaId}`)
          .on("presence", { event: "sync" }, () => {
            updateSalaPresence(salaId, channel);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              updateSalaPresence(salaId, channel);
            }
          });

        channels.push(channel);
      }
    }

    void subscribeAll();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();

      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, salaIdsKey]);

  return presenceBySalaId;
}
