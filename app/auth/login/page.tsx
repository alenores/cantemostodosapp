"use client";

import { createClient } from "@/lib/supabase/client";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "auth") {
      setError("No se pudo iniciar sesión. Intentá de nuevo.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-app px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center text-2xl font-extrabold text-text-primary">
          CantemosTodosApp
        </h1>

        {sent ? (
          <p className="text-center text-base text-text-secondary">
            Revisá tu email para entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60"
              style={{
                transitionTimingFunction: "var(--transition-timing)",
              }}
            >
              {loading ? "Enviando..." : "Entrar"}
            </button>
            {error && (
              <p className="text-center text-sm text-accent" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
