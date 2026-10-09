import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";
import { redirect } from "next/navigation";

export const revalidate = 0;

type UnirsePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function UnirseSalaPage({ searchParams }: UnirsePageProps) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/salas?aviso=sin-acceso-sala");
  }

  const { supabase, user } = await leerUsuarioDeLaSesion();

  if (!user) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/salas/unirse?token=${token}`)}`,
    );
  }

  const { data: salaId, error } = await supabase.rpc("unirse_a_sala_por_token", {
    p_token: token,
  });

  if (error || salaId == null) {
    redirect("/salas?aviso=sin-acceso-sala");
  }

  redirect(`/salas/${salaId}`);
}
