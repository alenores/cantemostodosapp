"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { createClient } from "@/lib/supabase/client";
import { parseYoutubeVideoId } from "@/lib/youtube";
import { useEffect, useMemo, useState } from "react";

/**
 * Video de YouTube de una canción del Cancionero. Solo con conexión: sin señal
 * devuelve null y la opción de video no aparece (el video no se descarga).
 *
 * - `cancionId`: se busca el link en la canción del Cancionero.
 * - `youtubeUrl`: link ya conocido (p. ej. copia del Entrenador); no consulta la base.
 */
export function useCancionYoutube(input: {
  cancionId?: number | null;
  youtubeUrl?: string | null;
}): string | null {
  const online = useOnlineStatus();
  const supabase = useMemo(() => createClient(), []);
  const { cancionId, youtubeUrl } = input;
  const usaLinkConocido = youtubeUrl !== undefined;
  const [encontrado, setEncontrado] = useState<{
    cancionId: number;
    videoId: string | null;
  } | null>(null);

  useEffect(() => {
    if (usaLinkConocido || !online || cancionId == null) return;

    let cancelado = false;
    void (async () => {
      const { data, error } = await supabase
        .from("canciones_guardadas")
        .select("youtube_url")
        .eq("id", cancionId)
        .maybeSingle();
      if (cancelado || error) return;
      setEncontrado({
        cancionId,
        videoId: parseYoutubeVideoId(data?.youtube_url as string | null | undefined),
      });
    })();

    return () => {
      cancelado = true;
    };
  }, [cancionId, online, supabase, usaLinkConocido]);

  if (!online) return null;
  if (usaLinkConocido) return parseYoutubeVideoId(youtubeUrl);
  return encontrado && encontrado.cancionId === cancionId ? encontrado.videoId : null;
}
