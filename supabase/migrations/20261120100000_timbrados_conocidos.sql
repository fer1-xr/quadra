-- Quadra · Padrón propio de timbrados (timbrado → RUC del emisor)
-- La DNIT no publica una consulta timbrado → RUC (sus consultas piden el RUC y un captcha),
-- así que Quadra lo arma con lo que lee en cada conciliación RG90: el libro y el RG90
-- traen, por cada comprobante, el timbrado y el RUC de quien lo emitió.
-- Es compartido entre todas las cuentas de Quadra y no guarda quién aportó cada dato
-- (ni el estudio ni el cliente): solo el par timbrado/RUC, que figura impreso en la factura.
-- Se escribe con public.aprender_timbrados() y se lee con public.buscar_timbrado().

create table if not exists public.timbrados_conocidos (
  timbrado text collate "C" not null check (timbrado ~ '^[0-9]{8}$'),
  ruc      text collate "C" not null check (ruc ~ '^[0-9]{3,9}$'),   -- sin dígito verificador
  dv       smallint,
  nombre   text not null default '',                                -- razón social tal como vino en el archivo
  usos     integer not null default 1,                               -- en cuántas conciliaciones apareció
  primero  timestamptz not null default now(),
  ultimo   timestamptz not null default now(),
  primary key (timbrado, ruc)
);

-- sin políticas: nadie lee ni escribe la tabla directo, solo por las funciones de abajo
alter table public.timbrados_conocidos enable row level security;

/**
 * Suma los pares de una conciliación: [{ timbrado, ruc, dv, nombre }].
 * Cada par cuenta una vez por llamada aunque aparezca en muchas facturas del mes.
 * Devuelve cuántos pares distintos se registraron.
 */
create or replace function public.aprender_timbrados(items jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then raise exception 'No autorizado'; end if;
  if jsonb_typeof(items) <> 'array' then return 0; end if;
  if jsonb_array_length(items) > 20000 then raise exception 'Demasiados timbrados en una sola carga'; end if;

  with crudo as (
    select regexp_replace(coalesce(e->>'timbrado', ''), '\D', '', 'g') as timbrado,
           ltrim(regexp_replace(coalesce(e->>'ruc', ''), '\D', '', 'g'), '0') as ruc,
           nullif(regexp_replace(coalesce(e->>'dv', ''), '\D', '', 'g'), '') as dv,
           left(btrim(coalesce(e->>'nombre', '')), 200) as nombre
      from jsonb_array_elements(items) e
  ),
  pares as (
    select timbrado, ruc,
           (max(dv))::smallint as dv,
           coalesce(max(nullif(nombre, '')), '') as nombre
      from crudo
     where timbrado ~ '^[0-9]{8}$' and timbrado <> '00000000' and ruc ~ '^[0-9]{3,9}$'
       and (dv is null or length(dv) = 1)
     group by timbrado, ruc
  )
  insert into public.timbrados_conocidos as t (timbrado, ruc, dv, nombre)
  select timbrado, ruc, dv, nombre from pares
  on conflict (timbrado, ruc) do update
     set usos = t.usos + 1,
         dv = coalesce(excluded.dv, t.dv),
         nombre = case when excluded.nombre <> '' then excluded.nombre else t.nombre end,
         ultimo = now();

  get diagnostics n = row_count;
  return n;
end
$$;

revoke all on function public.aprender_timbrados(jsonb) from public, anon;
grant execute on function public.aprender_timbrados(jsonb) to authenticated;

/**
 * Quién emite un timbrado: los RUC que lo usaron, el más visto primero.
 * El nombre sale del padrón de la DNIT (public.ruc_dnit) si el RUC está ahí.
 */
create or replace function public.buscar_timbrado(t text)
returns table (ruc text, dv smallint, nombre text, estado text, usos integer, ultimo timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select k.ruc::text,
         coalesce(r.dv, k.dv),
         coalesce(nullif(r.nombre, ''), k.nombre),
         r.estado,
         k.usos,
         k.ultimo
    from public.timbrados_conocidos k
    left join public.ruc_dnit r on r.ruc = k.ruc
   where auth.uid() is not null
     and k.timbrado = regexp_replace(coalesce(t, ''), '\D', '', 'g')
   order by k.usos desc, k.ultimo desc
   limit 5
$$;

revoke all on function public.buscar_timbrado(text) from public, anon;
grant execute on function public.buscar_timbrado(text) to authenticated;
