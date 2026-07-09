"use client";

import AutoScrollControl from "@/components/home/AutoScrollControl";
import LetraZoomControl from "@/components/home/LetraZoomControl";
import { LETRA_AUTO_SCROLL_MAX_LEVEL } from "@/hooks/useLetraAutoScroll";
import type { LetraZoomLevel } from "@/lib/letra-zoom";
import {
  getLecturaAutoScrollBottomCss,
  getLecturaFixedRightCss,
} from "@/lib/sala-layout";

type LecturaBottomControlsProps = {
  showZoom: boolean;
  zoomLevel: LetraZoomLevel;
  zoomEnabled?: boolean;
  onZoomDecrease: () => void;
  onZoomIncrease: () => void;
  autoScrollLevel: number;
  autoScrollEnabled?: boolean;
  fixedRightCss?: string;
  onAutoScrollAccelerate: () => void;
  onAutoScrollDecelerate: () => void;
};

export default function LecturaBottomControls({
  showZoom,
  zoomLevel,
  zoomEnabled = true,
  onZoomDecrease,
  onZoomIncrease,
  autoScrollLevel,
  autoScrollEnabled = true,
  fixedRightCss,
  onAutoScrollAccelerate,
  onAutoScrollDecelerate,
}: LecturaBottomControlsProps) {
  return (
    <div
      className="fixed z-[45] flex items-center gap-2"
      style={{
        bottom: getLecturaAutoScrollBottomCss(),
        right: fixedRightCss ?? getLecturaFixedRightCss(),
      }}
    >
      {showZoom ? (
        <LetraZoomControl
          level={zoomLevel}
          enabled={zoomEnabled}
          onDecrease={onZoomDecrease}
          onIncrease={onZoomIncrease}
        />
      ) : null}

      <AutoScrollControl
        level={autoScrollLevel}
        maxLevel={LETRA_AUTO_SCROLL_MAX_LEVEL}
        enabled={autoScrollEnabled}
        placement="inline"
        onAccelerate={onAutoScrollAccelerate}
        onDecelerate={onAutoScrollDecelerate}
      />
    </div>
  );
}
