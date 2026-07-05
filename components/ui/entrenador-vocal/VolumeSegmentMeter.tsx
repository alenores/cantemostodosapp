import { levelPercentToFilledSegments } from "@/lib/voz-intensidad";

type VolumeSegmentMeterProps = {
  levelPercent: number;
  segmentCount?: number;
  filledClassName?: string;
  filledColor?: string;
  emptyClassName?: string;
  segmentClassName?: string;
  gapClassName?: string;
  className?: string;
  ariaHidden?: boolean;
  ariaLabel?: string;
};

export function VolumeSegmentMeter({
  levelPercent,
  segmentCount = 5,
  filledClassName = "bg-voz-config",
  filledColor,
  emptyClassName = "bg-border/50",
  segmentClassName = "h-[3px] w-5 rounded-full",
  gapClassName = "gap-[3px]",
  className = "",
  ariaHidden = false,
  ariaLabel = "Nivel de volumen",
}: VolumeSegmentMeterProps) {
  const filledCount = levelPercentToFilledSegments(levelPercent, segmentCount);

  return (
    <div
      className={`flex flex-col-reverse items-stretch ${gapClassName} ${className}`}
      role={ariaHidden ? undefined : "meter"}
      aria-hidden={ariaHidden || undefined}
      aria-label={ariaHidden ? undefined : ariaLabel}
      aria-valuenow={ariaHidden ? undefined : Math.round(levelPercent)}
      aria-valuemin={ariaHidden ? undefined : 0}
      aria-valuemax={ariaHidden ? undefined : 100}
    >
      {Array.from({ length: segmentCount }, (_, index) => {
        const isFilled = index < filledCount;

        return (
          <span
            key={index}
            className={`${segmentClassName} transition-colors duration-75 ${
              isFilled
                ? filledColor
                  ? ""
                  : filledClassName
                : emptyClassName
            }`}
            style={
              isFilled && filledColor
                ? { backgroundColor: filledColor }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
