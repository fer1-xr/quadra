-- Quadra · Padrón de RUC de la DNIT
-- Fuente: https://www.dnit.gov.py/en/web/portal-institucional/listado-de-ruc-con-sus-equivalencias
-- (ruc0.zip … ruc9.zip, formato RUC|RAZON SOCIAL|DV|RUC ANTERIOR|ESTADO|).
-- Se carga con scripts/actualizar-ruc-dnit.mjs y se consulta con public.buscar_ruc()
-- para autocompletar RUC y razón social en los formularios.
-- Para no pasar del límite del plan free sólo se cargan los RUC que no están
-- cancelados (~1,35 millones de filas, ~200 MB).

create table if not exists public.ruc_dnit (
  ruc     text collate "C" primary key,           -- sin dígito verificador
  dv      smallint not null,
  nombre  text not null,                           -- tal como lo publica la DNIT
  estado  text not null                            -- ACTIVO, SUSPENSION TEMPORAL, BLOQUEADO
);

alter table public.ruc_dnit enable row level security;

drop policy if exists "ruc_dnit_select" on public.ruc_dnit;
create policy "ruc_dnit_select" on public.ruc_dnit
  for select to authenticated using (true);

-- Nombre para buscar: mayúsculas, sin tildes, sólo letras/dígitos separados por un espacio
-- ("PEÑA INSAURRALDE, LELI" → "PENA INSAURRALDE LELI").
create or replace function public.ruc_normalizar(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    upper(translate(coalesce(t, ''), 'áéíóúüñÁÉÍÓÚÜÑàèìòùÀÈÌÒÙ', 'aeiouunAEIOUUNaeiouAEIOU')),
    '[^A-Z0-9]+', ' ', 'g'))
$$;

create index if not exists ruc_dnit_nombre_idx on public.ruc_dnit ((public.ruc_normalizar(nombre)) collate "C");

-- Busca por RUC (exacto o que empieza igual) o por nombre (que empieza igual).
create or replace function public.buscar_ruc(q text, limite int default 8)
returns table (ruc text, dv smallint, nombre text, estado text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  lim int := least(greatest(coalesce(limite, 8), 1), 25);
  base text;
  n text;
begin
  if q ~ '^\s*[0-9][0-9.\s]*(-\s*[0-9]?)?\s*$' then
    base := regexp_replace(split_part(q, '-', 1), '\D', '', 'g');
    if length(base) < 3 then return; end if;
    return query
      select r.ruc::text, r.dv, r.nombre, r.estado
        from public.ruc_dnit r
       where r.ruc >= base and r.ruc < base || '~'
       order by r.ruc   -- el RUC exacto queda primero (es el prefijo más corto)
       limit lim;
    return;
  end if;

  n := public.ruc_normalizar(q);
  if length(n) < 3 then return; end if;
  return query
    select x.ruc::text, x.dv, x.nombre, x.estado
      from (
        select r.ruc, r.dv, r.nombre, r.estado, (public.ruc_normalizar(r.nombre) collate "C") as k
          from public.ruc_dnit r
         where (public.ruc_normalizar(r.nombre) collate "C") >= (n collate "C")
           and (public.ruc_normalizar(r.nombre) collate "C") < ((n || '~') collate "C")
         order by (public.ruc_normalizar(r.nombre) collate "C")
         limit 60
      ) x
     order by (x.estado <> 'ACTIVO'), x.k
     limit lim;
end
$$;

revoke all on function public.buscar_ruc(text, int) from public, anon;
grant execute on function public.buscar_ruc(text, int) to authenticated;
