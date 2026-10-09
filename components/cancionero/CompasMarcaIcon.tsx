type CompasMarcaIconProps = {
  className?: string;
};

/** Dos barras de compás con una nota en el medio. Solo aparece si la canción tiene compases. */
export default function CompasMarcaIcon({ className = "size-[18px]" }: CompasMarcaIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      role="img"
      aria-label="Tiene compases"
    >
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="7" fill="var(--accent-cancionero-dim)" />
      <path
        d="M6.25 6.2v11.6M17.75 6.2v11.6"
        stroke="var(--cancionero-icon)"
        strokeWidth="1.85"
        strokeLinecap="round"
      />
      <ellipse
        cx="10.7"
        cy="15.15"
        rx="2.7"
        ry="1.95"
        fill="var(--cancionero-icon)"
        transform="rotate(-28 10.7 15.15)"
      />
      <path
        d="M12.95 13.7V5.7"
        stroke="var(--cancionero-icon)"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}
