-- Quadra · datos de trabajo del usuario (Clientes, TO DO, Metas)
-- Cada fila es un registro de un módulo; el contenido vive en `data` (jsonb)
-- para que los formularios puedan evolucionar sin migraciones nuevas.
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists public.workspace_items (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('cliente', 'tarea', 'meta')),
  id         text        not null,
  data       jsonb       not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists workspace_items_user_kind_idx
  on public.workspace_items (user_id, kind, created_at);

-- updated_at automático
create or replace function public.workspace_items_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists workspace_items_touch on public.workspace_items;
create trigger workspace_items_touch
  before update on public.workspace_items
  for each row execute function public.workspace_items_touch();

-- Seguridad por fila: cada usuario solo ve y modifica lo suyo
alter table public.workspace_items enable row level security;

drop policy if exists "workspace_items_select_own" on public.workspace_items;
create policy "workspace_items_select_own" on public.workspace_items
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "workspace_items_insert_own" on public.workspace_items;
create policy "workspace_items_insert_own" on public.workspace_items
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "workspace_items_update_own" on public.workspace_items;
create policy "workspace_items_update_own" on public.workspace_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "workspace_items_delete_own" on public.workspace_items;
create policy "workspace_items_delete_own" on public.workspace_items
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.workspace_items to authenticated;
