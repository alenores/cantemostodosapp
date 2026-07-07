"use client";

import {
  getCompositorTrack,
  type CompositorInstrumentId,
  type CompositorPiece,
} from "@/lib/compositor";
import type { MidiImportConflict } from "@/lib/compositor-midi";
import {
  describeMidiImportConflict,
  getConflictsForBlock,
} from "@/lib/compositor-midi/conflict-details";
import {
  COMPOSITOR_LABEL_BLOQUE_SIN_CONFLICTOS,
  COMPOSITOR_LABEL_DETALLE_BLOQUE_SELECCIONADO,
  COMPOSITOR_HELP_SELECCIONAR_BLOQUE_REVISION,
} from "@/lib/ritmo-terminologia";
import { useMemo } from "react";

type CompositorMidiBlockConflictDetailProps = {
  selectedEventId: string | null;
  instrumentId: CompositorInstrumentId;
  piece: CompositorPiece;
  conflicts: MidiImportConflict[];
};

export function CompositorMidiBlockConflictDetail({
  selectedEventId,
  instrumentId,
  piece,
  conflicts,
}: CompositorMidiBlockConflictDetailProps) {
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) {
      return null;
    }

    return (
      getCompositorTrack(piece, instrumentId).events.find(
        (event) => event.id === selectedEventId,
      ) ?? null
    );
  }, [instrumentId, piece, selectedEventId]);

  const blockConflicts = useMemo(() => {
    if (!selectedEventId) {
      return [];
    }

    return getConflictsForBlock(selectedEventId, conflicts);
  }, [conflicts, selectedEventId]);

  if (!selectedEventId) {
    return (
      <p className="mb-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-[11px] leading-snug text-text-muted">
        {COMPOSITOR_HELP_SELECCIONAR_BLOQUE_REVISION}
      </p>
    );
  }

  if (blockConflicts.length === 0) {
    return (
      <p className="mb-2 rounded-[10px] border border-[color-mix(in_srgb,var(--tuner-cerca)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-cerca)_8%,var(--bg-card))] px-3 py-2.5 text-[11px] leading-snug text-[var(--tuner-cerca)]">
        {COMPOSITOR_LABEL_BLOQUE_SIN_CONFLICTOS}
      </p>
    );
  }

  return (
    <div className="mb-2 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
        {COMPOSITOR_LABEL_DETALLE_BLOQUE_SELECCIONADO}
      </p>
      {blockConflicts.map((conflict) => {
        const detail = describeMidiImportConflict(conflict, {
          instrumentId,
          piece,
          event: selectedEvent,
        });

        return (
          <div
            key={conflict.id}
            className="rounded-[10px] border border-[color-mix(in_srgb,var(--tuner-lejos)_35%,var(--border))] bg-[color-mix(in_srgb,var(--tuner-lejos)_8%,var(--bg-card))] px-3 py-2.5"
          >
            <p className="text-xs font-bold text-[var(--tuner-lejos)]">
              {detail.title}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-text-primary">
              {detail.description}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-text-muted">
              <span className="font-semibold text-text-primary">Qué podés hacer: </span>
              {detail.suggestion}
            </p>
          </div>
        );
      })}
    </div>
  );
}
