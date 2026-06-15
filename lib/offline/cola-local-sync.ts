import { agregarACola, type CancionInput } from "@/lib/cola-logic";
import {
  clearColaLocal,
  getColaLocalItems,
} from "@/lib/offline/cola-local-store";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function flushColaLocalToSupabase(
  supabase: SupabaseClient,
  salaId: number,
): Promise<number> {
  const localItems = await getColaLocalItems(salaId);

  if (localItems.length === 0) {
    return 0;
  }

  const sorted = [...localItems].sort((a, b) => a.orden - b.orden);

  for (const item of sorted) {
    const cancion: CancionInput = {
      nombre: item.nombre,
      artista: item.artista,
      url_letra: item.url_letra,
      letra_texto: item.letra_texto ?? null,
    };

    await agregarACola(supabase, salaId, cancion);
  }

  await clearColaLocal(salaId);

  return sorted.length;
}
