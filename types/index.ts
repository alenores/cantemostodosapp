export type Sala = {
  id: number;
  nombre: string;
  descripcion: string | null;
  visible: boolean;
  created_at: string;
};

export type CancionGuardada = {
  id: number;
  sala_id: number;
  nombre: string;
  artista: string | null;
  url_letra: string;
  created_at: string;
};

export type EstadoCola = "pendiente" | "activa" | "tocada";

export type ColaItem = {
  id: number;
  sala_id: number;
  nombre: string;
  artista: string | null;
  url_letra: string;
  estado: EstadoCola;
  orden: number;
  created_at: string;
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

export type UsuarioActivo = {
  id: string;
  nombre: string;
  email: string;
  avatar_url: string | null;
};
