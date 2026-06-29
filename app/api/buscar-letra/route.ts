import { buscarLetras } from "@/lib/google-search";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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
