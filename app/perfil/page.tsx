import PerfilVistaClient from "@/components/perfil/PerfilVistaClient";
import { fetchSalasDelUsuario } from "@/lib/sala-miembros";
import { mapUserToUsuarioActivo } from "@/lib/usuario";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

type PerfilPageProps = {
  searchParams: Promise<{ aviso?: string }>;
};

type CancionRow = {
  id: number;
  nombre: string;
  artista: string | null;
};

function filasCancion(data: CancionRow[] | null): CancionRow[] {
  return (data ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    artista: row.artista,
  }));
}

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const supabase = await createClient();
  const { aviso = null } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [aportadasRes, favoritasRes, entrenadorRes, salasRes] = await Promise.all([
    supabase
      .from("canciones_guardadas")
      .select("id, nombre, artista")
      .eq("user_id", user.id)
      .is("sala_id", null)
      .order("nombre", { ascending: true }),
    supabase
      .from("usuarios_canciones")
      .select("id, nombre, artista")
      .order("nombre", { ascending: true }),
    supabase
      .from("canciones_practica")
      .select("id, nombre, artista")
      .eq("user_id", user.id)
      .order("nombre", { ascending: true }),
    fetchSalasDelUsuario(supabase, user.id),
  ]);

  return (
    <PerfilVistaClient
      usuario={mapUserToUsuarioActivo(user)}
      avisoInicial={aviso}
      aportadas={filasCancion(aportadasRes.data)}
      favoritas={filasCancion(favoritasRes.data)}
      entrenadorInicial={filasCancion(entrenadorRes.data)}
      salas={salasRes.salas.map((sala) => ({
        id: sala.id,
        nombre: sala.nombre,
        avatar_url: sala.avatar_url ?? null,
      }))}
      aportadasConError={Boolean(aportadasRes.error)}
      favoritasConError={Boolean(favoritasRes.error)}
      entrenadorConError={Boolean(entrenadorRes.error)}
      salasConError={Boolean(salasRes.error)}
    />
  );
}
