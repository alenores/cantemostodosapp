"use client";

import CifradoSettingsFields from "@/components/cifrado/CifradoSettingsFields";
import { TapButton } from "@/components/ui/TapFeedback";
import { APP_SIDEBAR_WIDTH_CSS } from "@/lib/app-layout";
import { COMPAS_LABELS } from "@/lib/cifrado";
import type { TipoCompas } from "@/lib/cifrado";
import type { NotaIndex } from "@/lib/cifrado";
import type { NotacionAcordes } from "@/lib/notacion-acordes";
import { Pause, Play } from "lucide-react";

type CifradoLecturaSidePanelProps = {
  compasLabel: string;
  showCompasMarkers?: boolean;
  playing: boolean;
  canPlay: boolean;
  notacion: NotacionAcordes;
  tonalidadIndex: NotaIndex;
  bpm: number;
  tapCount: number;
  onTogglePlayback: () => void;
  onNotacionChange: (next: NotacionAcordes) => void;
  onTonalidadChange: (next: NotaIndex) => void;
  onBpmChange: (next: number) => void;
  onTapTempo: () => void;
};

export function getLecturaPremiumRailWidthCss(): string {
  return APP_SIDEBAR_WIDTH_CSS;
}

export function getLecturaPremiumCompasLabel(tipoCompas: TipoCompas): string {
  return COMPAS_LABELS[tipoCompas];
}

export default function CifradoLecturaSidePanel({
  compasLabel,
  showCompasMarkers = true,
  playing,
  canPlay,
  notacion,
  tonalidadIndex,
  bpm,
  tapCount,
  onTogglePlayback,
  onNotacionChange,
  onTonalidadChange,
  onBpmChange,
  onTapTempo,
}: CifradoLecturaSidePanelProps) {
  return (
    <aside
      className="hidden min-h-0 shrink-0 flex-col border-r border-border bg-bg-darker lg:flex"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-label="Controles de cifrado premium"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
        {showCompasMarkers ? (
          <>
            <p className="mb-4 text-sm font-semibold text-text-muted">
              Compás {compasLabel}
            </p>

            <TapButton
              type="button"
              onClick={onTogglePlayback}
              disabled={!canPlay}
              aria-label={playing ? "Pausar compás" : "Reproducir compás"}
              className="mb-5 flex size-12 shrink-0 items-center justify-center self-center rounded-full bg-accent text-white shadow-[0_2px_10px_rgba(0,0,0,0.28)] disabled:opacity-40"
            >
              {playing ? (
                <Pause className="size-5" aria-hidden="true" />
              ) : (
                <Play className="size-5 fill-current" aria-hidden="true" />
              )}
            </TapButton>
          </>
        ) : null}

        <CifradoSettingsFields
          idPrefix="cifrado-lectura"
          showCompas={showCompasMarkers}
          notacion={notacion}
          tonalidadIndex={tonalidadIndex}
          bpm={bpm}
          tapCount={tapCount}
          onNotacionChange={onNotacionChange}
          onTonalidadChange={onTonalidadChange}
          onBpmChange={onBpmChange}
          onTapTempo={onTapTempo}
        />
      </div>
    </aside>
  );
}

export function CifradoLecturaSidePanelEmpty() {
  return (
    <aside
      className="hidden min-h-0 shrink-0 border-r border-border bg-bg-darker lg:block"
      style={{ width: getLecturaPremiumRailWidthCss() }}
      aria-hidden="true"
    />
  );
}
