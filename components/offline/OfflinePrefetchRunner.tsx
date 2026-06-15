"use client";

import { useOfflinePrefetch } from "@/hooks/useOfflinePrefetch";

export default function OfflinePrefetchRunner() {
  useOfflinePrefetch();
  return null;
}
