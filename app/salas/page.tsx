import SalasPageGate from "@/components/salas/SalasPageGate";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { fetchSalasDelUsuario } from "@/lib/sala-miembros";
import { Suspense } from "react";

export const revalidate = 0;

type SalasPageProps = {
  searchParams: Promise<{ aviso?: string }>;
};

export default async function SalasPage({ searchParams }: SalasPageProps) {
  const { supabase, user, usuario } = await leerUsuarioDeLaSesion();
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
        serverUsuario={usuario}
        serverSalas={salas}
        errorMessage={salasError}
        avisoInicial={aviso}
      />
    </Suspense>
  );
}
