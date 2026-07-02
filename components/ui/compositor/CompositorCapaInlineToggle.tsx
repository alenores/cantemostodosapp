type CompositorCapaInlineToggleProps = {
  isOn: boolean;
  size?: "sm" | "md";
};

export function CompositorCapaInlineToggle({
  isOn,
  size = "md",
}: CompositorCapaInlineToggleProps) {
  const sm = size === "sm";

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors ${
        sm ? "h-4 w-7" : "h-5 w-9"
      } ${isOn ? "bg-black/25" : "bg-bg-darker"}`}
    >
      <span
        className={`rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ${
          sm ? "size-3" : "size-4"
        } ${isOn ? (sm ? "translate-x-3" : "translate-x-4") : "translate-x-0"}`}
      />
    </span>
  );
}
