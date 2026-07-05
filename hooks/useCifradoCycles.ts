"use client";

import {
  createCompositorCycleFromPiece,
  fetchRemoteCompositorCycles,
  insertRemoteCompositorCycle,
  mergeCompositorCyclesForDisplay,
  normalizeCycleName,
  readLocalCompositorCycles,
  suggestCompositorCycleName,
  upsertCycleInList,
  writeLocalCompositorCycles,
  type CompositorCycle,
} from "@/lib/compositor-cycles";
import { normalizeCompositorPiece, type CompositorPiece } from "@/lib/compositor";
import { buildCompositorCyclePieceLookup } from "@/lib/cifrado-cycle-playback";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseCifradoCyclesOptions = {
  isLoggedIn?: boolean;
  online?: boolean;
  enabled: boolean;
};

export function useCifradoCycles({
  isLoggedIn: isLoggedInProp,
  online = typeof navigator !== "undefined" ? navigator.onLine : true,
  enabled,
}: UseCifradoCyclesOptions) {
  const supabase = useMemo(() => createClient(), []);
  const supabaseRef = useRef<SupabaseClient>(supabase);
  supabaseRef.current = supabase;
  const [isLoggedInDetected, setIsLoggedInDetected] = useState(false);

  useEffect(() => {
    if (isLoggedInProp !== undefined) {
      return;
    }

    void supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedInDetected(Boolean(user));
    });
  }, [isLoggedInProp, supabase]);

  const isLoggedIn = isLoggedInProp ?? isLoggedInDetected;

  const [savedCycles, setSavedCycles] = useState<CompositorCycle[]>(() =>
    enabled ? readLocalCompositorCycles() : [],
  );
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [cyclesError, setCyclesError] = useState<string | null>(null);

  const refreshCycles = useCallback(async () => {
    setCyclesLoading(true);
    setCyclesError(null);

    try {
      const localCycles = readLocalCompositorCycles();

      if (isLoggedIn && online) {
        const remoteCycles = await fetchRemoteCompositorCycles(supabaseRef.current);
        const localOnly = localCycles.filter((cycle) => cycle.storage === "local");
        const merged = mergeCompositorCyclesForDisplay(remoteCycles, localOnly);
        writeLocalCompositorCycles(merged);
        setSavedCycles(merged);
        return;
      }

      setSavedCycles(localCycles);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudieron cargar los ciclos.";
      setCyclesError(message);
      setSavedCycles(readLocalCompositorCycles());
    } finally {
      setCyclesLoading(false);
    }
  }, [isLoggedIn, online]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshCycles();
  }, [enabled, refreshCycles]);

  const cyclesById = useMemo(
    () => buildCompositorCyclePieceLookup(savedCycles),
    [savedCycles],
  );

  const saveCycle = useCallback(
    async (nombre: string, piece: CompositorPiece) => {
      const normalizedName = normalizeCycleName(nombre);

      if (!normalizedName) {
        throw new Error("Escribí un nombre para el ciclo.");
      }

      setCyclesLoading(true);
      setCyclesError(null);

      try {
        const draft = createCompositorCycleFromPiece(
          normalizedName,
          normalizeCompositorPiece(piece),
          isLoggedIn && online ? "remote" : "local",
        );

        let saved = draft;

        if (isLoggedIn && online) {
          saved = await insertRemoteCompositorCycle(supabaseRef.current, draft);
        }

        setSavedCycles((current) => {
          const next = upsertCycleInList(current, saved);
          writeLocalCompositorCycles(next);
          return next;
        });

        return saved;
      } finally {
        setCyclesLoading(false);
      }
    },
    [isLoggedIn, online],
  );

  return {
    savedCycles,
    cyclesById,
    cyclesLoading,
    cyclesError,
    refreshCycles,
    saveCycle,
    suggestCycleName: useCallback(
      () => suggestCompositorCycleName(savedCycles),
      [savedCycles],
    ),
  };
}

export type UseCifradoCyclesResult = ReturnType<typeof useCifradoCycles>;
