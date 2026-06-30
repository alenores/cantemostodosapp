/** Textos y definiciones de producto para Herramientas (hub y modales). */

export type HerramientaPracticePillar = {
  id: "metronomo" | "entrenador-vocal" | "compositor";
  label: string;
  question: string;
};

/** Las tres herramientas de práctica y la pregunta que responde cada una. */
export const HERRAMIENTAS_PRACTICE_PILLARS: HerramientaPracticePillar[] = [
  {
    id: "metronomo",
    label: "Metrónomo",
    question: "¿Llego al tiempo?",
  },
  {
    id: "entrenador-vocal",
    label: "Entrenador Vocal",
    question: "¿Canto bien en esta situación?",
  },
  {
    id: "compositor",
    label: "Compositor",
    question: "¿Qué quiero que suene?",
  },
];

export const METRONOMO_TAGLINE =
  "Marcá el tempo y practicá tus tiempos. Sin instrumentos ni melodías: solo ritmo.";

export const ENTRENADOR_VOCAL_TAGLINE =
  "Entrená tu voz paso a paso: encajar, sostener, ritmo y combo en el carrusel.";

export const COMPOSITOR_TAGLINE =
  "Armá tus propios ritmos y melodías con varios instrumentos.";

export const COMPOSITOR_COMING_SOON_TITLE = "Compositor en camino";

export const COMPOSITOR_COMING_SOON_LEAD =
  "Acá vas a poder crear y guardar tus ideas musicales, separado del entrenador vocal.";

export const COMPOSITOR_VISION_ITEMS = [
  "Definir ciclo, figura y dinámica de cada golpe",
  "Elegir notas cuando el instrumento lo permita (contenido)",
  "Elegir timbre en batería y guitarra (púa, rasguido, bombo, caja…)",
  "Combinar varias capas (instrumentos) en la misma pieza",
] as const;

export const COMPOSITOR_VS_ENTRENADOR_NOTE =
  "El Entrenador Vocal es para practicar y evaluar; el Compositor es para armar y experimentar.";

export const HUB_SECTION_CANCIONES_LABEL = "Canciones";
export const HUB_SECTION_PRACTICA_LABEL = "Práctica";
