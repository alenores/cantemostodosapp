"use client";

import { youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";
import { Play, X } from "lucide-react";
import { useState } from "react";

type VideoMiniaturaCardProps = {
  videoId: string;
  titulo?: string;
  className?: string;
};

/**
 * Tarjeta con la miniatura del video. El reproductor recién carga al tocarla,
 * así no se gastan datos si no se mira.
 */
export default function VideoMiniaturaCard({
  videoId,
  titulo,
  className = "",
}: VideoMiniaturaCardProps) {
  const [reproduciendo, setReproduciendo] = useState(false);

  if (reproduciendo) {
    return (
      <div className={`overflow-hidden rounded-xl border border-border bg-bg-dark ${className}`}>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={youtubeEmbedUrl(videoId)}
            title={titulo ? `Video de ${titulo}` : "Video de YouTube"}
            className="absolute inset-0 size-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <button
          type="button"
          onClick={() => setReproduciendo(false)}
          className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-text-muted"
        >
          <X className="size-3.5" aria-hidden="true" />
          Cerrar video
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setReproduciendo(true)}
      aria-label={titulo ? `Ver video de ${titulo}` : "Ver video"}
      className={`flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border bg-bg-dark p-2 text-left ${className}`}
    >
      <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube */}
        <img
          src={youtubeThumbnailUrl(videoId)}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-7 items-center justify-center rounded-full bg-black/65">
            <Play className="size-3.5 fill-current text-text-primary" aria-hidden="true" />
          </span>
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text-primary">Ver video</span>
        <span className="block text-xs text-text-muted">YouTube · necesita conexión</span>
      </span>
    </button>
  );
}
