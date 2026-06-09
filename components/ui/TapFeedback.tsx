"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
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

function TapLinkContent({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending && (
        <span
          className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-bg-app/55"
          aria-hidden="true"
        >
          <Loader2 className="size-5 animate-spin text-accent" />
        </span>
      )}
      {children}
    </>
  );
}

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
      className={`relative ${className}`.trim()}
    >
      <TapLinkContent>{children}</TapLinkContent>
    </Link>
  );
}
