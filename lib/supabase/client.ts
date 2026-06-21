import {
  BROWSER_AUTH_COOKIE,
  PWA_AUTH_COOKIE,
  resolveAuthCookieName,
} from "@/lib/supabase/auth-cookie";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const PWA_SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

let browserClient: SupabaseClient | undefined;
let browserClientCookieName: string | undefined;

function readDocumentCookies(): { name: string }[] {
  if (typeof document === "undefined") {
    return [];
  }

  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ name: part.split("=")[0] ?? "" }))
    .filter((cookie) => cookie.name.length > 0);
}

export function createClient() {
  const cookieName = resolveAuthCookieName(readDocumentCookies());

  if (browserClient && browserClientCookieName !== cookieName) {
    browserClient = undefined;
  }

  if (!browserClient) {
    browserClientCookieName = cookieName;

    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: cookieName,
          ...(cookieName === PWA_AUTH_COOKIE
            ? { maxAge: PWA_SESSION_MAX_AGE_SECONDS }
            : {}),
        },
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }

  return browserClient;
}

export async function ensureRealtimeAuth(
  supabase: SupabaseClient,
): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn("[realtime] sin sesión activa");
    return false;
  }

  await supabase.realtime.setAuth(session.access_token);
  return true;
}
