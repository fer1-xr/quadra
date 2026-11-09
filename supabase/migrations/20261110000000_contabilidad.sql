-- Quadra · sistema contable
-- Nuevos tipos de registro en workspace_items:
--   'comprobante' → compras, ventas, notas de crédito/débito, recibos, retenciones,
--                   asientos manuales y asiento de revalúo/depreciación (data->>'clienteId')
--   'cuenta'      → cuentas propias del plan de cuentas de un contribuyente
--   'persona'     → catastro de RUC de clientes y proveedores (compartido)
--   'activo'      → bienes del activo fijo de un contribuyente
--   'timbrado'    → timbrados autorizados de un contribuyente
-- Ejecutar una vez en Supabase → SQL Editor.

alter table public.workspace_items
  drop constraint if exists workspace_items_kind_check;

alter table public.workspace_items
  add constraint workspace_items_kind_check
  check (kind in (
    'cliente', 'tarea', 'meta', 'recordatorio', 'nota', 'favorito',
    'comprobante', 'cuenta', 'persona', 'activo', 'timbrado'
  ));
