type OfflineIconProps = {
  className?: string;
};

/** Globo de «sin conexión». Toma el color del lugar donde está. */
export function OfflineIcon({ className }: OfflineIconProps) {
  return (
    <svg
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="5" />
      <ellipse cx="50" cy="50" rx="18" ry="38" stroke="currentColor" strokeWidth="4" />
      <line x1="12" y1="50" x2="88" y2="50" stroke="currentColor" strokeWidth="4" />
      <path
        d="M16 32h68M16 68h68"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="5 4"
      />
      <line
        x1="18"
        y1="18"
        x2="82"
        y2="82"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <text
        x="50"
        y="108"
        textAnchor="middle"
        fontSize="18"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="4"
        fill="currentColor"
      >
        OFFLINE
      </text>
    </svg>
  );
}
