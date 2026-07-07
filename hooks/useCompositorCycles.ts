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
  setRemoteCompositorCyclePublic,
  suggestCompositorCycleName,
  updateRemoteCompositorCycle,
  upsertCycleInList,
  writeLocalCompositorCycles,
  createCompositorCycleFromCommunityCycle,
  type CompositorCommunityCycle,
  type CompositorCycle,
} from "@/lib/compositor-cycles";
import type { CompositorPiece } from "@/lib/compositor";
import {
  formatTrackOverflowDetails,
  pieceHasTrackOverflow,
} from "@/lib/compositor";
import { COMPOSITOR_ERROR_TRACK_OVERFLOW_SAVE } from "@/lib/ritmo-terminologia";
import { createClient } from "@/lib/supabase/client";
import { formatDatabaseError } from "@/lib/supabase/errors";
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
  const [cyclesNotice, setCyclesNotice] = useState<string | null>(null);

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
      setCyclesError(formatDatabaseError(error, "No se pudieron cargar los ciclos."));
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
    async (nombre: string, pieceOverride?: CompositorPiece) => {
      const normalizedName = normalizeCycleName(nombre);

      if (!normalizedName) {
        throw new Error("Escribí un nombre para el ciclo.");
      }

      const piece = pieceOverride ?? getPiece();

      if (pieceHasTrackOverflow(piece)) {
        throw new Error(
          COMPOSITOR_ERROR_TRACK_OVERFLOW_SAVE(formatTrackOverflowDetails(piece)),
        );
      }

      setCyclesBusy(true);
      setCyclesError(null);
      setCyclesNotice(null);

      try {
        const draft = createCompositorCycleFromPiece(
          normalizedName,
          piece,
          isLoggedIn && online ? "remote" : "local",
        );

        let saved = draft;

        if (isLoggedIn && online) {
          try {
            saved = await insertRemoteCompositorCycle(supabaseRef.current, draft);
          } catch (error) {
            saved = { ...draft, storage: "local" };
            setCyclesNotice(
              `No se pudo guardar en la nube. ${formatDatabaseError(
                error,
                "Revisá tu conexión.",
              )} El ciclo quedó guardado solo en este dispositivo.`,
            );
          }
        }

        setSavedCycles((current) => {
          const next = upsertCycleInList(current, saved);
          syncLocalCycleCache(next);
          return next;
        });
        setActiveCycleId(saved.id);
        if (!pieceOverride) {
          onApplyPiece(saved.piece);
        }
        return saved;
      } finally {
        setCyclesBusy(false);
      }
    },
    [getPiece, isLoggedIn, online, onApplyPiece],
  );

  const updateActiveCycle = useCallback(async (nombre?: string) => {
    if (!activeCycle) {
      throw new Error("No hay un ciclo activo para actualizar.");
    }

    const piece = getPiece();

    if (pieceHasTrackOverflow(piece)) {
      throw new Error(
        COMPOSITOR_ERROR_TRACK_OVERFLOW_SAVE(formatTrackOverflowDetails(piece)),
      );
    }

    const normalizedName =
      nombre === undefined ? activeCycle.nombre : normalizeCycleName(nombre);

    if (!normalizedName) {
      throw new Error("Escribí un nombre para el ciclo.");
    }

    setCyclesBusy(true);
    setCyclesError(null);

    try {
      const draft: CompositorCycle = {
        ...activeCycle,
        nombre: normalizedName,
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

  const setCyclePublic = useCallback(
    async (cycleId: string, esPublico: boolean) => {
      const cycle = savedCycles.find((entry) => entry.id === cycleId);

      if (!cycle) {
        throw new Error("No se encontró el ciclo.");
      }

      if (cycle.storage !== "remote" || !isLoggedIn || !online) {
        throw new Error("Solo los ciclos en la nube pueden compartirse con la comunidad.");
      }

      setCyclesBusy(true);
      setCyclesError(null);

      try {
        const saved = await setRemoteCompositorCyclePublic(
          supabaseRef.current,
          cycle,
          esPublico,
        );

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

  const importCommunityCycle = useCallback(
    async (communityCycle: CompositorCommunityCycle) => {
      setCyclesBusy(true);
      setCyclesError(null);

      try {
        const draft = createCompositorCycleFromCommunityCycle(
          communityCycle,
          savedCycles,
        );

        let saved: CompositorCycle = { ...draft, storage: "local" };

        if (isLoggedIn && online) {
          saved = await insertRemoteCompositorCycle(supabaseRef.current, draft);
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
    cyclesNotice,
    refreshCycles,
    saveCurrentCycle,
    updateActiveCycle,
    loadCycle,
    renameCycle,
    deleteCycle,
    suggestCycleName,
    clearActiveCycle,
    setCyclePublic,
    importCommunityCycle,
  };
}

export type UseCompositorCyclesResult = ReturnType<typeof useCompositorCycles>;
