import SalasPageGate from "@/components/salas/SalasPageGate";
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

  // RLS filtra: solo salas propias o donde el usuario es miembro.
  const { data: salas, error: salasError } = await supabase
    .from("salas")
    .select("id, nombre, descripcion, avatar_url")
    .order("nombre");

  return (
    <Suspense fallback={null}>
      <SalasPageGate
        serverUsuario={mapUserToUsuarioActivo(user)}
        serverSalas={salas ?? []}
        errorMessage={salasError?.message ?? null}
        avisoInicial={aviso}
      />
    </Suspense>
  );
}
