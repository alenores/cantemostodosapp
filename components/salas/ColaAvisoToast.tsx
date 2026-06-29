import type { CSSProperties } from "react";

type ColaAvisoToastProps = {
  message: string;
  exiting: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function ColaAvisoToast({
  message,
  exiting,
  className = "",
  style,
}: ColaAvisoToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none w-fit max-w-[min(72vw,calc(100%-5.5rem))] rounded-[10px] border border-accent/30 bg-bg-cola-aviso px-3 py-1.5 text-right text-[12px] font-semibold leading-snug whitespace-nowrap text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.38)] ${
        exiting ? "sala-cola-aviso-out" : "sala-cola-aviso-in"
      } ${className}`.trim()}
      style={style}
    >
      {message}
    </div>
  );
}
