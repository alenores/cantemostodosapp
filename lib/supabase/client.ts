import { isStandalonePwa } from "@/lib/pwa";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const PWA_SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    const standalone = isStandalonePwa();

    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          name: standalone ? "sb-pwa-auth" : "sb-browser-auth",
          ...(standalone ? { maxAge: PWA_SESSION_MAX_AGE_SECONDS } : {}),
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
