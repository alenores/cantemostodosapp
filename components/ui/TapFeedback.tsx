"use client";

import Link from "next/link";
import { type ButtonHTMLAttributes, type ReactNode } from "react";

type TapButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function TapButton({
  children,
  className = "",
  type = "button",
  ...props
}: TapButtonProps) {
  return (
    <button type={type} {...props} className={className.trim()}>
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
    <Link href={href} aria-label={ariaLabel} className={className.trim()}>
      {children}
    </Link>
  );
}
