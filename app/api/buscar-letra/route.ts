import { buscarLetras } from "@/lib/google-search";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Iniciá sesión para buscar." },
      { status: 401 },
    );
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const resultados = await buscarLetras(q);
    return NextResponse.json(resultados);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al buscar letras";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
