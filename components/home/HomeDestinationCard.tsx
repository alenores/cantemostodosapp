"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type HomeDestinationCardProps = {
  label: string;
  subtitle: string;
  icon: LucideIcon;
  ariaLabel: string;
  onClick: () => void;
  featured?: boolean;
  disabled?: boolean;
  pending?: boolean;
  trailing?: ReactNode;
};

export default function HomeDestinationCard({
  label,
  subtitle,
  icon: Icon,
  ariaLabel,
  onClick,
  featured = false,
  disabled = false,
  pending = false,
  trailing,
}: HomeDestinationCardProps) {
  return (
    <TapButton
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      className={`home-destination-card relative flex w-full flex-col items-center justify-between gap-3 rounded-[28px] px-3 py-6 text-center disabled:opacity-40 ${
        featured ? "min-h-[170px]" : "min-h-[190px]"
      }`}
    >
      {pending ? (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55"
          aria-hidden="true"
        >
          <Loader2 className="size-6 animate-spin text-text-primary" />
        </span>
      ) : null}

      <span className="flex flex-1 items-center justify-center text-white" aria-hidden="true">
        <Icon className={featured ? "size-[58px]" : "size-[52px]"} strokeWidth={2.2} />
      </span>
      <span className="block min-h-[2.5em] w-full text-[15px] font-extrabold uppercase leading-tight tracking-[0.015em] text-text-primary">
        {label}
      </span>
      <span className="block w-full text-[13px] leading-tight text-text-muted">
        {subtitle}
      </span>
      {trailing ? <span className="absolute right-3 top-3" aria-hidden="true">{trailing}</span> : null}
    </TapButton>
  );
}
