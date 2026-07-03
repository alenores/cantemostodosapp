import type { ReactNode } from "react";

type HelpInfoCardProps = {
  icon: ReactNode;
  label: string;
  text: string;
  tip?: string;
  shimmerDelayMs?: number;
  variant?: "dark" | "card";
};

export function HelpInfoCard({
  icon,
  label,
  text,
  tip,
  shimmerDelayMs = 0,
  variant = "dark",
}: HelpInfoCardProps) {
  const surfaceClass = variant === "card" ? "bg-bg-card" : "bg-bg-dark";

  return (
    <article
      className={`overflow-hidden rounded-[12px] border border-border ${surfaceClass}`}
    >
      <div className={tip ? "space-y-2 p-3" : "space-y-1.5 p-3"}>
        <div className="flex items-center gap-2">
          {icon}
          <p
            className="help-label-shimmer text-[13px] font-bold"
            style={{ animationDelay: `${shimmerDelayMs}ms` }}
          >
            {label}
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-text-secondary">{text}</p>
        {tip ? (
          <p
            className="border-t pt-2 text-[11px] text-text-muted"
            style={{ borderColor: "var(--border)" }}
          >
            {tip}
          </p>
        ) : null}
      </div>
    </article>
  );
}
