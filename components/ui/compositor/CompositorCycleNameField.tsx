"use client";

import { COMPOSITOR_PLACEHOLDER_NOMBRE_CICLO } from "@/lib/ritmo-terminologia";

type CompositorCycleNameFieldProps = {
  id?: string;
  value: string;
  mode: "create" | "edit";
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
};

export function CompositorCycleNameField({
  id,
  value,
  mode,
  disabled = false,
  onChange,
  className = "",
}: CompositorCycleNameFieldProps) {
  const isEdit = mode === "edit";

  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="sr-only">Nombre del ciclo</span>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={80}
        disabled={disabled}
        placeholder={COMPOSITOR_PLACEHOLDER_NOMBRE_CICLO}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full truncate bg-transparent text-lg font-extrabold leading-tight outline-none placeholder:font-semibold disabled:opacity-60 lg:text-sm ${
          isEdit
            ? "text-compositor-block-edit placeholder:text-compositor-block-edit/50"
            : "text-compositor-config placeholder:text-compositor-config/50"
        }`}
      />
    </label>
  );
}
