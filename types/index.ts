export type Sala = {
  id: number;
  nombre: string;
  descripcion: string | null;
  visible: boolean;
  created_at: string;
};

export type CancionGuardada = {
  id: number;
  sala_id: number | null;
  nombre: string;
  artista: string | null;
  url_letra: string;
  letra: string | null;
  created_at: string;
  updated_at: string;
};

export type CancionCancionero = Pick<
  CancionGuardada,
  "id" | "nombre" | "artista" | "letra"
>;

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
};

export type UsuarioActivo = {
  id: string;
  nombre: string;
  email: string;
  avatar_url: string | null;
};

export type ColaIndividualItem = {
  id: number;
  user_id: string;
  nombre: string;
  artista: string | null;
  url_letra: string | null;
  letra_texto: string | null;
  orden: number;
  created_at: string;
};
