"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import {
  Suspense,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { isOfflineNavigableRoute } from "@/lib/offline/offline-routes";

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
  const online = useOnlineStatus();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (online) {
      return;
    }

    event.preventDefault();

    if (!isOfflineNavigableRoute(href)) {
      window.location.assign("/~offline");
      return;
    }

    // Navegación completa: el service worker puede servir HTML/RSC cacheados.
    window.location.assign(href);
  }

  return (
    <Link
      href={href}
      prefetch
      aria-label={ariaLabel}
      className={`relative ${className}`.trim()}
      onClick={handleClick}
    >
      <Suspense fallback={children}>
        <TapLinkContent>{children}</TapLinkContent>
      </Suspense>
    </Link>
  );
}
