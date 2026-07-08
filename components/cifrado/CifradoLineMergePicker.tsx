"use client";

import {
  CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS,
  CIFRADO_CONTROLS_SECTION_LABEL_CLASS,
} from "@/components/cifrado/cifrado-controls-ui";
import { TapButton } from "@/components/ui/TapFeedback";
import type { LineMergePreview } from "@/lib/cifrado";
import {
  CIFRADO_HELP_PEGAR_EN_RENGLON,
  CIFRADO_LABEL_CANCELAR_UNION,
  CIFRADO_LABEL_CONFIRMAR_UNION,
  CIFRADO_LABEL_PREVIEW_UNION,
  CIFRADO_LABEL_RENGLON_DESTINO,
} from "@/lib/ritmo-terminologia";

type CifradoLineMergePickerProps = {
  lineMergeDestNumber: number | null;
  sourceLineNumber: number;
  totalLines: number;
  mergePreview: LineMergePreview | null;
  onLineMergeDestNumberChange: (value: number | null) => void;
  onConfirmLineMerge: () => void;
  onCancelLineMerge: () => void;
};

export function CifradoLineMergePicker({
  lineMergeDestNumber,
  sourceLineNumber,
  totalLines,
  mergePreview,
  onLineMergeDestNumberChange,
  onConfirmLineMerge,
  onCancelLineMerge,
}: CifradoLineMergePickerProps) {
  const mergeDestValid =
    lineMergeDestNumber !== null &&
    lineMergeDestNumber >= 1 &&
    lineMergeDestNumber <= totalLines &&
    lineMergeDestNumber !== sourceLineNumber;

  return (
    <div className="space-y-2">
      <p className="text-center text-xs font-semibold text-text-primary">
        {CIFRADO_LABEL_RENGLON_DESTINO}
      </p>
      <p className="text-center text-[11px] leading-snug text-text-muted">
        {CIFRADO_HELP_PEGAR_EN_RENGLON}
      </p>

      <div className="flex justify-center">
        <input
          id="cifrado-line-merge-dest"
          type="number"
          min={1}
          max={totalLines}
          value={lineMergeDestNumber ?? ""}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);

            if (!Number.isFinite(parsed)) {
              onLineMergeDestNumberChange(null);
              return;
            }

            onLineMergeDestNumberChange(
              Math.min(totalLines, Math.max(1, parsed)),
            );
          }}
          className="h-9 w-11 rounded-[8px] border border-compositor-config-border bg-bg-darker text-center text-sm font-bold tabular-nums text-text-primary outline-none focus:border-compositor-config focus:ring-1 focus:ring-compositor-config/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={CIFRADO_LABEL_RENGLON_DESTINO}
        />
      </div>

      {mergePreview ? (
        <div className="w-full rounded-[8px] border border-border/80 bg-letra-bg px-2.5 py-2">
          <p className={CIFRADO_CONTROLS_SECTION_LABEL_CLASS}>
            {CIFRADO_LABEL_PREVIEW_UNION}
          </p>
          <p className="mb-1 text-[10px] text-text-muted">
            Renglón {mergePreview.destLineIndex + 1}
          </p>
          <p className="font-mono text-xs leading-relaxed text-letra-text">
            {mergePreview.mergedText || (
              <span className="italic text-text-muted">(renglón vacío)</span>
            )}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-1.5">
        <TapButton
          type="button"
          disabled={!mergeDestValid}
          onClick={onConfirmLineMerge}
          className={`${CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS} ${
            mergeDestValid ? "bg-compositor-config text-white" : "opacity-50"
          }`}
        >
          {CIFRADO_LABEL_CONFIRMAR_UNION}
        </TapButton>
        <TapButton
          type="button"
          onClick={onCancelLineMerge}
          className={CIFRADO_EDITOR_LINE_FAB_BUTTON_CLASS}
        >
          {CIFRADO_LABEL_CANCELAR_UNION}
        </TapButton>
      </div>
    </div>
  );
}
