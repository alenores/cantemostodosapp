export type MetronomeConceptId = "golpes" | "figura" | "dinamica" | "tempo";

export type MetronomeConcept = {
  id: MetronomeConceptId;
  label: string;
  text: string;
  tip: string;
};

export const METRONOME_CONCEPTS: MetronomeConcept[] = [
  {
    id: "golpes",
    label: "Golpes",
    text: "Los clicks que escuchás en cada vuelta antes de que empiece de nuevo. La mayoría de canciones usan 3 o 4.",
    tip: "Empezá con 4. Es el más natural para comenzar.",
  },
  {
    id: "figura",
    label: "Figura",
    text: "Cuánto espacio hay entre cada click. Negra es el estándar. Corchea es más rápida. Blanca más lenta.",
    tip: "Dejá todos en Negra hasta entender cómo suena cada una.",
  },
  {
    id: "dinamica",
    label: "Dinámica",
    text: "Qué tan fuerte suena cada click: silencio, suave, medio o fuerte. Sirve para saber dónde empieza la vuelta.",
    tip: "Primer golpe fuerte, el resto en medio.",
  },
  {
    id: "tempo",
    label: "Tempo",
    text: "La velocidad, en golpes por minuto (BPM). A 60 BPM suena un click por segundo. Más BPM = más rápido.",
    tip: "Practicá siempre más lento de lo que creés que podés.",
  },
];
