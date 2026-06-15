"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthSessionListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT" || !navigator.onLine) {
        return;
      }

      const path = window.location.pathname;

      if (path.startsWith("/auth/")) {
        return;
      }

      router.replace("/auth/login");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
