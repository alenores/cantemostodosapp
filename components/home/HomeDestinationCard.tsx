"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type HomeDestinationCardProps = {
  label: string;
  description: string;
  helpText: string;
  icon: LucideIcon;
  accentVar: string;
  accentDimVar: string;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  trailing?: ReactNode;
  cascadeDelayMs?: number;
  titleInviteActive?: boolean;
};

export default function HomeDestinationCard({
  label,
  description,
  helpText,
  icon: Icon,
  accentVar,
  accentDimVar,
  ariaLabel,
  onClick,
  disabled = false,
  pending = false,
  trailing,
  cascadeDelayMs = 0,
  titleInviteActive = false,
}: HomeDestinationCardProps) {
  const cardStyle = {
    ["--accent-card-var" as string]: `var(${accentVar})`,
    ["--cascade-delay" as string]: `${cascadeDelayMs}ms`,
  } satisfies CSSProperties;

  return (
    <TapButton
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      style={cardStyle}
      className="home-cascade-item home-destination-card relative flex w-full items-center gap-3 rounded-amplio border border-solid bg-bg-card px-4 py-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 disabled:opacity-40"
    >
      {pending ? (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55"
          aria-hidden="true"
        >
          <Loader2 className="size-6 animate-spin text-accent" />
        </span>
      ) : null}
      <span
        className="flex size-[46px] shrink-0 items-center justify-center rounded-xl"
        style={{ background: `var(${accentDimVar})` }}
        aria-hidden="true"
      >
        <Icon
          className="size-[22px]"
          style={{ color: `var(${accentVar})` }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[17px] font-extrabold text-text-primary ${
            titleInviteActive ? "home-title-invite" : ""
          }`}
          style={
            titleInviteActive
              ? ({
                  ["--home-title-accent" as string]: `var(${accentVar})`,
                } satisfies CSSProperties)
              : undefined
          }
        >
          {label}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-text-secondary">
          {description}
        </span>
        <span className="mt-[3px] block text-[11px] leading-[1.4] text-text-muted opacity-75">
          {helpText}
        </span>
      </span>
      {trailing}
    </TapButton>
  );
}
