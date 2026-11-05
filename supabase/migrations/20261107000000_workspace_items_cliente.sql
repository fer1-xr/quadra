-- Quadra · espacio de trabajo por cliente
-- Nuevos tipos de registro en workspace_items:
--   'recordatorio' → ayuda memoria de tareas del ejercicio económico de un cliente
--   'nota'         → notas y reuniones sobre un cliente
-- (Las metas por cliente usan kind 'meta' con el campo data->>'clienteId'.)
-- Ejecutar una vez en Supabase → SQL Editor.

alter table public.workspace_items
  drop constraint if exists workspace_items_kind_check;

alter table public.workspace_items
  add constraint workspace_items_kind_check
  check (kind in ('cliente', 'tarea', 'meta', 'recordatorio', 'nota'));
