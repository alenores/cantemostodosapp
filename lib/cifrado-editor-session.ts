import {
  createDefaultCompasConfig,
  type CifradoData,
  type CompasConfig,
  type NotaIndex,
} from "@/lib/cifrado";
import { normalizeCompasConfig } from "@/lib/cifrado-intensidad";
import { parseLetraTradicional } from "@/lib/cifrado-import";
import type { CancionCifradoDetalle } from "@/types";

export type CifradoEditorSession = {
  cancionId?: number;
  nombre: string;
  artista: string;
  letra: string;
  cifrado?: CifradoData;
  compas_config?: CompasConfig | null;
  tonalidad_default?: NotaIndex;
  bpm_default?: number;
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

export function buildCifradoEditorSession(input: {
  cancionId?: number;
  nombre: string;
  artista: string;
  letra: string;
  esAvanzada?: boolean;
  detalle?: CancionCifradoDetalle | null;
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
      bpm_default: input.detalle.bpm_default,
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
    importWarnings: imported.warnings,
    skipIngreso: true,
  };
}
