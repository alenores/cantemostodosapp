"use client";

import {
  fetchPublicCompositorCycles,
  type CompositorCommunityCycle,
} from "@/lib/compositor-cycles";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseCompositorCommunityCyclesOptions = {
  isLoggedIn: boolean;
  online: boolean;
  enabled: boolean;
};

export function useCompositorCommunityCycles({
  isLoggedIn,
  online,
  enabled,
}: UseCompositorCommunityCyclesOptions) {
  const supabase = useMemo(() => createClient(), []);
  const supabaseRef = useRef<SupabaseClient>(supabase);
  supabaseRef.current = supabase;

  const [communityCycles, setCommunityCycles] = useState<CompositorCommunityCycle[]>(
    [],
  );
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);

  const refreshCommunityCycles = useCallback(async () => {
    if (!isLoggedIn || !online) {
      setCommunityCycles([]);
      setCommunityError(null);
      return;
    }

    setCommunityLoading(true);
    setCommunityError(null);

    try {
      const cycles = await fetchPublicCompositorCycles(supabaseRef.current);
      setCommunityCycles(cycles);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los ciclos de la comunidad.";
      setCommunityError(message);
      setCommunityCycles([]);
    } finally {
      setCommunityLoading(false);
    }
  }, [isLoggedIn, online]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshCommunityCycles();
  }, [enabled, refreshCommunityCycles]);

  return {
    communityCycles,
    communityLoading,
    communityError,
    refreshCommunityCycles,
  };
}

export type UseCompositorCommunityCyclesResult = ReturnType<
  typeof useCompositorCommunityCycles
>;
