"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/**
 * `row`: tarjeta horizontal de siempre (ícono + tres renglones).
 * `hero` / `tall` / `compact`: inicio tipo tablero (2026-10-04): título grande arriba,
 * frase abajo y dibujo de línea al costado o en el medio, sin taparse.
 */
export type HomeDestinationCardSize = "row" | "hero" | "tall" | "compact";

type HomeDestinationCardProps = {
  label: string;
  description: string;
  helpText?: string;
  size?: HomeDestinationCardSize;
  /**
   * Dibujo de línea (máscara blanca sobre transparente, en `public/` para usar sin señal);
   * se pinta con el color de la tarjeta.
   */
  imageSrc?: string;
  className?: string;
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
  size = "row",
  imageSrc,
  className = "",
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
    ...(imageSrc ? { ["--home-card-art" as string]: `url(${imageSrc})` } : {}),
  } satisfies CSSProperties;

  const titleStyle = titleInviteActive
    ? ({
        ["--home-title-accent" as string]: `var(${accentVar})`,
      } satisfies CSSProperties)
    : undefined;

  const pendingOverlay = pending ? (
    <span
      className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55"
      aria-hidden="true"
    >
      <Loader2 className="size-6 animate-spin text-accent" />
    </span>
  ) : null;

  if (size !== "row") {
    const isCompact = size === "compact";
    const padding = isCompact ? "p-3" : "p-3.5";

    return (
      <TapButton
        aria-label={ariaLabel}
        onClick={onClick}
        disabled={disabled || pending}
        style={cardStyle}
        className={`home-cascade-item home-destination-card home-destination-card--${size} relative flex w-full flex-col justify-between overflow-hidden rounded-amplio border border-solid bg-bg-card text-left transition-[border-color,background-color,box-shadow,transform] duration-200 disabled:opacity-40 ${padding} ${className}`.trim()}
      >
        {imageSrc ? (
          <span className="home-destination-card__art" aria-hidden="true" />
        ) : (
          <span
            className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-xl"
            style={{ background: `var(${accentDimVar})` }}
            aria-hidden="true"
          >
            <Icon className="size-[22px]" style={{ color: `var(${accentVar})` }} />
          </span>
        )}
        {trailing ? (
          <span className="absolute right-3 top-3 z-[1]">{trailing}</span>
        ) : null}
        {pendingOverlay}
        <span
          className={`relative block font-extrabold leading-tight text-text-primary ${
            size === "hero" ? "text-2xl" : size === "tall" ? "text-xl" : "text-lg"
          } ${titleInviteActive ? "home-title-invite" : ""}`}
          style={titleStyle}
        >
          {label}
        </span>
        <span
          className={`relative block leading-snug text-text-secondary ${
            size === "hero" ? "max-w-[46%] text-sm" : isCompact ? "max-w-[50%] text-xs" : "text-xs"
          }`}
        >
          {description}
        </span>
      </TapButton>
    );
  }

  return (
    <TapButton
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled || pending}
      style={cardStyle}
      className="home-cascade-item home-destination-card relative flex w-full items-center gap-3 rounded-amplio border border-solid bg-bg-card px-4 py-5 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 disabled:opacity-40"
    >
      {pendingOverlay}
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
          style={titleStyle}
        >
          {label}
        </span>
        <span className="mt-0.5 block text-[12.5px] text-text-secondary">
          {description}
        </span>
        {helpText ? (
          <span className="mt-[3px] block text-[11px] leading-[1.4] text-text-muted opacity-75">
            {helpText}
          </span>
        ) : null}
      </span>
      {trailing}
    </TapButton>
  );
}
