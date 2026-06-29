"use client";

import SalaPageShell from "@/components/salas/SalaPageShell";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SalaRef = {
  id: number;
  nombre: string;
};

type EnterSalaOptions = {
  offline?: boolean;
};

type SalasNavigationContextValue = {
  enterSala: (sala: SalaRef, options?: EnterSalaOptions) => void;
  registerSalaNames: (salas: SalaRef[]) => void;
};

const SalasNavigationContext = createContext<SalasNavigationContextValue | null>(
  null,
);

export function useSalasNavigation(): SalasNavigationContextValue {
  const context = useContext(SalasNavigationContext);

  if (!context) {
    throw new Error("useSalasNavigation debe usarse dentro de SalasRouteCoordinator");
  }

  return context;
}

function parseSalaIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/salas\/(\d+)$/);

  if (!match) {
    return null;
  }

  const salaId = Number(match[1]);

  return Number.isNaN(salaId) ? null : salaId;
}

export default function SalasRouteCoordinator({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const routeSalaId = parseSalaIdFromPath(pathname);

  const [optimisticSala, setOptimisticSala] = useState<SalaRef | null>(null);
  const [embeddedMode, setEmbeddedMode] = useState(false);
  const [nombreById, setNombreById] = useState<Record<number, string>>({});

  const registerSalaNames = useCallback((salas: SalaRef[]) => {
    setNombreById((current) => {
      const next = { ...current };

      for (const sala of salas) {
        next[sala.id] = sala.nombre;
      }

      return next;
    });
  }, []);

  const enterSala = useCallback(
    (sala: SalaRef, options?: EnterSalaOptions) => {
      setNombreById((current) => ({ ...current, [sala.id]: sala.nombre }));
      setOptimisticSala(sala);
      setEmbeddedMode(Boolean(options?.offline));

      if (!options?.offline) {
        router.push(`/salas/${sala.id}`);
      }
    },
    [router],
  );

  const closeEmbeddedSala = useCallback(() => {
    setOptimisticSala(null);
    setEmbeddedMode(false);
  }, []);

  useHardwareBack(embeddedMode, closeEmbeddedSala);

  useEffect(() => {
    if (!optimisticSala || !routeSalaId || routeSalaId !== optimisticSala.id) {
      return;
    }

    setNombreById((current) => ({
      ...current,
      [routeSalaId]: optimisticSala.nombre,
    }));
    setOptimisticSala(null);
    setEmbeddedMode(false);
  }, [optimisticSala, routeSalaId]);

  useEffect(() => {
    if (!routeSalaId || nombreById[routeSalaId]) {
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    void supabase
      .from("salas")
      .select("nombre")
      .eq("id", routeSalaId)
      .eq("visible", true)
      .single()
      .then(({ data }) => {
        if (cancelled || !data?.nombre) {
          return;
        }

        setNombreById((current) => ({
          ...current,
          [routeSalaId]: data.nombre,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [nombreById, routeSalaId]);

  const shellSala = useMemo((): SalaRef | null => {
    if (embeddedMode && optimisticSala) {
      return optimisticSala;
    }

    if (optimisticSala && (!routeSalaId || routeSalaId === optimisticSala.id)) {
      return optimisticSala;
    }

    if (routeSalaId) {
      return {
        id: routeSalaId,
        nombre: nombreById[routeSalaId] ?? "Sala",
      };
    }

    return null;
  }, [embeddedMode, nombreById, optimisticSala, routeSalaId]);

  const navigationValue = useMemo(
    () => ({
      enterSala,
      registerSalaNames,
    }),
    [enterSala, registerSalaNames],
  );

  return (
    <SalasNavigationContext.Provider value={navigationValue}>
      <div className={shellSala ? "hidden" : "contents"} aria-hidden={Boolean(shellSala)}>
        {children}
      </div>

      {shellSala ? (
        <SalaPageShell
          key={shellSala.id}
          salaId={shellSala.id}
          salaNombre={shellSala.nombre}
          embedded={embeddedMode}
          onClose={embeddedMode ? closeEmbeddedSala : undefined}
        />
      ) : null}
    </SalasNavigationContext.Provider>
  );
}
