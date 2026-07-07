"use client";

import { CompositorMelodicInstrumentIcon } from "@/components/ui/compositor/CompositorMelodicInstrumentIcon";
import type {
  CompositorInstrumentId,
  CompositorMelodicInstrumentId,
} from "@/lib/compositor";
import { Drum } from "lucide-react";

type CompositorInstrumentIconProps = {
  instrumentId: CompositorInstrumentId;
  className?: string;
};

export function CompositorInstrumentIcon({
  instrumentId,
  className = "size-[18px]",
}: CompositorInstrumentIconProps) {
  if (instrumentId === "bateria") {
    return <Drum className={className} aria-hidden="true" />;
  }

  return (
    <CompositorMelodicInstrumentIcon
      instrumentId={instrumentId as CompositorMelodicInstrumentId}
      className={className}
    />
  );
}
