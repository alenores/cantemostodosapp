import {
  cloneCompositorPiece,
  formatCompositorCycleSummary,
  normalizeCompositorPiece,
  type CompositorPiece,
} from "@/lib/compositor";
import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPOSITOR_CYCLES_STORAGE_KEY = "compositor-cycles-v1";
export const COMPOSITOR_CYCLE_NAME_MAX_LENGTH = 80;

export type CompositorCycleStorage = "local" | "remote";

export type CompositorCycle = {
  id: string;
  nombre: string;
  piece: CompositorPiece;
  createdAt: string;
  updatedAt: string;
  storage: CompositorCycleStorage;
};

type CompositorCyclesFile = {
  version: 1;
  cycles: CompositorCycle[];
};

type CompositorCycleRow = {
  id: string;
  nombre: string;
  piece: CompositorPiece;
  created_at: string;
  updated_at: string;
};

function createCycleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeCycleName(nombre: string): string {
  return nombre.trim().slice(0, COMPOSITOR_CYCLE_NAME_MAX_LENGTH);
}

export function isValidCycleName(nombre: string): boolean {
  return normalizeCycleName(nombre).length > 0;
}

function parseCycle(raw: unknown, storage: CompositorCycleStorage): CompositorCycle | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Partial<CompositorCycle> & { piece?: CompositorPiece };

  if (
    typeof record.id !== "string" ||
    typeof record.nombre !== "string" ||
    !record.piece ||
    typeof record.piece !== "object"
  ) {
    return null;
  }

  const nombre = normalizeCycleName(record.nombre);

  if (!nombre) {
    return null;
  }

  const timestamp = nowIso();

  return {
    id: record.id,
    nombre,
    piece: normalizeCompositorPiece(record.piece),
    createdAt:
      typeof record.createdAt === "string" ? record.createdAt : timestamp,
    updatedAt:
      typeof record.updatedAt === "string" ? record.updatedAt : timestamp,
    storage,
  };
}

function sortCycles(cycles: CompositorCycle[]): CompositorCycle[] {
  return [...cycles].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function readLocalCompositorCycles(): CompositorCycle[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(COMPOSITOR_CYCLES_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as CompositorCyclesFile | CompositorCycle[];

    const entries = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.cycles)
        ? parsed.cycles
        : [];

    return sortCycles(
      entries
        .map((entry) => parseCycle(entry, "local"))
        .filter((entry): entry is CompositorCycle => entry !== null),
    );
  } catch {
    return [];
  }
}

export function writeLocalCompositorCycles(cycles: CompositorCycle[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: CompositorCyclesFile = {
      version: 1,
      cycles: sortCycles(
        cycles.map((cycle) => ({
          ...cycle,
          storage: "local" as const,
        })),
      ),
    };

    localStorage.setItem(COMPOSITOR_CYCLES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage unavailable
  }
}

export function createCompositorCycleFromPiece(
  nombre: string,
  piece: CompositorPiece,
  storage: CompositorCycleStorage = "local",
  id = createCycleId(),
): CompositorCycle {
  const timestamp = nowIso();
  const normalizedName = normalizeCycleName(nombre);

  if (!normalizedName) {
    throw new Error("El nombre del ciclo no puede estar vacío.");
  }

  return {
    id,
    nombre: normalizedName,
    piece: normalizeCompositorPiece(cloneCompositorPiece(piece)),
    createdAt: timestamp,
    updatedAt: timestamp,
    storage,
  };
}

export function formatCompositorCycleLabel(cycle: CompositorCycle): string {
  return `${cycle.nombre} · ${formatCompositorCycleSummary(cycle.piece)}`;
}

function rowToCycle(row: CompositorCycleRow): CompositorCycle | null {
  return parseCycle(
    {
      id: row.id,
      nombre: row.nombre,
      piece: row.piece,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      storage: "remote",
    },
    "remote",
  );
}

export async function fetchRemoteCompositorCycles(
  supabase: SupabaseClient,
): Promise<CompositorCycle[]> {
  const { data, error } = await supabase
    .from("compositor_ciclos")
    .select("id, nombre, piece, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return sortCycles(
    (data ?? [])
      .map((row) => rowToCycle(row as CompositorCycleRow))
      .filter((cycle): cycle is CompositorCycle => cycle !== null),
  );
}

export async function insertRemoteCompositorCycle(
  supabase: SupabaseClient,
  cycle: CompositorCycle,
): Promise<CompositorCycle> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Iniciá sesión para guardar ciclos en la nube.");
  }

  const { data, error } = await supabase
    .from("compositor_ciclos")
    .insert({
      nombre: cycle.nombre,
      piece: cycle.piece,
      user_id: user.id,
    })
    .select("id, nombre, piece, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  const saved = rowToCycle(data as CompositorCycleRow);

  if (!saved) {
    throw new Error("No se pudo leer el ciclo guardado.");
  }

  return saved;
}

export async function updateRemoteCompositorCycle(
  supabase: SupabaseClient,
  cycle: CompositorCycle,
): Promise<CompositorCycle> {
  const { data, error } = await supabase
    .from("compositor_ciclos")
    .update({
      nombre: cycle.nombre,
      piece: cycle.piece,
    })
    .eq("id", cycle.id)
    .select("id, nombre, piece, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  const saved = rowToCycle(data as CompositorCycleRow);

  if (!saved) {
    throw new Error("No se pudo leer el ciclo actualizado.");
  }

  return saved;
}

export async function deleteRemoteCompositorCycle(
  supabase: SupabaseClient,
  cycleId: string,
): Promise<void> {
  const { error } = await supabase
    .from("compositor_ciclos")
    .delete()
    .eq("id", cycleId);

  if (error) {
    throw error;
  }
}

export function mergeCompositorCyclesForDisplay(
  remoteCycles: CompositorCycle[],
  localCycles: CompositorCycle[],
): CompositorCycle[] {
  const byId = new Map<string, CompositorCycle>();

  for (const cycle of localCycles) {
    if (cycle.storage === "local") {
      byId.set(cycle.id, cycle);
    }
  }

  for (const cycle of remoteCycles) {
    byId.set(cycle.id, cycle);
  }

  return sortCycles([...byId.values()]);
}

export function upsertCycleInList(
  cycles: CompositorCycle[],
  nextCycle: CompositorCycle,
): CompositorCycle[] {
  const without = cycles.filter((cycle) => cycle.id !== nextCycle.id);
  return sortCycles([...without, nextCycle]);
}

export function removeCycleFromList(
  cycles: CompositorCycle[],
  cycleId: string,
): CompositorCycle[] {
  return cycles.filter((cycle) => cycle.id !== cycleId);
}

export function suggestCompositorCycleName(cycles: CompositorCycle[]): string {
  const used = new Set(cycles.map((cycle) => cycle.nombre.toLowerCase()));
  let index = cycles.length + 1;

  while (used.has(`ciclo ${index}`.toLowerCase())) {
    index += 1;
  }

  return `Ciclo ${index}`;
}
