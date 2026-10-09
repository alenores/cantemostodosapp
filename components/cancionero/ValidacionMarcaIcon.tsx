type ValidacionMarcaIconProps = {
  className?: string;
  /** El botón de alrededor ya dice para qué sirve. */
  silenciosa?: boolean;
};

/** Tilde azul: la letra y los acordes fueron revisados. */
export default function ValidacionMarcaIcon({
  className = "size-[18px]",
  silenciosa = false,
}: ValidacionMarcaIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${className} shrink-0`}
      role={silenciosa ? undefined : "img"}
      aria-label={silenciosa ? undefined : "Canción validada"}
      aria-hidden={silenciosa ? true : undefined}
    >
      <circle cx="12" cy="12" r="10" fill="#0095F6" />
      <path
        d="M7.1 12.4 10.3 15.6 16.9 8.7"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
