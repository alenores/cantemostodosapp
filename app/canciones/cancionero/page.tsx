import CancioneroPageClient from "@/components/cancionero/CancioneroPageClient";
import { leerUsuarioDeLaSesion } from "@/lib/auth/usuario-servidor";

export const revalidate = 0;

type CancioneroPageProps = {
  searchParams: Promise<{ seleccionar?: string }>;
};

export default async function CancionesCancioneroPage({
  searchParams,
}: CancioneroPageProps) {
  const { user } = await leerUsuarioDeLaSesion();
  const { seleccionar } = await searchParams;

  return (
    <CancioneroPageClient
      usuarioId={user?.id ?? null}
      modoSeleccionMisCanciones={seleccionar === "1"}
    />
  );
}
