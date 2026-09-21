"use client";

import { createContext, useContext } from "react";

export const CancioneroNovedadesContext = createContext({
  count: 0,
  hasNotice: false,
  open: () => {},
});

export function useCancioneroNovedades() {
  return useContext(CancioneroNovedadesContext);
}
