"use client";

import type { CompasMarker } from "@/lib/cifrado";
import {
  getBeatLevelBarAppearance,
  getBeatLevelBarHeightPercent,
} from "@/lib/metronomo";

type CifradoMobileCompasMarkersProps = {
  markers: CompasMarker[];
  selectedLeftPx?: number | null;
};

/**
 * Marcadores de compás bajo el renglón (celular).
 */
export function CifradoMobileCompasMarkers({
  markers,
  selectedLeftPx = null,
}: CifradoMobileCompasMarkersProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <div className="relative mt-1 min-h-6 pb-3" aria-hidden="true">
      {markers.map((marker, index) => {
        const isSelectedMeasure =
          marker.kind === "measure" &&
          selectedLeftPx !== null &&
          Math.abs(marker.leftPx - selectedLeftPx) < 1.5;

        if (marker.kind === "measure") {
          const level = marker.intensidad ?? "fuerte";
          const barAppearance = getBeatLevelBarAppearance(level);
          const measureHeight = Math.max(
            getBeatLevelBarHeightPercent(level) * 0.14,
            10,
          );

          return (
            <span
              key={`mobile-compas-measure-${index}`}
              className="absolute bottom-0"
              style={{ left: marker.leftPx }}
            >
              <span
                className="absolute bottom-full left-0 w-px bg-text-muted/75"
                style={{ height: "2.75rem" }}
              />
              <span
                className={`absolute bottom-0 left-0 rounded-full ${
                  isSelectedMeasure
                    ? "ring-2 ring-compositor-config ring-offset-1"
                    : ""
                }`}
                style={{
                  width: "0.375rem",
                  height: `${measureHeight}px`,
                  backgroundColor: barAppearance.backgroundColor,
                  border: barAppearance.border,
                }}
              />
              {marker.compasNumero !== undefined ? (
                <span
                  className="absolute top-full left-0 mt-0.5 -translate-x-1/2 text-[10px] font-bold leading-none tabular-nums"
                  style={{ color: barAppearance.backgroundColor }}
                >
                  {marker.compasNumero}
                </span>
              ) : null}
            </span>
          );
        }

        const beatLevel = marker.intensidad ?? "medio";
        const beatAppearance = getBeatLevelBarAppearance(beatLevel);
        const beatHeight = Math.max(
          getBeatLevelBarHeightPercent(beatLevel) * 0.1,
          beatLevel === "silencio" ? 4 : 8,
        );

        return (
          <span
            key={`mobile-compas-beat-${index}`}
            className="absolute bottom-0"
            style={{ left: marker.leftPx }}
          >
            <span
              className="absolute bottom-0 left-0 rounded-full"
              style={{
                width: "0.25rem",
                height: `${beatHeight}px`,
                backgroundColor: beatAppearance.backgroundColor,
                border: beatAppearance.border,
              }}
            />
          </span>
        );
      })}
    </div>
  );
}
