-- Quadra · Historial de trabajo por contribuyente
-- Guarda conciliaciones (RG90, bancaria), liquidaciones y cálculos que el
-- usuario decide conservar. Cada registro vive al menos 3 meses
-- (expires_at); el usuario puede extender ese plazo desde la app.
-- Ejecutar una vez en Supabase → SQL Editor.

create table if not exists public.historial_trabajo (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id  text        not null,
  cliente     jsonb       not null,           -- razón social, RUC, ejercicio, sucursal al momento de guardar
  modulo      text        not null,           -- rg90 | bancaria | liquidacion | activofijo | flujo | cotizacion | control-pagos
  titulo      text        not null,
  resumen     jsonb       not null default '{}'::jsonb,
  datos       jsonb       not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '3 months'),
  constraint historial_trabajo_min_3_meses check (expires_at >= created_at + interval '3 months')
);

create index if not exists historial_trabajo_user_cliente_idx
  on public.historial_trabajo (user_id, cliente_id, created_at desc);

create index if not exists historial_trabajo_expires_idx
  on public.historial_trabajo (expires_at);

alter table public.historial_trabajo enable row level security;

drop policy if exists "historial_select_own" on public.historial_trabajo;
create policy "historial_select_own" on public.historial_trabajo
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "historial_insert_own" on public.historial_trabajo;
create policy "historial_insert_own" on public.historial_trabajo
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "historial_update_own" on public.historial_trabajo;
create policy "historial_update_own" on public.historial_trabajo
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "historial_delete_own" on public.historial_trabajo;
create policy "historial_delete_own" on public.historial_trabajo
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.historial_trabajo to authenticated;

-- Limpieza diaria de registros vencidos (opcional, requiere la extensión pg_cron).
-- La app además oculta y borra los vencidos al abrir el historial.
-- create extension if not exists pg_cron;
-- select cron.schedule('historial-trabajo-vencidos', '15 3 * * *',
--   $$ delete from public.historial_trabajo where expires_at < now() $$);
