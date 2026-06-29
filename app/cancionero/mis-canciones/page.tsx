import MisCancionesPageClient from "@/components/cancionero/MisCancionesPageClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function MisCancionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/cancionero");
  }

  return <MisCancionesPageClient />;
}
