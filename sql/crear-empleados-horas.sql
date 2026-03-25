create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.empleados (
  id bigint primary key generated always as identity,
  nombre text not null,
  familia_id bigint not null references public.familias(id) on delete restrict,
  precio_sueldo numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_empleados_familia_id on public.empleados(familia_id);
create index if not exists idx_empleados_nombre on public.empleados(nombre);

create table if not exists public.operativa_horas (
  id bigint primary key generated always as identity,
  empleado_id bigint not null references public.empleados(id) on delete restrict,
  empresa_id bigint not null references public.empresas(id) on delete restrict,
  fecha_horas date not null,
  tipo_id bigint not null references public.tipos(id) on delete restrict,
  familia_id bigint not null references public.familias(id) on delete restrict,
  horas numeric(10,2) not null default 0,
  precio_sueldo numeric(12,2) not null default 0,
  total_sueldo numeric(12,2) not null default 0,
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operativa_horas_empleado_id on public.operativa_horas(empleado_id);
create index if not exists idx_operativa_horas_empresa_id on public.operativa_horas(empresa_id);
create index if not exists idx_operativa_horas_fecha_horas on public.operativa_horas(fecha_horas);
create index if not exists idx_operativa_horas_tipo_id on public.operativa_horas(tipo_id);
create index if not exists idx_operativa_horas_familia_id on public.operativa_horas(familia_id);

grant select, insert, update, delete on table public.empleados to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_horas to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter table public.empleados enable row level security;
alter table public.operativa_horas enable row level security;

drop policy if exists "empleados_select_all" on public.empleados;
create policy "empleados_select_all"
on public.empleados
for select
to anon, authenticated
using (true);

drop policy if exists "empleados_insert_all" on public.empleados;
create policy "empleados_insert_all"
on public.empleados
for insert
to anon, authenticated
with check (true);

drop policy if exists "empleados_update_all" on public.empleados;
create policy "empleados_update_all"
on public.empleados
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "empleados_delete_all" on public.empleados;
create policy "empleados_delete_all"
on public.empleados
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_horas_select_all" on public.operativa_horas;
create policy "operativa_horas_select_all"
on public.operativa_horas
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_horas_insert_all" on public.operativa_horas;
create policy "operativa_horas_insert_all"
on public.operativa_horas
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_horas_update_all" on public.operativa_horas;
create policy "operativa_horas_update_all"
on public.operativa_horas
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_horas_delete_all" on public.operativa_horas;
create policy "operativa_horas_delete_all"
on public.operativa_horas
for delete
to anon, authenticated
using (true);

drop trigger if exists trg_empleados_updated_at on public.empleados;
create trigger trg_empleados_updated_at
before update on public.empleados
for each row execute function public.set_updated_at();

drop trigger if exists trg_operativa_horas_updated_at on public.operativa_horas;
create trigger trg_operativa_horas_updated_at
before update on public.operativa_horas
for each row execute function public.set_updated_at();
