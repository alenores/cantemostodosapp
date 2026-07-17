"use client";

type ToolSwitchProps = {
  checked: boolean;
  onChange: () => void;
  /** Variable CSS de acento, ej. "--accent-metronomo" */
  accentVar?: string;
  /** "sm" = editor de acordes · "md" = controles de herramienta */
  size?: "sm" | "md";
  "aria-label"?: string;
};

export function ToolSwitch({
  checked,
  onChange,
  accentVar = "--accent",
  size = "sm",
  "aria-label": ariaLabel,
}: ToolSwitchProps) {
  const isMd = size === "md";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`relative shrink-0 rounded-full border transition-[background-color,border-color,box-shadow] duration-150 ease-out ${
        isMd ? "h-7 w-12" : "h-4 w-7"
      } ${checked ? "" : "border-border bg-bg-darker"}`}
      style={
        checked
          ? {
              backgroundColor: `var(${accentVar})`,
              borderColor: `var(${accentVar})`,
              boxShadow: `0 0 0 2px color-mix(in srgb, var(${accentVar}) 28%, transparent)`,
            }
          : undefined
      }
    >
      <span
        className={`absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out ${
          isMd ? "size-6" : "size-3"
        }`}
        style={{
          transform: checked
            ? isMd
              ? "translateX(20px)"
              : "translateX(12px)"
            : "translateX(0)",
        }}
      />
    </button>
  );
}
