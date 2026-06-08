import { isAllowedLetraUrl, obtenerLetraDesdeUrl } from "@/lib/letra-extract";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "No autorizado. Iniciá sesión para ver letras." },
      { status: 401 },
    );
  }

  const url = new URL(request.url).searchParams.get("url")?.trim() ?? "";

  if (!url) {
    return NextResponse.json(
      { error: "Falta el parámetro url" },
      { status: 400 },
    );
  }

  if (!isAllowedLetraUrl(url)) {
    return NextResponse.json(
      { error: "URL no permitida. Solo lacuerda.net y cifraclub.com." },
      { status: 403 },
    );
  }

  try {
    const letra = await obtenerLetraDesdeUrl(url);
    return NextResponse.json({ letra });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al obtener la letra";

    if (message.includes("No se pudo extraer")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message.includes("URL no permitida")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
