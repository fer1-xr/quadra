-- Quadra · Historial sin vencimiento y favoritos en la nube
-- 1. historial_trabajo: los registros quedan guardados hasta que el usuario
--    los elimine (expires_at deja de ser obligatorio y no se completa).
-- 2. workspace_items: nuevo kind 'favorito' (lecciones favoritas).
-- Ejecutar una vez en Supabase → SQL Editor.

-- ---------- 1. historial sin vencimiento ----------
alter table public.historial_trabajo
  drop constraint if exists historial_trabajo_min_3_meses;

alter table public.historial_trabajo
  alter column expires_at drop not null,
  alter column expires_at drop default;

update public.historial_trabajo set expires_at = null where expires_at is not null;

drop index if exists public.historial_trabajo_expires_idx;

-- ---------- 2. favoritos ----------
alter table public.workspace_items
  drop constraint if exists workspace_items_kind_check;

alter table public.workspace_items
  add constraint workspace_items_kind_check
  check (kind in ('cliente', 'tarea', 'meta', 'recordatorio', 'nota', 'favorito'));
