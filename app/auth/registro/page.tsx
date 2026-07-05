"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import AuthBackButton from "@/components/auth/AuthBackButton";
import { useStartNavigation } from "@/components/ui/NavigationProgress";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClassName =
  "min-h-11 w-full rounded-[10px] border border-border bg-bg-card px-4 text-base text-text-primary placeholder:text-text-muted outline-none focus:border-accent";

const buttonClassName =
  "min-h-11 w-full rounded-[10px] bg-accent px-4 text-base font-semibold text-white transition-[opacity] duration-350 disabled:opacity-60";

export default function RegistroPage() {
  const router = useRouter();
  const startNavigation = useStartNavigation();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre.trim() },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.refresh();
    startNavigation();
    router.push("/");
  }

  return (
    <div className="app-auth-shell relative bg-bg-app">
      <AppReadyMarker />
      <AuthBackButton />
      <div className="app-auth-card">
        <h1 className="mb-10 text-center text-2xl font-extrabold text-text-primary">
          CantemosTodosApp
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label htmlFor="nombre" className="sr-only">
            Nombre
          </label>
          <input
            id="nombre"
            type="text"
            required
            autoComplete="name"
            placeholder="Nombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            className={inputClassName}
          />
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
            className={inputClassName}
          />
          <label htmlFor="password" className="sr-only">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
          <button
            type="submit"
            disabled={loading}
            className={buttonClassName}
            style={{ transitionTimingFunction: "var(--transition-timing)" }}
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
          {error && (
            <p className="text-center text-sm text-accent" role="alert">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          ¿Ya tenés cuenta?{" "}
          <Link href="/auth/login" className="text-accent underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
