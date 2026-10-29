-- Preparación del módulo independiente. NO aplicado a producción.
-- No almacena PDF ni modifica facturas, proveedores, bancos, locales o Leo.
begin;
create table public.mercaderias_lineas (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null check (btrim(proveedor) <> ''),
  factura text not null check (btrim(factura) <> ''),
  fecha date not null,
  albaran text not null default '',
  pagina integer not null check (pagina > 0),
  linea integer not null check (linea > 0),
  producto text not null check (btrim(producto) <> ''),
  formato text not null check (btrim(formato) <> ''),
  local text check (local is null or btrim(local) <> ''),
  compradas integer not null check (compradas >= 0),
  bonificadas integer not null check (bonificadas >= 0),
  importe_iva_centimos integer not null check (importe_iva_centimos >= 0),
  estado_validacion text not null default 'pendiente' check (estado_validacion in ('pendiente', 'validada')),
  creado_en timestamptz not null default now(),
  check (compradas::bigint + bonificadas::bigint > 0),
  check (compradas > 0 or importe_iva_centimos = 0),
  unique (proveedor, factura, pagina, linea)
);
alter table public.mercaderias_lineas enable row level security;
revoke all on public.mercaderias_lineas from public, anon, authenticated;
grant select on public.mercaderias_lineas to authenticated;
create policy mercaderias_lectura_admin on public.mercaderias_lineas
  for select to authenticated using (public.es_admin());
-- Sin permisos INSERT/UPDATE/DELETE para sesiones del navegador.
-- La carga histórica requiere revisión y autorización específica del lote.
commit;

-- Reversión antes de la primera carga: DROP TABLE public.mercaderias_lineas;
-- Después de una carga: exportar y verificar primero los datos del módulo.
-- No usar CASCADE. Esta tabla no depende de tablas empresariales existentes.
