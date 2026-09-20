import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

function getRevision(): string {
  try {
    return (
      spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
      crypto.randomUUID()
    );
  } catch {
    return crypto.randomUUID();
  }
}

const revision = getRevision();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "app/sw.ts",
    useNativeEsbuild: true,
    globIgnores: [
      "**/node_modules/**/*",
      "public/samples/compositor/**/*",
    ],
    // Los archivos de public (pwa-boot.html y manifest.json) ya se incluyen automáticamente.
    // Repetirlos con otra revisión impide que arranque el service worker.
    additionalPrecacheEntries: [
      { url: "/", revision },
      { url: "/~offline", revision },
      { url: "/salas", revision },
      { url: "/auth/login", revision },
      { url: "/individual", revision },
    ],
  });
