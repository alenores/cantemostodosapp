export type Sala = {
  id: number;
  nombre: string;
  descripcion: string | null;
  visible: boolean;
  created_at: string;
  creado_por?: string | null;
  invite_token?: string | null;
};

export type SalaMiembro = {
  sala_id: number;
  user_id: string;
  rol: "owner" | "member";
  nombre: string;
  avatar_url: string | null;
};

import type { CifradoData, CompasConfig, NotaIndex } from "@/lib/cifrado";
import type { ModoTonal } from "@/lib/cifrado-escala";

export type CancionGuardada = {
  id: number;
  sala_id: number | null;
  user_id: string | null;
  nombre: string;
  artista: string | null;
  url_letra: string | null;
  letra: string | null;
  cifrado?: CifradoData | null;
  compas_config?: CompasConfig | null;
  tonalidad_default?: NotaIndex | null;
  modo_tonal_default?: ModoTonal | null;
  bpm_default?: number | null;
  tiene_cifrado_avanzado: boolean;
  created_at: string;
  updated_at: string;
};

export type CancionCancionero = Pick<
  CancionGuardada,
  "id" | "nombre" | "artista" | "letra" | "tiene_cifrado_avanzado" | "user_id"
>;

export type CancionCifradoDetalle = Pick<
  CancionGuardada,
  | "id"
  | "nombre"
  | "artista"
  | "letra"
  | "cifrado"
  | "compas_config"
  | "tonalidad_default"
  | "modo_tonal_default"
  | "bpm_default"
  | "tiene_cifrado_avanzado"
> & {
  cifrado: CifradoData;
  tonalidad_default: NotaIndex;
  modo_tonal_default: ModoTonal;
  bpm_default: number;
};

export type EstadoCola = "pendiente" | "activa" | "tocada";

export type ColaItem = {
  id: number;
  sala_id: number;
  nombre: string;
  artista: string | null;
  url_letra: string;
  letra_texto?: string | null;
  estado: EstadoCola;
  orden: number;
  created_at: string;
  agregado_por?: string | null;
  agregado_nombre?: string | null;
  agregado_avatar_url?: string | null;
};

export type SesionSala = {
  id: number;
  sala_id: number;
  cola_item_id: number | null;
  updated_at: string;
};

export type ResultadoBusqueda = {
  titulo: string;
  artista: string;
  url: string;
  sitio: string;
};

export type FuenteBusqueda = "cancionero" | "link-guardado" | "internet";

export type ResultadoBusquedaBuscador = ResultadoBusqueda & {
  fuente: FuenteBusqueda;
  id?: number;
  letra?: string | null;
  tiene_cifrado_avanzado?: boolean;
};

export type UsuarioActivo = {
  id: string;
  nombre: string;
  email: string;
  avatar_url: string | null;
};

export type PresenceUsuario = {
  user_id: string;
  nombre: string;
  avatar_url: string | null;
};

export type ColaIndividualItem = {
  id: number;
  user_id: string;
  nombre: string;
  artista: string | null;
  url_letra: string | null;
  letra_texto: string | null;
  estado: EstadoCola;
  orden: number;
  created_at: string;
};

export type UsuarioCancion = {
  id: number;
  user_id: string;
  cancion_guardada_id: number | null;
  url_letra: string | null;
  nombre: string;
  artista: string | null;
  created_at: string;
};
