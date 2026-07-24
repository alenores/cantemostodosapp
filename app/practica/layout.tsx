import AppTopHeaderRouteGate from "@/components/ui/AppTopHeaderRouteGate";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export default async function PracticaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuario = user
    ? mapUserToUsuarioActivo(user)
    : OFFLINE_GUEST_USUARIO;

  return (
    <div className="tool-page-layout flex h-dvh max-h-dvh w-full min-w-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <AppTopHeaderRouteGate usuario={usuario} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
        {children}
      </div>
    </div>
  );
}
