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
    additionalPrecacheEntries: [
      { url: "/~offline", revision },
      { url: "/manifest.json", revision },
    ],
  });
