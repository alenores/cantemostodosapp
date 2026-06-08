"use client";

import { triggerHaptic } from "@/lib/haptic";
import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

const tapClassName =
  "transition-transform duration-150 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100";

type TapButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function TapButton({
  children,
  className = "",
  type = "button",
  onClick,
  ...props
}: TapButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    triggerHaptic();
    onClick?.(event);
  }

  return (
    <button
      type={type}
      {...props}
      onClick={handleClick}
      className={`${tapClassName} ${className}`.trim()}
    >
      {children}
    </button>
  );
}

type TapLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
};

export function TapLink({
  href,
  children,
  className = "",
  ariaLabel,
}: TapLinkProps) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={() => triggerHaptic()}
      className={`${tapClassName} ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
