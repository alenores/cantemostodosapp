import SalaCard from "@/components/salas/SalaCard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SalasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: salas } = await supabase
    .from("salas")
    .select("id, nombre, descripcion")
    .eq("visible", true)
    .order("nombre");

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

        {salas && salas.length > 0 ? (
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
