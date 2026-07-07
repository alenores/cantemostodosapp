"use client";

import type { MidiImportConflict, MidiTrackAssignment } from "@/lib/compositor-midi";
import {
  getConflictsForMidiTrack,
  getMidiTrackStatus,
} from "@/lib/compositor-midi/conflicts";
import { COMPOSITOR_INSTRUMENT_OPTIONS } from "@/lib/compositor";
import type { CompositorInstrumentId } from "@/lib/compositor";
import { COMPOSITOR_LABEL_SIN_ASIGNAR } from "@/lib/ritmo-terminologia";

type CompositorMidiSourceTrackRowProps = {
  assignment: MidiTrackAssignment;
  conflicts: MidiImportConflict[];
  eventSources: Map<string, number>;
  allowedLayers?: CompositorInstrumentId[];
  disabled?: boolean;
  showConflicts?: boolean;
  onAssignmentChange: (
    instrumentId: CompositorInstrumentId | null,
  ) => void;
  onConflictClick: (conflict: MidiImportConflict) => void;
};

export function CompositorMidiSourceTrackRow({
  assignment,
  conflicts,
  eventSources,
  allowedLayers,
  disabled = false,
  showConflicts = true,
  onAssignmentChange,
  onConflictClick,
}: CompositorMidiSourceTrackRowProps) {
  const status = getMidiTrackStatus(
    assignment.midiTrackIndex,
    conflicts,
    eventSources,
  );
  const trackConflicts = getConflictsForMidiTrack(
    assignment.midiTrackIndex,
    conflicts,
    eventSources,
  );
  const layerOptions = allowedLayers
    ? COMPOSITOR_INSTRUMENT_OPTIONS.filter((option) =>
        allowedLayers.includes(option.id),
      )
    : COMPOSITOR_INSTRUMENT_OPTIONS;

  return (
    <div
      className={`rounded-[10px] border px-3 py-2.5 ${
        status === "ok"
          ? "border-[color-mix(in_srgb,var(--tuner-cerca)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-cerca)_8%,var(--bg-card))]"
          : "border-[color-mix(in_srgb,var(--tuner-lejos)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-lejos)_8%,var(--bg-card))]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`size-2.5 shrink-0 rounded-full ${
            status === "ok" ? "bg-[var(--tuner-cerca)]" : "bg-[var(--tuner-lejos)]"
          }`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 text-sm font-semibold text-text-primary">
          {assignment.midiTrackName}
        </p>
        <select
          disabled={disabled}
          value={assignment.assignedInstrumentId ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            onAssignmentChange(
              value === "" ? null : (value as CompositorInstrumentId),
            );
          }}
          className="min-h-9 rounded-lg border border-border bg-bg-dark px-2 text-xs font-semibold text-text-primary disabled:opacity-50"
          aria-label={`Capa para ${assignment.midiTrackName}`}
        >
          <option value="">{COMPOSITOR_LABEL_SIN_ASIGNAR}</option>
          {layerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {showConflicts && trackConflicts.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {trackConflicts.map((conflict) => (
            <li key={conflict.id}>
              {conflict.target ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onConflictClick(conflict)}
                  className="w-full rounded-md px-1 py-0.5 text-left text-[11px] leading-snug text-[var(--tuner-lejos)] underline decoration-dotted underline-offset-2 hover:bg-[color-mix(in_srgb,var(--tuner-lejos)_10%,transparent)] disabled:opacity-50"
                >
                  {conflict.message}
                </button>
              ) : (
                <p className="px-1 text-[11px] leading-snug text-[var(--tuner-lejos)]">
                  {conflict.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : showConflicts ? (
        <p className="mt-1.5 text-[10px] text-[var(--tuner-cerca)]">
          Sin conflictos en esta pista.
        </p>
      ) : null}
    </div>
  );
}
