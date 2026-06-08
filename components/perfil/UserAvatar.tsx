import { getInicialesUsuario } from "@/lib/usuario";
import Image from "next/image";

type UserAvatarProps = {
  nombre: string;
  email: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
};

export default function UserAvatar({
  nombre,
  email,
  avatarUrl,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const iniciales = getInicialesUsuario(nombre, email);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={nombre.trim() || "Avatar"}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`.trim()}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-bg-darker text-sm font-bold text-text-primary ${className}`.trim()}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden={!nombre.trim()}
    >
      {iniciales}
    </span>
  );
}
