"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type AddButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  ariaLabel: string;
  size?: "md" | "sm" | "xs";
};

const sizeClasses = {
  md: "size-10",
  sm: "size-9",
  xs: "size-5",
} as const;

const iconSizeClasses = {
  md: "size-5",
  sm: "size-5",
  xs: "size-3",
} as const;

export default function AddButton({
  ariaLabel,
  size = "md",
  className = "",
  type = "button",
  ...props
}: AddButtonProps) {
  return (
    <TapButton
      type={type}
      aria-label={ariaLabel}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent ${sizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      <Plus className={`${iconSizeClasses[size]} text-white`} aria-hidden="true" />
    </TapButton>
  );
}
