"use client";

/** Candado abierto: arco girado hacia afuera (distinto al candado cerrado). */
export function CifradoUnlockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 11V8a5 5 0 0 1 9.6-1" />
      <path d="M7 8 4 5" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
    </svg>
  );
}
