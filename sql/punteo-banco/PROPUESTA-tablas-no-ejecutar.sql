-- PROPUESTA. No ejecutar.
-- No crea datos, no modifica tablas vivas y no cambia las políticas actuales.
-- Hace falta autorización antes de aplicarla en Supabase.

-- Histórico de extractos importados desde Punteo banco.
-- El administrador lee y escribe. Gestoría no entra en Gestión diaria.

create table if not exists public.punteo_importaciones (
  id bigint primary key generated always as identity,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  nombre_archivo text not null,
  periodo_desde date,
  periodo_hasta date,
  periodo_confirmado boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.punteo_movimientos (
  id text primary key,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  -- Fecha de operación (CaixaBank: Fecha. Ibercaja: Fecha operación). Es la que manda.
  fecha date not null,
  -- Fecha valor, solo informativa. Puede faltar. No asigna mes ni cobertura.
  fecha_valor date,
  importe numeric(14,2) not null,
  concepto text not null default '',
  concepto_original text not null default '',
  detalles_originales text not null default '',
  saldo numeric(14,2),
  referencias text[] not null default '{}',
  clase text not null,
  observaciones text not null default '',
  ok text not null default 'pendiente' check (ok in ('pendiente', 'comprobado')),
  archivo text not null default '',
  fila integer not null default 0,
  orden integer not null default 0,
  importacion_id bigint references public.punteo_importaciones(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.punteo_periodos (
  id bigint primary key generated always as identity,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  desde date not null,
  hasta date not null,
  check (desde <= hasta)
);

create table if not exists public.punteo_huecos (
  id bigint primary key generated always as identity,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  desde date not null,
  hasta date not null,
  check (desde <= hasta)
);

create table if not exists public.punteo_incidencias_descartadas (
  id text primary key,
  created_at timestamptz not null default now()
);

-- La comisión mensual, cuando se autorice, se escribirá en la tabla ya existente
-- public.operativa_gastos_bancarios:
--   empresa_id del local Riverocio
--   fecha_gasto = último día del mes
--   total_gasto = valor absoluto de las comisiones TPV
--   banco_id del banco correspondiente
--   observaciones con la clave estable punteo-tpv:{banco}:{anio}-{mes}
-- No se reparte entre Cue, Hangar y Tarantino.
-- No depende de la caja del mes.
-- No se inserta otra fila si esa clave ya existe.
-- Las cuotas de créditos, cuando se autorice, usarán public.operativa_creditos
-- con total_credito, sin desglose de intereses y capital, y empresa Riverocio.
-- No se modifican Consultas, Pocha ni las políticas ya existentes.

alter table public.punteo_importaciones enable row level security;
alter table public.punteo_movimientos enable row level security;
alter table public.punteo_periodos enable row level security;
alter table public.punteo_huecos enable row level security;
alter table public.punteo_incidencias_descartadas enable row level security;

revoke all on public.punteo_importaciones from public, anon;
revoke all on public.punteo_movimientos from public, anon;
revoke all on public.punteo_periodos from public, anon;
revoke all on public.punteo_huecos from public, anon;
revoke all on public.punteo_incidencias_descartadas from public, anon;

grant select, insert, update, delete on public.punteo_importaciones to authenticated;
grant select, insert, update, delete on public.punteo_movimientos to authenticated;
grant select, insert, update, delete on public.punteo_periodos to authenticated;
grant select, insert, update, delete on public.punteo_huecos to authenticated;
grant select, insert, update, delete on public.punteo_incidencias_descartadas to authenticated;

create policy punteo_importaciones_admin on public.punteo_importaciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy punteo_movimientos_admin on public.punteo_movimientos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy punteo_periodos_admin on public.punteo_periodos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy punteo_huecos_admin on public.punteo_huecos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy punteo_incidencias_admin on public.punteo_incidencias_descartadas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());
