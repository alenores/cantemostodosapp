import {
  createDefaultCompasConfig,
  type CifradoData,
  type CompasConfig,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  DEFAULT_MODO_TONAL,
  type ModoTonal,
} from "@/lib/cifrado-escala";
import { normalizeCompasConfig } from "@/lib/cifrado-intensidad";
import { parseLetraTradicional } from "@/lib/cifrado-import";
import type { CancionCifradoDetalle } from "@/types";

export type CifradoEditorSession = {
  cancionId?: number;
  nombre: string;
  artista: string;
  artista_id?: string | null;
  letra: string;
  cifrado?: CifradoData;
  compas_config?: CompasConfig | null;
  tonalidad_default?: NotaIndex;
  modo_tonal_default?: ModoTonal;
  bpm_default?: number;
  /** Link de YouTube guardado (null = sin video). */
  youtube_url?: string | null;
  importWarnings?: string[];
  skipIngreso?: boolean;
};

export type CifradoSaveResult = {
  id: number;
  nombre: string;
  artista: string | null;
  letra: string;
  tiene_cifrado_avanzado: boolean;
};

/**
 * Persistencia opcional del editor (p. ej. Entrenador → canciones_practica).
 * Si no se provee, el editor PC usa el flujo histórico del Cancionero.
 */
export type CifradoEditorPersistPayload = {
  nombre: string;
  artista: string | null;
  /** Ficha del artista. `undefined` = no se pudo comparar: no tocar el vínculo guardado. */
  artista_id?: string | null;
  letra: string;
  cifrado: CifradoData;
  compas_config: CompasConfig;
  tonalidad_default: NotaIndex;
  modo_tonal_default: ModoTonal;
  bpm_default: number;
  /** Link de YouTube normalizado. `undefined` = no tocar el guardado. */
  youtube_url?: string | null;
};

export type CifradoEditorPersistFn = (
  editingId: number | undefined,
  payload: CifradoEditorPersistPayload,
) => Promise<number>;

export function buildCifradoEditorSession(input: {
  cancionId?: number;
  nombre: string;
  artista: string;
  artista_id?: string | null;
  letra: string;
  esAvanzada?: boolean;
  detalle?: CancionCifradoDetalle | null;
  youtube_url?: string | null;
}): CifradoEditorSession {
  if (input.esAvanzada && input.detalle) {
    const compasConfig = normalizeCompasConfig(
      input.detalle.compas_config ?? createDefaultCompasConfig(),
    );

    return {
      cancionId: input.cancionId ?? input.detalle.id,
      nombre: input.detalle.nombre,
      artista: input.detalle.artista ?? "",
      letra: input.detalle.letra ?? "",
      cifrado: input.detalle.cifrado,
      compas_config: {
        ...compasConfig,
        bpm: input.detalle.bpm_default,
      },
      tonalidad_default: input.detalle.tonalidad_default,
      modo_tonal_default: input.detalle.modo_tonal_default ?? DEFAULT_MODO_TONAL,
      bpm_default: input.detalle.bpm_default,
      youtube_url: input.detalle.youtube_url ?? null,
      skipIngreso: true,
    };
  }

  const imported = parseLetraTradicional(input.letra);

  return {
    cancionId: input.cancionId,
    nombre: input.nombre.trim(),
    artista: input.artista.trim(),
    letra: imported.letra,
    cifrado: imported.cifrado,
    compas_config: null,
    youtube_url: input.youtube_url ?? null,
    importWarnings: imported.warnings,
    skipIngreso: true,
  };
}
