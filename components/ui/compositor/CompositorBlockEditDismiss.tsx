"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { X } from "lucide-react";

export function CompositorBlockEditDismiss({
  disabled = false,
  onDismiss,
}: {
  disabled?: boolean;
  onDismiss: () => void;
}) {
  return (
    <TapButton
      type="button"
      disabled={disabled}
      onClick={onDismiss}
      aria-label="Salir del modo edición"
      className="flex size-6 shrink-0 items-center justify-center rounded-md text-text-muted/70 transition-colors hover:text-text-muted disabled:opacity-50"
    >
      <X className="size-3.5" strokeWidth={2} aria-hidden="true" />
    </TapButton>
  );
}
