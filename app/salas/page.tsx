import SalasPageGate from "@/components/salas/SalasPageGate";
import { fetchSalasDelUsuario } from "@/lib/sala-miembros";
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
          errorMessage={null}
          avisoInicial={aviso}
        />
      </Suspense>
    );
  }

  const { salas, error: salasError } = await fetchSalasDelUsuario(
    supabase,
    user.id,
  );

  return (
    <Suspense fallback={null}>
      <SalasPageGate
        serverUsuario={mapUserToUsuarioActivo(user)}
        serverSalas={salas}
        errorMessage={salasError}
        avisoInicial={aviso}
      />
    </Suspense>
  );
}
