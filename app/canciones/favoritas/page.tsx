import MisCancionesPageClient from "@/components/cancionero/MisCancionesPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function CancionesFavoritasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return <MisCancionesPageClient />;
}
