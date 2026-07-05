import { APP_SHELL_BG } from "@/lib/splash-theme";
import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center"
      style={{ backgroundColor: APP_SHELL_BG }}
    >
      <WifiOff className="size-12 text-text-muted" aria-hidden="true" />
      <h1 className="text-xl font-extrabold text-text-primary">Sin conexión</h1>
      <p className="max-w-sm text-sm text-text-muted">
        Abrí la app con WiFi al menos una vez. Después, desde Home o
        Individual podés usar la copia local del celular sin internet.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-semibold text-white"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
