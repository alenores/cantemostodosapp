import SalaCard from "@/components/salas/SalaCard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SalasPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  console.log("[salas] auth:", {
    userId: user?.id ?? null,
    hasSession: Boolean(session),
    userError: userError?.message ?? null,
    sessionError: sessionError?.message ?? null,
  });

  if (!user) {
    redirect("/auth/login");
  }

  const { data: salas, error: salasError, count } = await supabase
    .from("salas")
    .select("id, nombre, descripcion", { count: "exact" })
    .eq("visible", true)
    .order("nombre");

  console.log("[salas] query:", {
    count,
    rows: salas?.length ?? 0,
    data: salas,
    error: salasError?.message ?? null,
    code: salasError?.code ?? null,
  });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-app">
      <header className="border-b border-border bg-bg-darker px-4 py-3">
        <h1 className="text-lg font-extrabold text-text-primary">
          CantemosTodosApp
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 py-6">
        <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
          Salas disponibles
        </p>

        {salasError ? (
          <p className="text-sm text-accent" role="alert">
            No se pudieron cargar las salas: {salasError.message}
          </p>
        ) : salas && salas.length > 0 ? (
          <div className="flex flex-col gap-3">
            {salas.map((sala) => (
              <SalaCard key={sala.id} sala={sala} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            No hay salas disponibles por ahora.
          </p>
        )}
      </main>
    </div>
  );
}
