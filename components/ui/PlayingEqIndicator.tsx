type PlayingEqIndicatorProps = {
  color?: string;
  ariaLabel?: string;
};

export default function PlayingEqIndicator({
  color = "var(--accent)",
  ariaLabel = "Reproduciendo",
}: PlayingEqIndicatorProps) {
  return (
    <div
      className="cola-activa-eq shrink-0 rounded px-2.5 py-1.5"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
      }}
      role="status"
      aria-label={ariaLabel}
    >
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className="cola-activa-eq-bar"
          style={{
            backgroundColor: color,
            animationDelay: `${index * 0.12}s`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
