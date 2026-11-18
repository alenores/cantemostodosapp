import AppTopHeaderRouteGate from "@/components/ui/AppTopHeaderRouteGate";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export default async function IndividualLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { usuario } = await leerUsuarioDeLaSesion();

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AppTopHeaderRouteGate usuario={usuario} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
