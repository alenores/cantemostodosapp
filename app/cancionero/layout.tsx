import AppTopHeader from "@/components/ui/AppTopHeader";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getSalaMainFooterPaddingCss } from "@/lib/sala-layout";
import { createClient } from "@/lib/supabase/server";
import { mapUserToUsuarioActivo } from "@/lib/usuario";

export default async function CancioneroLayout({
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
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app"
      style={{ height: "100dvh", paddingBottom: getSalaMainFooterPaddingCss() }}
    >
      <AppTopHeader usuario={usuario} />
      {children}
    </div>
  );
}
