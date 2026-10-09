import AppTopHeaderRouteGate from "@/components/ui/AppTopHeaderRouteGate";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export default async function CancionesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { usuario } = await leerUsuarioDeLaSesion();

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      <AppTopHeaderRouteGate usuario={usuario} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
