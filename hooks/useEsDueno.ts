"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

let esDuenoCache: boolean | null = null;

/** true si la cuenta activa es la del dueño de la app (usuarios_categorias). */
export function useEsDueno(): boolean {
  const [esDueno, setEsDueno] = useState(esDuenoCache ?? false);

  useEffect(() => {
    if (esDuenoCache !== null) return;
    let activo = true;
    const supabase = createClient();

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from("usuarios_categorias")
        .select("categoria")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) return;
      esDuenoCache = data?.categoria === "dueno";
      if (activo) setEsDueno(esDuenoCache);
    });

    return () => {
      activo = false;
    };
  }, []);

  return esDueno;
}
