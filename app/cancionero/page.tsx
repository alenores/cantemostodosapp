import CancioneroHubPageClient from "@/components/cancionero/CancioneroHubPageClient";
import { countCancionesCancionero } from "@/lib/cancionero";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function CancioneroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const globalCount = await countCancionesCancionero(supabase).catch(() => 0);

  return (
    <CancioneroHubPageClient
      usuarioId={user?.id ?? null}
      globalCountInicial={globalCount}
    />
  );
}
