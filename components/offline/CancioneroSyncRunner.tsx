"use client";

import { useCancioneroSync } from "@/hooks/useCancioneroSync";

export default function CancioneroSyncRunner() {
  useCancioneroSync();
  return null;
}
