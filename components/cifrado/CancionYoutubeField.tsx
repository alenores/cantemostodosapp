"use client";

import { CIFRADO_CONTROLS_INPUT_CLASS } from "@/components/cifrado/cifrado-controls-ui";
import { parseYoutubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";

type CancionYoutubeFieldProps = {
  id: string;
  value: string;
  onChange: (next: string) => void;
};

/** Link de YouTube opcional de la canción, con miniatura para confirmar que es el video correcto. */
export default function CancionYoutubeField({
  id,
  value,
  onChange,
}: CancionYoutubeFieldProps) {
  const videoId = parseYoutubeVideoId(value);
  const invalido = Boolean(value.trim()) && !videoId;

  return (
    <div>
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="size-6 shrink-0"
          aria-hidden="true"
        >
          <path
            fill="#FF0000"
            d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8z"
          />
          <path fill="#fff" d="M9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${CIFRADO_CONTROLS_INPUT_CLASS} min-w-0 flex-1`}
          placeholder="Pegá el link del video (opcional)"
          aria-label="Link de YouTube"
          aria-invalid={invalido}
        />
      </div>
      {invalido ? (
        <p className="mt-1 text-xs text-red-400">
          No parece un link de YouTube.
        </p>
      ) : null}
      {videoId ? (
        <div className="mt-3 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube */}
          <img
            src={youtubeThumbnailUrl(videoId)}
            alt="Miniatura del video"
            className="aspect-video w-full max-w-xs rounded-lg object-cover"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}
