import CancioneroTabShell from "@/components/cancionero/CancioneroTabShell";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

export default async function CancioneroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <CancioneroTabShell usuarioId={user?.id ?? null} />;
}
