create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.operativa_facturas_recibidas (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  proveedor_id bigint not null references public.proveedores(id) on delete restrict,
  fecha_factura date not null,
  numero_factura text not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  base_0 numeric(12,2) not null default 0,
  base_4 numeric(12,2) not null default 0,
  base_10 numeric(12,2) not null default 0,
  base_21 numeric(12,2) not null default 0,
  total_base numeric(12,2) not null default 0,
  total_iva numeric(12,2) not null default 0,
  total_factura numeric(12,2) not null default 0,
  pagado boolean not null default false,
  fecha_pago date,
  forma_pago_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  numero_pagare text,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_facturas_emitidas (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  cliente_id bigint not null references public.clientes(id) on delete restrict,
  fecha_factura date not null,
  numero_factura text not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  base_0 numeric(12,2) not null default 0,
  base_4 numeric(12,2) not null default 0,
  base_10 numeric(12,2) not null default 0,
  base_21 numeric(12,2) not null default 0,
  total_base numeric(12,2) not null default 0,
  total_iva numeric(12,2) not null default 0,
  total_factura numeric(12,2) not null default 0,
  cobrado boolean not null default true,
  fecha_cobro date,
  forma_cobro_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  numero_pagare text,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_alquileres (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  proveedor_id bigint not null references public.proveedores(id) on delete restrict,
  fecha_alquiler date not null,
  numero_factura text,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  retencion numeric(12,2) not null default 0,
  base_0 numeric(12,2) not null default 0,
  base_4 numeric(12,2) not null default 0,
  base_10 numeric(12,2) not null default 0,
  base_21 numeric(12,2) not null default 0,
  total_base numeric(12,2) not null default 0,
  total_iva numeric(12,2) not null default 0,
  total_factura numeric(12,2) not null default 0,
  pagado boolean not null default false,
  fecha_pago date,
  forma_pago_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  numero_pagare text,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_gastos_bancarios (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_gasto date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  concepto_gasto_bancario_id bigint references public.conceptos_gastos_bancarios(id) on delete restrict,
  total_gasto numeric(12,2) not null default 0,
  pagado boolean not null default true,
  fecha_pago date,
  forma_pago_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_creditos (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_credito date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  total_credito numeric(12,2) not null default 0,
  pagado boolean not null default true,
  fecha_pago date,
  forma_pago_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_impuestos (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  proveedor_id bigint not null references public.proveedores(id) on delete restrict,
  fecha_impuesto date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  total_impuesto numeric(12,2) not null default 0,
  pagado boolean not null default true,
  fecha_pago date,
  forma_pago_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  numero_pagare text,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_personal (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_personal date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  base_0 numeric(12,2) not null default 0,
  base_21 numeric(12,2) not null default 0,
  total_base numeric(12,2) not null default 0,
  total_iva numeric(12,2) not null default 0,
  total_personal numeric(12,2) not null default 0,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_caja (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_caja date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  total_base numeric(12,2) not null default 0,
  total_iva numeric(12,2) not null default 0,
  total_caja numeric(12,2) not null default 0,
  cobrado boolean not null default true,
  fecha_cobro date,
  forma_cobro_id bigint references public.formas_pago(id) on delete restrict,
  banco_id bigint references public.bancos(id) on delete restrict,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operativa_notas_varias (
  id bigint primary key generated always as identity,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_nota date not null,
  tipo_id bigint references public.tipos(id) on delete restrict,
  familia_id bigint references public.familias(id) on delete restrict,
  subfamilia_id bigint references public.subfamilias(id) on delete restrict,
  total_nota numeric(12,2) not null default 0,
  observaciones text not null default '',
  adjunto_nombre text,
  adjunto_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operativa_facturas_recibidas_empresa_id on public.operativa_facturas_recibidas(empresa_id);
create index if not exists idx_operativa_facturas_recibidas_proveedor_id on public.operativa_facturas_recibidas(proveedor_id);
create index if not exists idx_operativa_facturas_recibidas_fecha_factura on public.operativa_facturas_recibidas(fecha_factura);
create index if not exists idx_operativa_facturas_recibidas_tipo_id on public.operativa_facturas_recibidas(tipo_id);
create index if not exists idx_operativa_facturas_recibidas_familia_id on public.operativa_facturas_recibidas(familia_id);

create index if not exists idx_operativa_facturas_emitidas_empresa_id on public.operativa_facturas_emitidas(empresa_id);
create index if not exists idx_operativa_facturas_emitidas_cliente_id on public.operativa_facturas_emitidas(cliente_id);
create index if not exists idx_operativa_facturas_emitidas_fecha_factura on public.operativa_facturas_emitidas(fecha_factura);
create index if not exists idx_operativa_facturas_emitidas_tipo_id on public.operativa_facturas_emitidas(tipo_id);
create index if not exists idx_operativa_facturas_emitidas_familia_id on public.operativa_facturas_emitidas(familia_id);

create index if not exists idx_operativa_alquileres_empresa_id on public.operativa_alquileres(empresa_id);
create index if not exists idx_operativa_alquileres_proveedor_id on public.operativa_alquileres(proveedor_id);
create index if not exists idx_operativa_alquileres_fecha_alquiler on public.operativa_alquileres(fecha_alquiler);
create index if not exists idx_operativa_alquileres_tipo_id on public.operativa_alquileres(tipo_id);
create index if not exists idx_operativa_alquileres_familia_id on public.operativa_alquileres(familia_id);

create index if not exists idx_operativa_gastos_bancarios_empresa_id on public.operativa_gastos_bancarios(empresa_id);
create index if not exists idx_operativa_gastos_bancarios_fecha_gasto on public.operativa_gastos_bancarios(fecha_gasto);
create index if not exists idx_operativa_gastos_bancarios_tipo_id on public.operativa_gastos_bancarios(tipo_id);
create index if not exists idx_operativa_gastos_bancarios_familia_id on public.operativa_gastos_bancarios(familia_id);

create index if not exists idx_operativa_creditos_empresa_id on public.operativa_creditos(empresa_id);
create index if not exists idx_operativa_creditos_fecha_credito on public.operativa_creditos(fecha_credito);
create index if not exists idx_operativa_creditos_tipo_id on public.operativa_creditos(tipo_id);
create index if not exists idx_operativa_creditos_familia_id on public.operativa_creditos(familia_id);

create index if not exists idx_operativa_impuestos_empresa_id on public.operativa_impuestos(empresa_id);
create index if not exists idx_operativa_impuestos_proveedor_id on public.operativa_impuestos(proveedor_id);
create index if not exists idx_operativa_impuestos_fecha_impuesto on public.operativa_impuestos(fecha_impuesto);
create index if not exists idx_operativa_impuestos_tipo_id on public.operativa_impuestos(tipo_id);
create index if not exists idx_operativa_impuestos_familia_id on public.operativa_impuestos(familia_id);

create index if not exists idx_operativa_personal_empresa_id on public.operativa_personal(empresa_id);
create index if not exists idx_operativa_personal_fecha_personal on public.operativa_personal(fecha_personal);
create index if not exists idx_operativa_personal_tipo_id on public.operativa_personal(tipo_id);
create index if not exists idx_operativa_personal_familia_id on public.operativa_personal(familia_id);

create index if not exists idx_operativa_caja_empresa_id on public.operativa_caja(empresa_id);
create index if not exists idx_operativa_caja_fecha_caja on public.operativa_caja(fecha_caja);
create index if not exists idx_operativa_caja_tipo_id on public.operativa_caja(tipo_id);
create index if not exists idx_operativa_caja_familia_id on public.operativa_caja(familia_id);

create index if not exists idx_operativa_notas_varias_empresa_id on public.operativa_notas_varias(empresa_id);
create index if not exists idx_operativa_notas_varias_fecha_nota on public.operativa_notas_varias(fecha_nota);
create index if not exists idx_operativa_notas_varias_tipo_id on public.operativa_notas_varias(tipo_id);
create index if not exists idx_operativa_notas_varias_familia_id on public.operativa_notas_varias(familia_id);

drop trigger if exists trg_operativa_facturas_recibidas_updated_at on public.operativa_facturas_recibidas;
create trigger trg_operativa_facturas_recibidas_updated_at
before update on public.operativa_facturas_recibidas
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_facturas_emitidas_updated_at on public.operativa_facturas_emitidas;
create trigger trg_operativa_facturas_emitidas_updated_at
before update on public.operativa_facturas_emitidas
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_alquileres_updated_at on public.operativa_alquileres;
create trigger trg_operativa_alquileres_updated_at
before update on public.operativa_alquileres
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_gastos_bancarios_updated_at on public.operativa_gastos_bancarios;
create trigger trg_operativa_gastos_bancarios_updated_at
before update on public.operativa_gastos_bancarios
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_creditos_updated_at on public.operativa_creditos;
create trigger trg_operativa_creditos_updated_at
before update on public.operativa_creditos
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_impuestos_updated_at on public.operativa_impuestos;
create trigger trg_operativa_impuestos_updated_at
before update on public.operativa_impuestos
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_personal_updated_at on public.operativa_personal;
create trigger trg_operativa_personal_updated_at
before update on public.operativa_personal
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_caja_updated_at on public.operativa_caja;
create trigger trg_operativa_caja_updated_at
before update on public.operativa_caja
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_notas_varias_updated_at on public.operativa_notas_varias;
create trigger trg_operativa_notas_varias_updated_at
before update on public.operativa_notas_varias
for each row execute function public.set_updated_at();
