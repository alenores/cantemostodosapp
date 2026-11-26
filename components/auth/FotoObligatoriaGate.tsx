"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { hayConexion } from "@/lib/conexion";
import { prepararFotoLiviana } from "@/lib/imagen-liviana";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Foto obligatoria (2026-11-26): en la app nadie está sin foto. Apenas hay una cuenta iniciada
 * sin foto (recién registrada o vieja), esta ventana tapa todo hasta que la sube. No se puede
 * cerrar. La foto se ve en el Cancionero junto a las canciones que la persona sumó o pidió.
 * El invitado no la ve. La sesión se lee de lo guardado: no espera a internet.
 */
export default function FotoObligatoriaGate() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const pathname = usePathname();
  const online = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [falta, setFalta] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const tieneFoto = (avatar: unknown) => typeof avatar === "string" && avatar.trim().length > 0;

    function revisar() {
      void supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!activo) return;
        const user = session?.user ?? null;
        setUserId(user?.id ?? null);
        if (!user || tieneFoto(user.user_metadata?.avatar_url)) {
          setFalta(false);
          return;
        }
        // La sesión guardada puede ser vieja (la foto se cargó en otro lado): se confirma con la
        // cuenta real antes de pedirla. Sin señal no se pide: igual no se podría subir.
        if (!hayConexion()) return;
        const { data, error } = await supabase.auth.getUser();
        if (!activo || error || !data.user) return;
        setFalta(!tieneFoto(data.user.user_metadata?.avatar_url));
      });
    }

    revisar();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // Fuera del callback: consultar la sesión dentro de él puede trabar Supabase.
      window.setTimeout(revisar, 0);
    });
    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const visible = falta && userId !== null && !pathname.startsWith("/auth");
  useBodyScrollLock(visible);

  async function elegir(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setTrabajando(true);
    try {
      const liviana = await prepararFotoLiviana(file, "perfil");
      if (preview) URL.revokeObjectURL(preview);
      setArchivo(liviana);
      setPreview(URL.createObjectURL(liviana));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo usar esa foto.");
    } finally {
      setTrabajando(false);
    }
  }

  async function guardar() {
    if (!archivo || !userId) return;
    setTrabajando(true);
    setError(null);
    const path = `${userId}/avatar.webp`;
    const { error: subida } = await supabase.storage
      .from("avatars")
      .upload(path, archivo, { upsert: true, contentType: "image/webp" });
    if (subida) {
      setTrabajando(false);
      setError("No se pudo guardar la foto. Probá de nuevo.");
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: perfil } = await supabase.auth.updateUser({
      data: { avatar_url: `${publicUrl}?t=${Date.now()}` },
    });
    setTrabajando(false);
    if (perfil) {
      setError("No se pudo guardar la foto. Probá de nuevo.");
      return;
    }
    setFalta(false);
    router.refresh();
  }

  if (!visible || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-5" role="dialog" aria-modal="true">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-3xl bg-bg-sala px-6 py-7 text-center">
        <h2 className="text-xl font-extrabold text-text-primary">Subí tu foto</h2>
        <p className="text-sm text-text-muted">
          En Cantemos Todos todos tienen foto: aparece en el Cancionero junto a las canciones que sumás o pedís.
        </p>
        <TapButton
          type="button"
          aria-label="Elegir foto"
          onClick={() => inputRef.current?.click()}
          className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-bg-darker"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-12 text-text-muted" aria-hidden="true" />
          )}
          <span className="absolute bottom-1 right-1 flex size-9 items-center justify-center rounded-full bg-accent text-white">
            <Camera className="size-4" aria-hidden="true" />
          </span>
        </TapButton>
        <input ref={inputRef} type="file" accept="image/*" className="sr-only" onChange={(e) => void elegir(e)} />
        {!online ? <p className="text-sm font-semibold text-text-secondary">Conectate a internet para subirla.</p> : null}
        {error ? <p className="text-sm font-semibold text-solicitud-no">{error}</p> : null}
        <TapButton
          type="button"
          onClick={() => (archivo ? void guardar() : inputRef.current?.click())}
          disabled={trabajando || (Boolean(archivo) && !online)}
          className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent text-[15px] font-extrabold text-white disabled:opacity-50"
        >
          {trabajando ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : archivo ? "Guardar foto" : "Elegir foto"}
        </TapButton>
      </div>
    </div>,
    document.body,
  );
}
