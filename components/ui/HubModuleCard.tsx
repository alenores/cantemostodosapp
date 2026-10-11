"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type HubModuleCardProps = {
  moduleId: string;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
  badge?: string;
  cta?: ReactNode;
  iconColor?: string;
  /** El número queda sobre el dibujo, como un aviso. */
  badgeOnIcon?: boolean;
};

export default function HubModuleCard({
  moduleId,
  label,
  icon: Icon,
  ariaLabel,
  onClick,
  disabled = false,
  pending = false,
  badge,
  cta,
  iconColor,
  badgeOnIcon = false,
}: HubModuleCardProps) {
  const aviso = badge ? (
    <span className="hub-module-card__aviso absolute -right-1.5 -top-1.5 z-[2] flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white">
      {badge}
    </span>
  ) : null;

  return (
    <TapButton
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      data-hub-accent={moduleId}
      style={iconColor ? ({ "--hub-icon": iconColor } as CSSProperties) : undefined}
      className="hub-module-card relative flex min-h-full flex-1 flex-col items-center gap-[10px] rounded-[14px] px-3 py-4 transition-[border-color,background-color,box-shadow,transform] duration-200 disabled:opacity-40 lg:gap-3 lg:px-4 lg:py-5"
    >
      {badge && !badgeOnIcon ? (
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
      <div className="flex flex-1 items-center justify-center">
        <span className="hub-module-card__icon-wrap relative" aria-hidden="true">
          <Icon className="hub-module-card__icon" />
          {badgeOnIcon ? aviso : null}
        </span>
      </div>
      <p className="hub-module-card__label text-center text-[15px] font-extrabold leading-tight text-text-primary">{label}</p>
      {cta}
    </TapButton>
  );
}
