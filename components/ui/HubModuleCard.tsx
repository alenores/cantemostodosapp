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
  badge?: string;
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
  badge,
  cta,
}: HubModuleCardProps) {
  return (
    <TapButton
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      className="relative flex min-h-full flex-1 flex-col items-center gap-[10px] rounded-[14px] border border-border bg-bg-dark px-3 py-4 transition-[border-color,background-color,transform] duration-200 disabled:opacity-40 lg:gap-3 lg:px-4 lg:py-5 lg:hover:border-accent/30 lg:hover:bg-bg-card"
    >
      {badge ? (
        <span className="absolute right-2 top-2 rounded-full bg-bg-cola-sheet px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-text-muted">
          {badge}
        </span>
      ) : null}
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
          className="size-16 lg:size-[4.5rem]"
          style={{ color: iconColor ?? "var(--accent)" }}
          aria-hidden="true"
        />
      </div>
      {cta}
    </TapButton>
  );
}
