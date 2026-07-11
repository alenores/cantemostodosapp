"use client";

import {
  hasSeenAcordesEmbedHint,
  markAcordesEmbedHintSeen,
} from "@/lib/acordes-embed-hint";
import { getLetraSourceKind } from "@/lib/letra-display";
import { useEffect, useState } from "react";

/** Cartel de primera visita solo en embeds de Acordes de Canciones. */
export function useAcordesEmbedPrimeraVez(url: string | null | undefined) {
  const isAcordes =
    Boolean(url) && getLetraSourceKind(url!) === "acordesdcanciones";
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!isAcordes) {
      setShowHint(false);
      return;
    }

    setShowHint(!hasSeenAcordesEmbedHint());
  }, [isAcordes, url]);

  function dismissHint() {
    markAcordesEmbedHintSeen();
    setShowHint(false);
  }

  return {
    showAcordesPrimeraVezHint: isAcordes && showHint,
    dismissAcordesPrimeraVezHint: dismissHint,
  };
}
