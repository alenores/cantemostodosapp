import AppTopHeaderRouteGate from "@/components/ui/AppTopHeaderRouteGate";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export default async function PracticaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { usuario } = await leerUsuarioDeLaSesion();

  return (
    <div className="tool-page-layout flex h-dvh max-h-dvh w-full min-w-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <AppTopHeaderRouteGate usuario={usuario} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>
    </div>
  );
}
