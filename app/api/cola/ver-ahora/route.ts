import { verAhoraEnCola, type CancionInput } from "@/lib/cola-logic";
import { formatDatabaseError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type VerAhoraBody = {
  salaId?: number;
  cancion?: CancionInput;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Iniciá sesión para cambiar la canción activa." },
      { status: 401 },
    );
  }

  let body: VerAhoraBody;

  try {
    body = (await request.json()) as VerAhoraBody;
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { salaId, cancion } = body;

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
    await verAhoraEnCola(supabase, salaId, cancion);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: formatDatabaseError(error, "Error al mostrar la canción") },
      { status: 500 },
    );
  }
}
