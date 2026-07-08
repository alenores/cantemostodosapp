"use client";

import type { ReactNode } from "react";
import {
  RitmoConfigSection,
  type VozNotaPatronConfig,
} from "@/components/ui/ToolRitmoConfig";
import {
  getBeatDurationOptionIndex,
  getBeatDurationRelativeToNegraLabel,
  METRONOME_BEAT_DURATION_OPTIONS,
  type MetronomeBeatDuration,
  type MetronomeBeatPattern,
} from "@/lib/metronomo";
import {
  buildMelodiaSingPattern,
  buildUniformBeatDurations,
} from "@/lib/voz-ritmo";
import { getNotaPatternSummary } from "@/lib/voz-nota-patron";

export function MelodiaConfigSection({
  collapsedSummary,
  autoCollapseWhen,
  patternLength,
  beatDuration,
  beatPattern,
  bpm,
  isPlaying,
  tapTempoTapCount,
  vozNotaPatron,
  patternLengthInputId = "voz-melodia-pattern-length",
  onSetPatternLength,
  onSetBeatDuration,
  onSetBpm,
  onTapTempo,
  headerAction,
  embedded = false,
}: {
  collapsedSummary?: string;
  autoCollapseWhen?: boolean;
  headerAction?: ReactNode;
  embedded?: boolean;
  patternLength: number;
  beatDuration: MetronomeBeatDuration;
  beatPattern: MetronomeBeatPattern;
  bpm: number;
  isPlaying: boolean;
  tapTempoTapCount: number;
  vozNotaPatron: VozNotaPatronConfig;
  patternLengthInputId?: string;
  onSetPatternLength: (value: number) => void;
  onSetBeatDuration: (value: MetronomeBeatDuration) => void;
  onSetBpm: (value: number) => void;
  onTapTempo: () => void;
}) {
  const beatDurations = buildUniformBeatDurations(beatDuration);

  const figuraLabel =
    METRONOME_BEAT_DURATION_OPTIONS[
      getBeatDurationOptionIndex(beatDuration)
    ]?.label ?? beatDuration;
  const summary =
    collapsedSummary ??
    `${getNotaPatternSummary(
      vozNotaPatron.pattern,
      patternLength,
    )} · ${patternLength} golpes · ${figuraLabel} · ${bpm} BPM`;

  return (
    <RitmoConfigSection
      compasLayout="flat"
      collapsedSummary={summary}
      autoCollapseWhen={autoCollapseWhen}
      configHeaderAction={headerAction}
      embedded={embedded}
      hideIntensidadTab
      hideCompasHelp
      uniformFigura
      vozNotaPatron={vozNotaPatron}
      beatPattern={beatPattern}
      patternLength={patternLength}
      beatDurations={beatDurations}
      bpm={bpm}
      isPlaying={isPlaying}
      tapTempoTapCount={tapTempoTapCount}
      patternLengthInputId={patternLengthInputId}
      onSetPatternLength={onSetPatternLength}
      onSetBeatDurationAtSlot={(_, duration) => onSetBeatDuration(duration)}
      onSetBeatLevelAtSlot={() => {}}
      onSetBpm={onSetBpm}
      onTapTempo={onTapTempo}
    />
  );
}

export function buildMelodiaCompasState(
  patternLength: number,
  beatDuration: MetronomeBeatDuration,
) {
  return {
    beatPattern: buildMelodiaSingPattern(patternLength),
    beatDurations: buildUniformBeatDurations(beatDuration),
  };
}

export function getMelodiaFiguraSummary(beatDuration: MetronomeBeatDuration) {
  const option =
    METRONOME_BEAT_DURATION_OPTIONS[
      getBeatDurationOptionIndex(beatDuration)
    ];
  return option
    ? `${option.label} (${getBeatDurationRelativeToNegraLabel(option.id)})`
    : beatDuration;
}
