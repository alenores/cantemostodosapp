"use client";

import AutoScrollControl from "@/components/home/AutoScrollControl";
import LecturaBpmControl from "@/components/home/LecturaBpmControl";
import LecturaCompasToggleIcon from "@/components/home/LecturaCompasToggleIcon";
import LetraZoomControl from "@/components/home/LetraZoomControl";
import { TapButton } from "@/components/ui/TapFeedback";
import { LETRA_AUTO_SCROLL_MAX_LEVEL } from "@/hooks/useLetraAutoScroll";
import type { LetraZoomLevel } from "@/lib/letra-zoom";
import {
  getLecturaAutoScrollBottomCss,
  getLecturaFixedRightCss,
} from "@/lib/sala-layout";
import { Pause, Play } from "lucide-react";

type LecturaBottomControlsProps = {
  showZoom?: boolean;
  zoomLevel: LetraZoomLevel;
  zoomEnabled?: boolean;
  onZoomDecrease: () => void;
  onZoomIncrease: () => void;
  autoScrollLevel: number;
  autoScrollEnabled?: boolean;
  hasCompases?: boolean;
  compasesOcultos?: boolean;
  onToggleCompasesOcultos?: () => void;
  compasPlaying?: boolean;
  compasCanPlay?: boolean;
  compasBpm?: number;
  onCompasTogglePlayback?: () => void;
  onCompasBpmDecrease?: () => void;
  onCompasBpmIncrease?: () => void;
  fixedRightCss?: string;
  onAutoScrollAccelerate: () => void;
  onAutoScrollDecelerate: () => void;
};

export default function LecturaBottomControls({
  showZoom = false,
  zoomLevel,
  zoomEnabled = true,
  onZoomDecrease,
  onZoomIncrease,
  autoScrollLevel,
  autoScrollEnabled = true,
  hasCompases = false,
  compasesOcultos = false,
  onToggleCompasesOcultos,
  compasPlaying = false,
  compasCanPlay = false,
  compasBpm = 120,
  onCompasTogglePlayback,
  onCompasBpmDecrease,
  onCompasBpmIncrease,
  fixedRightCss,
  onAutoScrollAccelerate,
  onAutoScrollDecelerate,
}: LecturaBottomControlsProps) {
  const showMobileCompasControls = hasCompases && !compasesOcultos;
  const showMobileAutoScroll =
    !hasCompases || compasesOcultos;
  const showDesktopAutoScroll = !hasCompases || !compasPlaying;

  return (
    <div
      className="fixed z-[45] flex flex-col items-end gap-2 lg:flex-row lg:items-center"
      style={{
        bottom: getLecturaAutoScrollBottomCss(),
        right: fixedRightCss ?? getLecturaFixedRightCss(),
      }}
    >
      {hasCompases ? (
        <div className="flex flex-col items-end gap-2 lg:hidden">
          <LecturaCompasToggleIcon
            compasesOcultos={compasesOcultos}
            onToggle={() => onToggleCompasesOcultos?.()}
          />

          {showMobileCompasControls ? (
            <>
              <TapButton
                type="button"
                onClick={onCompasTogglePlayback}
                disabled={!compasCanPlay}
                aria-label={
                  compasPlaying ? "Pausar compás" : "Reproducir compás"
                }
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_2px_10px_rgba(0,0,0,0.28)] disabled:opacity-40"
              >
                {compasPlaying ? (
                  <Pause className="size-5" aria-hidden="true" />
                ) : (
                  <Play className="size-5 fill-current" aria-hidden="true" />
                )}
              </TapButton>

              <LecturaBpmControl
                bpm={compasBpm}
                onDecrease={() => onCompasBpmDecrease?.()}
                onIncrease={() => onCompasBpmIncrease?.()}
              />
            </>
          ) : null}

          {showMobileAutoScroll ? (
            <AutoScrollControl
              level={autoScrollLevel}
              maxLevel={LETRA_AUTO_SCROLL_MAX_LEVEL}
              enabled={autoScrollEnabled}
              placement="inline"
              onAccelerate={onAutoScrollAccelerate}
              onDecelerate={onAutoScrollDecelerate}
            />
          ) : null}
        </div>
      ) : (
        <div className="lg:hidden">
          <AutoScrollControl
            level={autoScrollLevel}
            maxLevel={LETRA_AUTO_SCROLL_MAX_LEVEL}
            enabled={autoScrollEnabled}
            placement="inline"
            onAccelerate={onAutoScrollAccelerate}
            onDecelerate={onAutoScrollDecelerate}
          />
        </div>
      )}

      {showDesktopAutoScroll ? (
        <div className="hidden lg:block">
          <AutoScrollControl
            level={autoScrollLevel}
            maxLevel={LETRA_AUTO_SCROLL_MAX_LEVEL}
            enabled={autoScrollEnabled}
            placement="inline"
            onAccelerate={onAutoScrollAccelerate}
            onDecelerate={onAutoScrollDecelerate}
          />
        </div>
      ) : null}

      {showZoom ? (
        <div className="hidden lg:block">
          <LetraZoomControl
            level={zoomLevel}
            enabled={zoomEnabled}
            onDecrease={onZoomDecrease}
            onIncrease={onZoomIncrease}
          />
        </div>
      ) : null}
    </div>
  );
}
