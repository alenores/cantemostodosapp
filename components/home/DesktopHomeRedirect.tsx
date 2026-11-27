"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect } from "react";

/** En computadora no hay inicio: se abre el Cancionero. */
export default function DesktopHomeRedirect() {
  const router = useRouter();

  useLayoutEffect(() => {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      router.replace("/canciones/cancionero");
    }
  }, [router]);

  return null;
}
