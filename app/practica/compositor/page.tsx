import RecordarEntrada from "@/components/auth/RecordarEntrada";
import CompositorOwnerGate from "@/components/herramientas/CompositorOwnerGate";
import {
  categoriaDeEstaEntrada,
  leerUsuarioDeLaSesion,
} from "@/lib/auth/usuario-servidor";
import { redirect } from "next/navigation";

export default async function PracticaCompositorPage() {
  const { supabase, user } = await leerUsuarioDeLaSesion();
  if (!user) redirect("/practica");
  const categoria = await categoriaDeEstaEntrada(supabase, user.id);
  if (categoria !== "dueno") redirect("/practica");
  return (
    <>
      <RecordarEntrada userId={user.id} categoria={categoria} />
      <CompositorOwnerGate ownerUserId={user.id} />
    </>
  );
}
