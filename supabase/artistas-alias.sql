-- Nombres alternativos de artistas (memoria del buscador de artistas del editor).
-- Cada alias apunta a un artista de la tabla `artistas`. `alias_norm` es el alias
-- normalizado en la app (minúsculas, sin tildes ni signos) y es único: un mismo
-- nombre alternativo no puede apuntar a dos artistas.

create table if not exists public.artistas_alias (
  id uuid primary key default gen_random_uuid(),
  artista_id uuid not null references public.artistas(id) on delete cascade,
  alias text not null,
  alias_norm text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists artistas_alias_artista_id_idx
  on public.artistas_alias (artista_id);

alter table public.artistas_alias enable row level security;

drop policy if exists "Alias de artistas visibles por todos" on public.artistas_alias;
create policy "Alias de artistas visibles por todos"
  on public.artistas_alias for select
  to public
  using (true);

drop policy if exists "Autenticados pueden insertar alias" on public.artistas_alias;
create policy "Autenticados pueden insertar alias"
  on public.artistas_alias for insert
  to authenticated
  with check (true);

drop policy if exists "Autenticados pueden borrar alias" on public.artistas_alias;
create policy "Autenticados pueden borrar alias"
  on public.artistas_alias for delete
  to authenticated
  using (true);

grant select on public.artistas_alias to anon, authenticated;
grant insert, delete on public.artistas_alias to authenticated;
