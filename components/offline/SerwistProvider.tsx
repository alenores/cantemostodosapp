"use client";

import { SerwistProvider as SerwistProviderBase } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

type SerwistProviderProps = {
  children: ReactNode;
};

export default function SerwistProvider({ children }: SerwistProviderProps) {
  return (
    <SerwistProviderBase swUrl="/serwist/sw.js">{children}</SerwistProviderBase>
  );
}
