import { NextResponse } from "next/server";

const TEST_URL = "https://acordesdcanciones.com/los-piojos-tan-solo/";

const FETCH_HEADERS: Record<string, string> = {
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "es-AR,es;q=0.9",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

export async function GET() {
  const startedAt = Date.now();

  try {
    const response = await fetch(TEST_URL, {
      headers: {
        ...FETCH_HEADERS,
        Referer: "https://acordesdcanciones.com/",
      },
      cache: "no-store",
    });

    const html = await response.text();
    const elapsedMs = Date.now() - startedAt;

    return NextResponse.json({
      url: TEST_URL,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      htmlLength: html.length,
      elapsedMs,
      snippet: html.slice(0, 300),
      containsTanSolo: html.toLowerCase().includes("tan solo"),
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        url: TEST_URL,
        ok: false,
        error: message,
        elapsedMs,
      },
      { status: 500 },
    );
  }
}
