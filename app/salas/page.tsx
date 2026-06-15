import SalasPageGate from "@/components/salas/SalasPageGate";
import { countCancionesCancionero } from "@/lib/cancionero";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

export const revalidate = 0;

type SalasPageProps = {
  searchParams: Promise<{ aviso?: string }>;
};

export default async function SalasPage({ searchParams }: SalasPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { aviso = null } = await searchParams;

  if (!user) {
    return (
      <Suspense fallback={null}>
        <SalasPageGate
          serverUsuario={null}
          serverSalas={null}
          cancioneroTotal={0}
          errorMessage={null}
          avisoInicial={aviso}
        />
      </Suspense>
    );
  }

  const [{ data: salas, error: salasError }, cancioneroTotal] = await Promise.all([
    supabase
      .from("salas")
      .select("id, nombre, descripcion")
      .eq("visible", true)
      .order("nombre"),
    countCancionesCancionero(supabase).catch(() => 0),
  ]);

  return (
    <Suspense fallback={null}>
      <SalasPageGate
        serverUsuario={mapUserToUsuarioActivo(user)}
        serverSalas={salas ?? []}
        cancioneroTotal={cancioneroTotal}
        errorMessage={salasError?.message ?? null}
        avisoInicial={aviso}
      />
    </Suspense>
  );
}
