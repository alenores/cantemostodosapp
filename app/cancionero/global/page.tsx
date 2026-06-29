import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type GlobalPageProps = {
  searchParams: Promise<{ seleccionar?: string }>;
};

export default async function CancioneroGlobalPage({
  searchParams,
}: GlobalPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { seleccionar } = await searchParams;

  return (
    <CancioneroPageClient
      usuarioId={user?.id ?? null}
      modoSeleccionMisCanciones={seleccionar === "1"}
    />
  );
}
