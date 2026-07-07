import AppTopHeader from "@/components/ui/AppTopHeader";
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
    <div className="tool-page-layout flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-clip bg-bg-app">
      <AppTopHeader usuario={usuario} />
      {children}
    </div>
  );
}
