import { TapLink } from "@/components/ui/TapFeedback";
import { APP_SHELL_BG } from "@/lib/splash-theme";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      style={{ backgroundColor: APP_SHELL_BG }}
    >
      <WifiOff className="size-12 text-text-muted" aria-hidden="true" />
      <h1 className="text-xl font-extrabold text-text-primary">Sin conexión</h1>
      <p className="max-w-sm text-sm text-text-muted">
        No hay internet. Si ya sincronizaste antes, podés usar las canciones
        guardadas desde la copia local del celular.
      </p>
      <TapLink
        href="/cancionero"
        ariaLabel="Ir a canciones guardadas"
        className="mt-2 rounded-[10px] bg-accent px-5 py-3 text-sm font-semibold text-white"
      >
        Canciones guardadas
      </TapLink>
      <TapLink
        href="/salas"
        ariaLabel="Volver a salas"
        className="text-sm text-text-muted underline"
      >
        Volver a salas
      </TapLink>
    </div>
  );
}
