"use client";

import { TapButton } from "@/components/ui/TapFeedback";

const BPM_MIN = 40;
const BPM_MAX = 240;

type LecturaBpmControlProps = {
  bpm: number;
  onDecrease: () => void;
  onIncrease: () => void;
};

export default function LecturaBpmControl({
  bpm,
  onDecrease,
  onIncrease,
}: LecturaBpmControlProps) {
  return (
    <div
      className="flex w-fit shrink-0 select-none items-center rounded-2xl border border-border/50 bg-bg-dark/90 p-0.5 backdrop-blur-md"
      style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.28)" }}
    >
      <TapButton
        type="button"
        aria-label="Reducir BPM"
        disabled={bpm <= BPM_MIN}
        onClick={onDecrease}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 px-1 disabled:opacity-30"
      >
        <span
          className="text-sm font-bold leading-none text-accent"
          aria-hidden="true"
        >
          −
        </span>
      </TapButton>

      <span className="min-w-[2.75rem] px-1 text-center text-[11px] font-bold tabular-nums text-text-primary">
        {bpm}
      </span>

      <TapButton
        type="button"
        aria-label="Aumentar BPM"
        disabled={bpm >= BPM_MAX}
        onClick={onIncrease}
        className="flex size-9 items-center justify-center rounded-xl bg-black/20 px-1 disabled:opacity-30"
      >
        <span
          className="text-sm font-bold leading-none text-accent"
          aria-hidden="true"
        >
          +
        </span>
      </TapButton>
    </div>
  );
}
