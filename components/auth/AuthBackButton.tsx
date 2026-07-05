"use client";

import { TapLink } from "@/components/ui/TapFeedback";
import { ArrowLeft } from "lucide-react";

export default function AuthBackButton() {
  return (
    <div
      className="absolute left-4"
      style={{ top: "max(1rem, env(safe-area-inset-top, 0px))" }}
    >
      <TapLink
        href="/"
        ariaLabel="Volver al inicio"
        className="flex size-11 items-center justify-center rounded-full border border-border bg-bg-card text-text-primary"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </TapLink>
    </div>
  );
}
