"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { TapButton } from "@/components/ui/TapFeedback";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const buttonClassName =
  "min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60";

export default function LoginPageClient() {
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const online = useOnlineStatus();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canContinueOffline, setCanContinueOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      if (session && online) {
        startNavigation();
        router.replace("/salas");
        return;
      }

      setCanContinueOffline(!online);
      setCheckingSession(false);
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [online, router, startNavigation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!online) {
      setError("Necesitás conexión para iniciar sesión.");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Email o contraseña incorrectos");
      return;
    }

    router.refresh();
    startNavigation();
    router.push("/salas");
  }

  function handleContinueOffline() {
    startNavigation();
    router.push("/salas");
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-app px-6">
        <AppReadyMarker />
        <p className="text-sm text-text-muted">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-app px-6">
      <AppReadyMarker />
      <div className="w-full max-w-sm">
        <h1 className="mb-10 text-center text-2xl font-extrabold text-text-primary">
          CantemosTodosApp
        </h1>

        {!online && (
          <p
            className="mb-4 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-center text-sm text-text-muted"
            role="status"
          >
            Sin conexión · podés continuar con la copia local si ya entraste
            antes en este celular
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            type="email"
            required={online}
            autoComplete="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
            disabled={!online}
          />
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required={online}
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
            disabled={!online}
          />
          <button
            type="submit"
            disabled={loading || !online}
            className={buttonClassName}
            style={{ transitionTimingFunction: "var(--transition-timing)" }}
          >
            {loading ? "Entrando..." : online ? "Entrar" : "Entrar (requiere WiFi)"}
          </button>
          {error && (
            <p className="text-center text-sm text-accent" role="alert">
              {error}
            </p>
          )}
        </form>

        {canContinueOffline && (
          <TapButton
            onClick={handleContinueOffline}
            className="mt-4 min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base font-semibold text-text-primary"
          >
            Continuar sin conexión
          </TapButton>
        )}

        {online && (
          <p className="mt-6 text-center text-sm text-text-secondary">
            ¿No tenés cuenta?{" "}
            <Link href="/auth/registro" className="text-accent underline">
              Registrate
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
