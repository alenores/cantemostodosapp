"use client";

import { Users } from "lucide-react";

type SalaAvatarProps = {
  nombre: string;
  avatarUrl?: string | null;
  sizeClassName?: string;
  iconClassName?: string;
  roundedClassName?: string;
};

export default function SalaAvatar({
  nombre,
  avatarUrl = null,
  sizeClassName = "size-10",
  iconClassName = "size-5",
  roundedClassName = "rounded-xl",
}: SalaAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClassName} ${roundedClassName} shrink-0 object-cover`}
      />
    );
  }

  const inicial = (nombre.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={`flex ${sizeClassName} ${roundedClassName} shrink-0 items-center justify-center`}
      style={{ background: "var(--accent-salas-dim)" }}
      aria-hidden="true"
    >
      {nombre.trim() ? (
        <span
          className="text-sm font-extrabold"
          style={{ color: "var(--accent-salas)" }}
        >
          {inicial}
        </span>
      ) : (
        <Users
          className={iconClassName}
          style={{ color: "var(--accent-salas)" }}
        />
      )}
    </span>
  );
}
