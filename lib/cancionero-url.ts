const CANCIONERO_URL_PREFIX = "cancionero://";

export function isCancioneroUrl(url: string | null | undefined): boolean {
  return Boolean(url?.trim().startsWith(CANCIONERO_URL_PREFIX));
}

export function parseCancioneroUrlId(
  url: string | null | undefined,
): number | null {
  if (!isCancioneroUrl(url)) {
    return null;
  }

  const id = Number.parseInt(
    url!.trim().slice(CANCIONERO_URL_PREFIX.length),
    10,
  );

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return id;
}
