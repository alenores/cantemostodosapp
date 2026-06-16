import {
  OFFLINE_SHELL_FALLBACK_ORDER,
} from "@/lib/offline/shell-urls";

function buildMatchCandidates(path: string): string[] {
  if (typeof window === "undefined") {
    return [path];
  }

  const origin = window.location.origin;
  return [path, `${origin}${path}`];
}

export async function matchCachedShellResponse(
  preferredPath?: string,
): Promise<Response | null> {
  if (typeof caches === "undefined") {
    return null;
  }

  const paths = preferredPath
    ? [preferredPath, ...OFFLINE_SHELL_FALLBACK_ORDER.filter((p) => p !== preferredPath)]
    : [...OFFLINE_SHELL_FALLBACK_ORDER];

  const cacheNames = await caches.keys();

  for (const path of paths) {
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);

      for (const candidate of buildMatchCandidates(path)) {
        const match = await cache.match(candidate, { ignoreSearch: false });

        if (match) {
          return match;
        }
      }
    }
  }

  return null;
}

export async function renderCachedShell(preferredPath?: string): Promise<boolean> {
  const cached = await matchCachedShellResponse(preferredPath);

  if (!cached) {
    return false;
  }

  const html = await cached.text();
  document.open();
  document.write(html);
  document.close();
  return true;
}
