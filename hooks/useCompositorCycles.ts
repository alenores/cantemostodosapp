"use client";

import {
  createCompositorCycleFromPiece,
  deleteRemoteCompositorCycle,
  fetchRemoteCompositorCycles,
  insertRemoteCompositorCycle,
  mergeCompositorCyclesForDisplay,
  normalizeCycleName,
  readLocalCompositorCycles,
  removeCycleFromList,
  suggestCompositorCycleName,
  updateRemoteCompositorCycle,
  upsertCycleInList,
  writeLocalCompositorCycles,
  type CompositorCycle,
} from "@/lib/compositor-cycles";
import type { CompositorPiece } from "@/lib/compositor";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseCompositorCyclesOptions = {
  isLoggedIn: boolean;
  online: boolean;
  enabled: boolean;
  getPiece: () => CompositorPiece;
  onApplyPiece: (piece: CompositorPiece) => void;
  onStopPlayback: () => void;
};

function syncLocalCycleCache(cycles: CompositorCycle[]): void {
  writeLocalCompositorCycles(cycles);
}

export function useCompositorCycles({
  isLoggedIn,
  online,
  enabled,
  getPiece,
  onApplyPiece,
  onStopPlayback,
}: UseCompositorCyclesOptions) {
  const supabase = useMemo(() => createClient(), []);
  const supabaseRef = useRef<SupabaseClient>(supabase);
  supabaseRef.current = supabase;

  const [savedCycles, setSavedCycles] = useState<CompositorCycle[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [cyclesBusy, setCyclesBusy] = useState(false);
  const [cyclesError, setCyclesError] = useState<string | null>(null);

  const activeCycle = useMemo(
    () => savedCycles.find((cycle) => cycle.id === activeCycleId) ?? null,
    [activeCycleId, savedCycles],
  );

  const refreshCycles = useCallback(async () => {
    setCyclesLoading(true);
    setCyclesError(null);

    try {
      const localCycles = readLocalCompositorCycles();

      if (isLoggedIn && online) {
        const remoteCycles = await fetchRemoteCompositorCycles(supabaseRef.current);
        const localOnly = localCycles.filter((cycle) => cycle.storage === "local");
        const merged = mergeCompositorCyclesForDisplay(remoteCycles, localOnly);
        syncLocalCycleCache(merged);
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

  const saveCurrentCycle = useCallback(
    async (nombre: string) => {
      const normalizedName = normalizeCycleName(nombre);

      if (!normalizedName) {
        throw new Error("Escribí un nombre para el ciclo.");
      }

      setCyclesBusy(true);
      setCyclesError(null);

      try {
        const draft = createCompositorCycleFromPiece(
          normalizedName,
          getPiece(),
          isLoggedIn && online ? "remote" : "local",
        );

        let saved = draft;

        if (isLoggedIn && online) {
          saved = await insertRemoteCompositorCycle(supabaseRef.current, draft);
        }

        setSavedCycles((current) => {
          const next = upsertCycleInList(current, saved);
          syncLocalCycleCache(next);
          return next;
        });
        setActiveCycleId(saved.id);
        onApplyPiece(saved.piece);
        return saved;
      } finally {
        setCyclesBusy(false);
      }
    },
    [getPiece, isLoggedIn, online, onApplyPiece],
  );

  const updateActiveCycle = useCallback(async () => {
    if (!activeCycle) {
      throw new Error("No hay un ciclo activo para actualizar.");
    }

    setCyclesBusy(true);
    setCyclesError(null);

    try {
      const draft: CompositorCycle = {
        ...activeCycle,
        piece: getPiece(),
        updatedAt: new Date().toISOString(),
      };

      let saved = draft;

      if (activeCycle.storage === "remote" && isLoggedIn && online) {
        saved = await updateRemoteCompositorCycle(supabaseRef.current, draft);
      } else if (activeCycle.storage === "local" || !isLoggedIn || !online) {
        saved = { ...draft, storage: "local" };
      }

      setSavedCycles((current) => {
        const next = upsertCycleInList(current, saved);
        syncLocalCycleCache(next);
        return next;
      });
      onApplyPiece(saved.piece);
      return saved;
    } finally {
      setCyclesBusy(false);
    }
  }, [activeCycle, getPiece, isLoggedIn, online, onApplyPiece]);

  const loadCycle = useCallback(
    (cycleId: string) => {
      const cycle = savedCycles.find((entry) => entry.id === cycleId);

      if (!cycle) {
        throw new Error("No se encontró el ciclo seleccionado.");
      }

      onStopPlayback();
      onApplyPiece(cycle.piece);
      setActiveCycleId(cycle.id);
      setCyclesError(null);
    },
    [onApplyPiece, onStopPlayback, savedCycles],
  );

  const renameCycle = useCallback(
    async (cycleId: string, nombre: string) => {
      const normalizedName = normalizeCycleName(nombre);
      const cycle = savedCycles.find((entry) => entry.id === cycleId);

      if (!cycle) {
        throw new Error("No se encontró el ciclo.");
      }

      if (!normalizedName) {
        throw new Error("Escribí un nombre para el ciclo.");
      }

      setCyclesBusy(true);
      setCyclesError(null);

      try {
        const draft: CompositorCycle = {
          ...cycle,
          nombre: normalizedName,
          updatedAt: new Date().toISOString(),
        };

        let saved = draft;

        if (cycle.storage === "remote" && isLoggedIn && online) {
          saved = await updateRemoteCompositorCycle(supabaseRef.current, draft);
        }

        setSavedCycles((current) => {
          const next = upsertCycleInList(current, saved);
          syncLocalCycleCache(next);
          return next;
        });
        return saved;
      } finally {
        setCyclesBusy(false);
      }
    },
    [isLoggedIn, online, savedCycles],
  );

  const deleteCycle = useCallback(
    async (cycleId: string) => {
      const cycle = savedCycles.find((entry) => entry.id === cycleId);

      if (!cycle) {
        throw new Error("No se encontró el ciclo.");
      }

      setCyclesBusy(true);
      setCyclesError(null);

      try {
        if (cycle.storage === "remote" && isLoggedIn && online) {
          await deleteRemoteCompositorCycle(supabaseRef.current, cycleId);
        }

        setSavedCycles((current) => {
          const next = removeCycleFromList(current, cycleId);
          syncLocalCycleCache(next);
          return next;
        });

        if (activeCycleId === cycleId) {
          setActiveCycleId(null);
        }
      } finally {
        setCyclesBusy(false);
      }
    },
    [activeCycleId, isLoggedIn, online, savedCycles],
  );

  const suggestCycleName = useCallback(() => {
    return suggestCompositorCycleName(savedCycles);
  }, [savedCycles]);

  const clearActiveCycle = useCallback(() => {
    setActiveCycleId(null);
  }, []);

  return {
    savedCycles,
    activeCycleId,
    activeCycle,
    cyclesLoading,
    cyclesBusy,
    cyclesError,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
    clearActiveCycle,
  };
}

export type UseCompositorCyclesResult = ReturnType<typeof useCompositorCycles>;
