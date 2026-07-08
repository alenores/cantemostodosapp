import {
  clampCompasCycleGolpes,
  getBeatCountForCompas,
  getCompasCycleGolpes,
  type BarraCompas,
  type CompasConfig,
  type TipoCompas,
} from "@/lib/cifrado";
import {
  cycleMetronomeBeatLevel,
  type MetronomeBeatLevel,
} from "@/lib/metronomo";

export function createDefaultIntensidadPlantilla(
  beatCount: number,
): MetronomeBeatLevel[] {
  const golpes = clampCompasCycleGolpes(beatCount);

  return Array.from({ length: golpes }, (_, index) =>
    index === 0 ? "fuerte" : "medio",
  );
}

export function normalizeIntensidadPattern(
  pattern: MetronomeBeatLevel[] | undefined,
  beatCount: number,
): MetronomeBeatLevel[] {
  const golpes = clampCompasCycleGolpes(beatCount);
  const defaults = createDefaultIntensidadPlantilla(golpes);
  const source = pattern ?? defaults;

  return Array.from({ length: golpes }, (_, index) => source[index] ?? "medio");
}

export function getBarraTipoCompas(
  barra: BarraCompas,
  config: CompasConfig,
): TipoCompas {
  return barra.tipoCompas ?? config.tipoCompas;
}

function getBarraCycleGolpes(barra: BarraCompas, config: CompasConfig): number {
  if (barra.intensidad?.length) {
    return barra.intensidad.length;
  }

  return getCompasCycleGolpes(config);
}

export function getIntensidadPlantilla(config: CompasConfig): MetronomeBeatLevel[] {
  return normalizeIntensidadPattern(
    config.intensidadPlantilla,
    getCompasCycleGolpes(config),
  );
}

export function getBarraIntensidad(
  barra: BarraCompas,
  config: CompasConfig,
): MetronomeBeatLevel[] {
  const golpes = getBarraCycleGolpes(barra, config);

  if (barra.intensidad?.length) {
    return normalizeIntensidadPattern(barra.intensidad, golpes);
  }

  return getIntensidadPlantilla(config);
}

export function cycleIntensidadSlot(
  pattern: MetronomeBeatLevel[],
  slotIndex: number,
  beatCount: number,
): MetronomeBeatLevel[] {
  const normalized = normalizeIntensidadPattern(pattern, beatCount);
  const index = Math.max(
    0,
    Math.min(normalized.length - 1, slotIndex),
  );

  normalized[index] = cycleMetronomeBeatLevel(normalized[index]!);

  return normalized;
}

/** Actualiza solo la plantilla para compases nuevos; no toca los ya colocados. */
export function resizeCompasConfigCycleGolpes(
  config: CompasConfig,
  nextGolpes: number,
): CompasConfig {
  const cycleGolpes = clampCompasCycleGolpes(nextGolpes);

  if (getCompasCycleGolpes(config) === cycleGolpes && config.cycleGolpes === cycleGolpes) {
    return config;
  }

  return {
    ...config,
    cycleGolpes,
    intensidadPlantilla: normalizeIntensidadPattern(
      config.intensidadPlantilla,
      cycleGolpes,
    ),
  };
}

/** @deprecated Prefer resizeCompasConfigCycleGolpes. Conservado por compatibilidad. */
export function resizeCompasConfigIntensidad(
  config: CompasConfig,
  nextTipoCompas: TipoCompas,
): CompasConfig {
  if (config.tipoCompas === nextTipoCompas) {
    return config;
  }

  return {
    ...resizeCompasConfigCycleGolpes(
      config,
      getBeatCountForCompas(nextTipoCompas),
    ),
    tipoCompas: nextTipoCompas,
  };
}

export function normalizeCompasConfig(config: CompasConfig): CompasConfig {
  const cycleGolpes = getCompasCycleGolpes(config);
  const intensidadPlantilla = getIntensidadPlantilla(config);

  return {
    ...config,
    cycleGolpes,
    intensidadPlantilla,
    barras: config.barras.map((barra) => {
      const tipoCompas = getBarraTipoCompas(barra, config);
      const golpes = getBarraCycleGolpes(barra, { ...config, cycleGolpes });

      return {
        ...barra,
        tipoCompas,
        cycleId:
          typeof barra.cycleId === "string" && barra.cycleId.trim()
            ? barra.cycleId.trim()
            : null,
        intensidad: barra.intensidad
          ? normalizeIntensidadPattern(barra.intensidad, golpes)
          : undefined,
      };
    }),
  };
}

export function updateBarraIntensidad(
  config: CompasConfig,
  lineIndex: number,
  charOffset: number,
  intensidad: MetronomeBeatLevel[],
): CompasConfig {
  return {
    ...config,
    barras: config.barras.map((barra) => {
      if (barra.lineIndex !== lineIndex || barra.charOffset !== charOffset) {
        return barra;
      }

      const golpes = getBarraCycleGolpes(barra, config);

      return {
        ...barra,
        intensidad: normalizeIntensidadPattern(intensidad, golpes),
      };
    }),
  };
}

export function updateBarraCycleId(
  config: CompasConfig,
  lineIndex: number,
  charOffset: number,
  cycleId: string | null,
): CompasConfig {
  const normalizedCycleId =
    typeof cycleId === "string" && cycleId.trim() ? cycleId.trim() : null;

  return {
    ...config,
    barras: config.barras.map((barra) => {
      if (barra.lineIndex !== lineIndex || barra.charOffset !== charOffset) {
        return barra;
      }

      return {
        ...barra,
        cycleId: normalizedCycleId,
      };
    }),
  };
}
