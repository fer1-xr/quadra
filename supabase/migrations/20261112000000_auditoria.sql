-- Quadra · auditoría de movimientos contables
-- Nuevo tipo de registro en workspace_items:
--   'auditoria' → cada alta, modificación o baja de comprobantes, cuentas, activos,
--                 timbrados y personas, con fecha, usuario y campos cambiados
--                 (data->>'clienteId' indica el contribuyente)
-- Ejecutar una vez en Supabase → SQL Editor.

alter table public.workspace_items
  drop constraint if exists workspace_items_kind_check;

alter table public.workspace_items
  add constraint workspace_items_kind_check
  check (kind in (
    'cliente', 'tarea', 'meta', 'recordatorio', 'nota', 'favorito',
    'comprobante', 'cuenta', 'persona', 'activo', 'timbrado',
    'auditoria'
  ));
