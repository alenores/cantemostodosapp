"use client";

import type { CompositorDrumSound } from "@/lib/compositor";

type CompositorDrumIconProps = {
  sound: CompositorDrumSound;
  size?: "sm" | "md";
};

const SIZE_CLASS = {
  sm: "size-3.5",
  md: "size-5",
} as const;

export function CompositorDrumIcon({
  sound,
  size = "md",
}: CompositorDrumIconProps) {
  const iconClass = SIZE_CLASS[size];

  switch (sound) {
    case "kick":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <circle cx="12" cy="15" r="6" className="fill-current opacity-90" />
          <rect x="10" y="4" width="4" height="5" rx="1" className="fill-current" />
        </svg>
      );
    case "snare":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <ellipse
            cx="12"
            cy="13"
            rx="7"
            ry="4"
            className="fill-none stroke-current"
            strokeWidth="1.5"
          />
          <line x1="8" y1="9" x2="16" y2="17" className="stroke-current" strokeWidth="1.2" />
          <line x1="16" y1="9" x2="8" y2="17" className="stroke-current" strokeWidth="1.2" />
        </svg>
      );
    case "hihat":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <line x1="5" y1="10" x2="19" y2="10" className="stroke-current" strokeWidth="2" />
          <line x1="7" y1="14" x2="17" y2="14" className="stroke-current" strokeWidth="1.5" />
        </svg>
      );
    case "hihatOpen":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <line x1="4" y1="10" x2="20" y2="10" className="stroke-current" strokeWidth="2" />
          <line x1="6" y1="14" x2="18" y2="14" className="stroke-current" strokeWidth="1.2" />
          <line x1="8" y1="18" x2="16" y2="18" className="stroke-current" strokeWidth="1" />
        </svg>
      );
    case "crash":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <path
            d="M4 14 Q12 6 20 14"
            className="fill-none stroke-current"
            strokeWidth="2"
          />
        </svg>
      );
    case "ride":
      return (
        <svg viewBox="0 0 24 24" className={iconClass} aria-hidden="true">
          <ellipse
            cx="12"
            cy="12"
            rx="8"
            ry="3"
            className="fill-none stroke-current"
            strokeWidth="1.5"
          />
          <circle cx="14" cy="12" r="1.2" className="fill-current" />
        </svg>
      );
    case "silencio":
      return (
        <span className="text-[10px] leading-none" aria-hidden="true">
          ⊘
        </span>
      );
    default:
      return null;
  }
}
