import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

type CancioneroPageProps = {
  searchParams: Promise<{ seleccionar?: string; ver?: string }>;
};

export default async function CancionesCancioneroPage({
  searchParams,
}: CancioneroPageProps) {
  const { user } = await leerUsuarioDeLaSesion();
  const { seleccionar, ver } = await searchParams;
  const verId = ver ? Number(ver) : null;

  return (
    <CancioneroPageClient
      usuarioId={user?.id ?? null}
      modoSeleccionMisCanciones={seleccionar === "1"}
      verCancionId={verId != null && Number.isFinite(verId) ? verId : null}
    />
  );
}
