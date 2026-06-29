"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type HubModuleCardProps = {
  label: string;
  icon: LucideIcon;
  iconColor?: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  cta: ReactNode;
};

export default function HubModuleCard({
  label,
  icon: Icon,
  iconColor,
  ariaLabel,
  onClick,
  disabled = false,
  pending = false,
  cta,
}: HubModuleCardProps) {
  return (
    <TapButton
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      className="relative flex flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4 disabled:opacity-40"
    >
      {pending && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55"
          aria-hidden="true"
        >
          <Loader2 className="size-6 animate-spin text-accent" />
        </span>
      )}
      <p className="text-center text-[13px] font-bold text-text-primary">{label}</p>
      <div className="flex flex-1 items-center justify-center">
        <Icon
          className="size-16"
          style={{ color: iconColor ?? "var(--accent)" }}
          aria-hidden="true"
        />
      </div>
      {cta}
    </TapButton>
  );
}
