import CompartirLaApp from "@/components/ui/CompartirLaApp";
import UserAvatar from "@/components/perfil/UserAvatar";
import { TapLink } from "@/components/ui/TapFeedback";
import type { UsuarioActivo } from "@/types";
import Image from "next/image";

type AppTopHeaderProps = {
  usuario: UsuarioActivo;
  /** Solo el Inicio muestra Compartir junto al avatar. */
  mostrarCompartir?: boolean;
};

export default function AppTopHeader({
  usuario,
  mostrarCompartir = false,
}: AppTopHeaderProps) {
  return (
    <header
      className="shrink-0 overflow-x-clip border-b border-accent/40 bg-accent px-4 pb-3 lg:hidden [body[data-hide-app-header='true']_&]:hidden"
      style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
    >
      <div className="app-page-container flex w-full min-w-0 items-center gap-2.5">
        <Image
          src="/logo.svg"
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-lg"
          aria-hidden="true"
        />
        <h1
          className={`min-w-0 flex-1 font-extrabold tracking-tight text-bg-darker ${
            mostrarCompartir ? "truncate text-base min-[360px]:text-lg" : "text-lg"
          }`}
        >
          CantemosTodosApp
        </h1>
        <div className="flex shrink-0 items-center">
          {mostrarCompartir ? <CompartirLaApp /> : null}
          <TapLink
            href="/perfil"
            ariaLabel="Mi perfil"
            className="flex items-center rounded-full py-1 pl-2 pr-1"
          >
            <UserAvatar
              nombre={usuario.nombre}
              email={usuario.email}
              avatarUrl={usuario.avatar_url}
              size={32}
            />
          </TapLink>
        </div>
      </div>
    </header>
  );
}
