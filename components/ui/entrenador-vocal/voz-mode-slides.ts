export const VOZ_MODE_SLIDES = [
  { id: "encajar", label: "Encajar" },
  { id: "sostener", label: "Sostener" },
  { id: "octavas", label: "Octavas" },
  { id: "melodia", label: "Melodía" },
  { id: "ritmo", label: "Ritmo" },
  { id: "ritmo-intensidad", label: "Ritmo-Intensidad" },
  { id: "ritmo-nota", label: "Ritmo-Nota" },
  { id: "combo", label: "Combo" },
] as const;

export type VozModeSlideId = (typeof VOZ_MODE_SLIDES)[number]["id"];
