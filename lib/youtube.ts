/**
 * Link de YouTube por canción. Solo se guarda el link: el video se ve con conexión
 * desde el reproductor de YouTube, nunca se descarga.
 */

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extrae el id del video de cualquier link de YouTube (compartir, largo, Shorts, móvil, embed). */
export function parseYoutubeVideoId(input: string | null | undefined): string | null {
  const texto = input?.trim();
  if (!texto) return null;

  if (YOUTUBE_ID_RE.test(texto)) return texto;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  const partes = url.pathname.split("/").filter(Boolean);
  let candidato: string | null = null;

  if (host === "youtu.be") {
    candidato = partes[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (partes[0] === "watch") {
      candidato = url.searchParams.get("v");
    } else if (["shorts", "embed", "live", "v"].includes(partes[0] ?? "")) {
      candidato = partes[1] ?? null;
    }
  }

  return candidato && YOUTUBE_ID_RE.test(candidato) ? candidato : null;
}

/** Link normalizado que se guarda en la base. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0" });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Normaliza lo que escribió la persona para guardarlo.
 * `ok: false` = escribió algo que no es un link de YouTube válido.
 */
export function normalizarYoutubeUrl(
  input: string | null | undefined,
): { ok: true; url: string | null } | { ok: false } {
  if (!input?.trim()) return { ok: true, url: null };
  const id = parseYoutubeVideoId(input);
  return id ? { ok: true, url: youtubeWatchUrl(id) } : { ok: false };
}
