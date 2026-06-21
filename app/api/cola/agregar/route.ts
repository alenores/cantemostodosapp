import {
  agregarACola,
  avanzarCancion,
  type CancionInput,
} from "@/lib/cola-logic";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type AgregarColaBody = {
  salaId?: number;
  cancion?: CancionInput;
  activarSiColaVacia?: boolean;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Iniciá sesión para sumar canciones." },
      { status: 401 },
    );
  }

  let body: AgregarColaBody;

  try {
    body = (await request.json()) as AgregarColaBody;
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { salaId, cancion, activarSiColaVacia = true } = body;

  if (
    typeof salaId !== "number" ||
    !cancion?.nombre?.trim() ||
    !cancion.url_letra?.trim()
  ) {
    return NextResponse.json(
      { error: "Faltan datos de la canción." },
      { status: 400 },
    );
  }

  try {
    await agregarACola(supabase, salaId, cancion);

    if (activarSiColaVacia) {
      const { data: activaCheck } = await supabase
        .from("cola_juntada")
        .select("id")
        .eq("sala_id", salaId)
        .eq("estado", "activa")
        .limit(1)
        .maybeSingle();

      if (!activaCheck) {
        const { data: primeraPendiente } = await supabase
          .from("cola_juntada")
          .select("id")
          .eq("sala_id", salaId)
          .eq("estado", "pendiente")
          .order("orden", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (primeraPendiente) {
          try {
            await avanzarCancion(supabase, salaId, primeraPendiente.id);
          } catch (activationError) {
            console.warn(
              "[api/cola/agregar] Canción sumada, activación falló:",
              activationError,
            );
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: formatDatabaseError(error, "Error al agregar a la cola"),
      },
      { status: 500 },
    );
  }
}
