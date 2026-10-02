"use client";

import type { LecturaFabItem } from "@/components/home/LecturaFabOption";
import { SquarePlay } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

/**
 * Estado de la ventanita de video en modo lectura. Se cierra sola al cambiar de
 * canción o si se pierde la conexión (videoId pasa a null).
 */
export function useVideoLectura(videoId: string | null, cancionKey: string | number | null) {
  const [abiertoPara, setAbiertoPara] = useState<string | null>(null);
  const clave = videoId && cancionKey != null ? `${cancionKey}::${videoId}` : null;
  const abierto = clave !== null && abiertoPara === clave;

  const abrir = useCallback(() => setAbiertoPara(clave), [clave]);
  const cerrar = useCallback(() => setAbiertoPara(null), []);

  /** Ítem "Video" del menú flotante del celular (null si la canción no tiene video). */
  const fabItem = useMemo<LecturaFabItem | null>(
    () =>
      clave
        ? {
            key: "video",
            icon: SquarePlay,
            label: abierto ? "Cerrar video" : "Video",
            onClick: abierto ? cerrar : abrir,
          }
        : null,
    [abierto, abrir, cerrar, clave],
  );

  return {
    videoId: abierto ? videoId : null,
    abierto,
    abrir: clave ? abrir : undefined,
    cerrar,
    fabItem,
  };
}
