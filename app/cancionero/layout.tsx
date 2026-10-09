import AppTopHeader from "@/components/ui/AppTopHeader";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export default async function CancioneroLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { usuario } = await leerUsuarioDeLaSesion();

  return (
    <div className="flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      <AppTopHeader usuario={usuario} />
      {children}
    </div>
  );
}
