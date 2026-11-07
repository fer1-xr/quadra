-- Quadra · Seguridad del backend
-- 1. reconciliation_sessions apunta a auth.users (el backend usa Supabase Auth)
--    y queda protegida con RLS: cada usuario ve sólo sus conciliaciones.
-- 2. public.users (tabla del login antiguo con bcrypt) queda cerrada:
--    RLS activado sin políticas, nadie la lee con la anon key.
-- 3. Nueva tabla cotizaciones (historial de /api/cotizacion), con RLS.
-- 4. workspace_items_touch con search_path fijo (aviso del asesor).
-- Ejecutar una vez en Supabase → SQL Editor.

-- ---------- 1. reconciliation_sessions ----------
alter table public.reconciliation_sessions
  drop constraint if exists reconciliation_sessions_user_id_fkey;

-- Conciliaciones del login antiguo: pasan a la cuenta de Supabase Auth con el mismo email.
update public.reconciliation_sessions r
   set user_id = a.id
  from public.users u
  join auth.users a on lower(a.email) = lower(u.email)
 where r.user_id = u.id
   and not exists (select 1 from auth.users x where x.id = r.user_id);

alter table public.reconciliation_sessions
  add constraint reconciliation_sessions_user_id_fkey
  foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.reconciliation_sessions
  alter column user_id set default auth.uid(),
  alter column user_id set not null;

create index if not exists reconciliation_sessions_user_created_idx
  on public.reconciliation_sessions (user_id, created_at desc);

alter table public.reconciliation_sessions enable row level security;

drop policy if exists "reconciliation_select_own" on public.reconciliation_sessions;
create policy "reconciliation_select_own" on public.reconciliation_sessions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "reconciliation_insert_own" on public.reconciliation_sessions;
create policy "reconciliation_insert_own" on public.reconciliation_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "reconciliation_update_own" on public.reconciliation_sessions;
create policy "reconciliation_update_own" on public.reconciliation_sessions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "reconciliation_delete_own" on public.reconciliation_sessions;
create policy "reconciliation_delete_own" on public.reconciliation_sessions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.reconciliation_sessions from anon;
grant select, insert, update, delete on public.reconciliation_sessions to authenticated;

-- ---------- 2. public.users (login antiguo) ----------
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;

-- ---------- 3. cotizaciones ----------
create table if not exists public.cotizaciones (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  fecha      text        not null,
  moneda     text        not null,
  comprador  numeric,
  vendedor   numeric,
  created_at timestamptz not null default now()
);

create index if not exists cotizaciones_user_created_idx
  on public.cotizaciones (user_id, created_at desc);

alter table public.cotizaciones enable row level security;

drop policy if exists "cotizaciones_select_own" on public.cotizaciones;
create policy "cotizaciones_select_own" on public.cotizaciones
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "cotizaciones_insert_own" on public.cotizaciones;
create policy "cotizaciones_insert_own" on public.cotizaciones
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "cotizaciones_delete_own" on public.cotizaciones;
create policy "cotizaciones_delete_own" on public.cotizaciones
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.cotizaciones to authenticated;

-- ---------- 4. search_path fijo ----------
alter function public.workspace_items_touch() set search_path = '';
