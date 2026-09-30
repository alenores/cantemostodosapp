"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import { createClient } from "@/lib/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UsuarioCategoria = {
  user_id: string;
  email: string;
  categoria: "dueno" | "amigos" | "publico";
};

export default function UsuariosPageClient() {
  const supabase = useMemo(() => createClient(), []);
  const [usuarios, setUsuarios] = useState<UsuarioCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc("listar_usuarios_admin");
    if (loadError) throw loadError;
    setUsuarios((data ?? []) as UsuarioCategoria[]);
  }, [supabase]);

  useEffect(() => {
    void Promise.resolve().then(cargar).catch(() => setError("No se pudo cargar la lista de usuarios.")).finally(() => setLoading(false));
  }, [cargar]);

  async function cambiarCategoria(userId: string, categoria: "amigos" | "publico") {
    setError(null);
    setSavingId(userId);
    try {
      const { error: saveError } = await supabase.rpc("cambiar_categoria_usuario", {
        p_user_id: userId,
        p_categoria: categoria,
      });
      if (saveError) throw saveError;
      await cargar();
    } catch {
      setError("No se pudo guardar la categoría. Volvé a intentarlo.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 text-text-primary">
      <AppReadyMarker />
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <p className="mt-2 text-sm text-text-muted">Elegí quiénes son amigos y quiénes son público.</p>
      {error ? <p role="alert" className="mt-4 text-sm text-accent">{error}</p> : null}
      {loading ? <p className="mt-6 text-sm text-text-muted">Cargando usuarios…</p> : null}
      {!loading && usuarios.length === 0 ? <p className="mt-6 text-sm text-text-muted">Todavía no hay usuarios.</p> : null}
      <ul className="mt-5 space-y-3">
        {usuarios.map((usuario) => (
          <li key={usuario.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-card p-4">
            <div className="min-w-0">
              <p className="break-all text-sm font-semibold">{usuario.email}</p>
              {usuario.categoria === "dueno" ? <p className="mt-1 text-xs text-text-muted">Dueño</p> : null}
            </div>
            {usuario.categoria === "dueno" ? null : (
              <select
                aria-label={`Categoría de ${usuario.email}`}
                value={usuario.categoria}
                disabled={savingId === usuario.user_id}
                onChange={(event) => void cambiarCategoria(usuario.user_id, event.target.value as "amigos" | "publico")}
                className="min-h-11 rounded-lg border border-border bg-bg-darker px-3 text-sm text-text-primary disabled:opacity-60"
              >
                <option value="amigos">Amigos</option>
                <option value="publico">Público</option>
              </select>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
