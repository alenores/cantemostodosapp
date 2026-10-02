"use client";

import {
  CIFRADO_CONTROLS_INPUT_CLASS,
  CIFRADO_DETAILS_FIELD_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
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
      <label className={CIFRADO_DETAILS_FIELD_LABEL_CLASS} htmlFor={id}>
        Video de YouTube
      </label>
      <input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CIFRADO_CONTROLS_INPUT_CLASS}
        placeholder="Pegá el link del video (opcional)"
        aria-invalid={invalido}
      />
      {invalido ? (
        <p className="mt-1 text-xs text-red-400">
          No parece un link de YouTube.
        </p>
      ) : null}
      {videoId ? (
        <div className="mt-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- miniatura externa de YouTube */}
          <img
            src={youtubeThumbnailUrl(videoId)}
            alt="Miniatura del video"
            className="h-12 w-[4.25rem] shrink-0 rounded-md object-cover"
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-text-muted underline"
          >
            Quitar video
          </button>
        </div>
      ) : null}
    </div>
  );
}
