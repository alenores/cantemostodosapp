"use client";

import {
  LECTURA_SCROLL_SYNC_EVENT,
  type LecturaScrollSyncMessage,
  type LecturaScrollSyncState,
} from "@/lib/lectura-scroll-sync";
import { createClient, ensureRealtimeAuth } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef } from "react";

type UseSalaLecturaSyncOptions = {
  salaId: number;
  contentKey: string | null;
  userId: string | null;
  online: boolean;
  onRemoteState: (state: LecturaScrollSyncState) => void;
};

export function useSalaLecturaSync({
  salaId,
  contentKey,
  userId,
  online,
  onRemoteState,
}: UseSalaLecturaSyncOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRemoteStateRef = useRef(onRemoteState);

  useEffect(() => {
    onRemoteStateRef.current = onRemoteState;
  }, [onRemoteState]);

  const broadcastState = useCallback(
    (state: LecturaScrollSyncState) => {
      const channel = channelRef.current;

      if (!channel || !contentKey || !userId) {
        return;
      }

      const payload: LecturaScrollSyncMessage = {
        ...state,
        contentKey,
        senderId: userId,
      };

      void channel.send({
        type: "broadcast",
        event: LECTURA_SCROLL_SYNC_EVENT,
        payload,
      });
    },
    [contentKey, userId],
  );

  useEffect(() => {
    if (!online || !contentKey || !userId) {
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    async function subscribe() {
      const authed = await ensureRealtimeAuth(supabase);

      if (cancelled || !authed) {
        return;
      }

      const topic = `lectura-scroll-sala-${salaId}`;
      const stale = supabase
        .getChannels()
        .find((channel) => channel.topic === `realtime:${topic}`);

      if (stale) {
        await supabase.removeChannel(stale);
      }

      if (cancelled) {
        return;
      }

      const channel = supabase
        .channel(topic)
        .on("broadcast", { event: LECTURA_SCROLL_SYNC_EVENT }, ({ payload }) => {
          const message = payload as Partial<LecturaScrollSyncMessage>;

          if (
            !message ||
            message.senderId === userId ||
            message.contentKey !== contentKey ||
            typeof message.level !== "number" ||
            typeof message.offsetRatio !== "number" ||
            typeof message.anchorMs !== "number"
          ) {
            return;
          }

          onRemoteStateRef.current({
            level: message.level,
            offsetRatio: message.offsetRatio,
            anchorMs: message.anchorMs,
          });
        })
        .subscribe();

      channelRef.current = channel;
    }

    void subscribe();

    return () => {
      cancelled = true;

      const channel = channelRef.current;
      channelRef.current = null;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [contentKey, online, salaId, userId]);

  return { broadcastState };
}
