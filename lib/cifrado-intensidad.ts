import {

  getBeatCountForCompas,

  type BarraCompas,

  type CompasConfig,

  type TipoCompas,

} from "@/lib/cifrado";

import {

  cycleMetronomeBeatLevel,

  type MetronomeBeatLevel,

} from "@/lib/metronomo";



export function createDefaultIntensidadPlantilla(

  tipoCompas: TipoCompas,

): MetronomeBeatLevel[] {

  const beatCount = getBeatCountForCompas(tipoCompas);



  return Array.from({ length: beatCount }, (_, index) =>

    index === 0 ? "fuerte" : "medio",

  );

}



export function normalizeIntensidadPattern(

  pattern: MetronomeBeatLevel[] | undefined,

  tipoCompas: TipoCompas,

): MetronomeBeatLevel[] {

  const beatCount = getBeatCountForCompas(tipoCompas);

  const defaults = createDefaultIntensidadPlantilla(tipoCompas);

  const source = pattern ?? defaults;



  return Array.from({ length: beatCount }, (_, index) => source[index] ?? "medio");

}



export function getBarraTipoCompas(

  barra: BarraCompas,

  config: CompasConfig,

): TipoCompas {

  return barra.tipoCompas ?? config.tipoCompas;

}



export function getIntensidadPlantilla(config: CompasConfig): MetronomeBeatLevel[] {

  return normalizeIntensidadPattern(config.intensidadPlantilla, config.tipoCompas);

}



export function getBarraIntensidad(

  barra: BarraCompas,

  config: CompasConfig,

): MetronomeBeatLevel[] {

  const tipoCompas = getBarraTipoCompas(barra, config);



  if (barra.intensidad?.length) {

    return normalizeIntensidadPattern(barra.intensidad, tipoCompas);

  }



  return getIntensidadPlantilla(config);

}



export function cycleIntensidadSlot(

  pattern: MetronomeBeatLevel[],

  slotIndex: number,

  tipoCompas: TipoCompas,

): MetronomeBeatLevel[] {

  const normalized = normalizeIntensidadPattern(pattern, tipoCompas);

  const index = Math.max(

    0,

    Math.min(normalized.length - 1, slotIndex),

  );



  normalized[index] = cycleMetronomeBeatLevel(normalized[index]!);



  return normalized;

}



/** Actualiza solo la plantilla para compases nuevos; no toca los ya colocados. */

export function resizeCompasConfigIntensidad(

  config: CompasConfig,

  nextTipoCompas: TipoCompas,

): CompasConfig {

  if (config.tipoCompas === nextTipoCompas) {

    return config;

  }



  return {

    ...config,

    tipoCompas: nextTipoCompas,

    intensidadPlantilla: normalizeIntensidadPattern(

      config.intensidadPlantilla,

      nextTipoCompas,

    ),

  };

}



export function normalizeCompasConfig(config: CompasConfig): CompasConfig {

  const intensidadPlantilla = getIntensidadPlantilla(config);



  return {

    ...config,

    intensidadPlantilla,

    barras: config.barras.map((barra) => {

      const tipoCompas = getBarraTipoCompas(barra, config);



      return {

        ...barra,

        tipoCompas,

        cycleId:
          typeof barra.cycleId === "string" && barra.cycleId.trim()
            ? barra.cycleId.trim()
            : null,

        intensidad: barra.intensidad

          ? normalizeIntensidadPattern(barra.intensidad, tipoCompas)

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



      const tipoCompas = getBarraTipoCompas(barra, config);



      return {

        ...barra,

        intensidad: normalizeIntensidadPattern(intensidad, tipoCompas),

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

