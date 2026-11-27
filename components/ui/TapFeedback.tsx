"use client";

import { hayConexion } from "@/lib/conexion";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import { isOfflineNavigableRoute } from "@/lib/offline/offline-routes";
import {
  Suspense,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

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
    <button
      type={type}
      {...props}
      className={`active:scale-[0.96] transition-transform duration-100 ease-out ${className}`.trim()}
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
  noGlobalFeedback?: boolean;
  /** Sin encogimiento ni círculo de carga. La barra de abajo lo usa para no destellar. */
  quiet?: boolean;
  /** Trae la pantalla entera de antemano para abrirla sin esperar. */
  prefetchCompleto?: boolean;
};

function TapLinkContent({
  children,
  quiet,
}: {
  children: ReactNode;
  quiet: boolean;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      {!quiet && pending && (
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
  noGlobalFeedback = false,
  quiet = false,
  prefetchCompleto = false,
}: TapLinkProps) {
  return (
    <Link
      href={href}
      {...(prefetchCompleto ? { prefetch: true } : {})}
      aria-label={ariaLabel}
      onNavigate={(event) => {
        if (!hayConexion() && isOfflineNavigableRoute(href)) {
          event.preventDefault();
          window.location.assign(href);
        }
      }}
      {...(noGlobalFeedback || quiet ? { "data-no-tap-feedback": true } : {})}
      className={`relative outline-none focus:outline-none focus-visible:outline-none ${
        quiet ? "" : "active:scale-[0.96] transition-transform duration-100 ease-out"
      } ${className}`.trim()}
    >
      <Suspense fallback={children}>
        <TapLinkContent quiet={quiet}>{children}</TapLinkContent>
      </Suspense>
    </Link>
  );
}
