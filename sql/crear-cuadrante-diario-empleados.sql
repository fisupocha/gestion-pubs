create table if not exists public.cuadrante_diario_empleados (
  id bigint primary key generated always as identity,
  fecha date not null,
  hora text not null,
  empleado_id bigint not null references public.empleados(id) on delete cascade,
  nombre_empleado text not null,
  familia text not null default '',
  empresa_id bigint references public.empresas(id) on delete restrict,
  local text not null,
  precio numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cuadrante_diario_empleados_unique unique (fecha, empleado_id, hora)
);

create index if not exists idx_cuadrante_diario_empleados_fecha
on public.cuadrante_diario_empleados(fecha);

create index if not exists idx_cuadrante_diario_empleados_empleado_id
on public.cuadrante_diario_empleados(empleado_id);

create index if not exists idx_cuadrante_diario_empleados_empresa_id
on public.cuadrante_diario_empleados(empresa_id);

grant select, insert, update, delete on table public.cuadrante_diario_empleados
to anon, authenticated, service_role;

grant usage, select on sequence public.cuadrante_diario_empleados_id_seq
to anon, authenticated, service_role;

alter table public.cuadrante_diario_empleados enable row level security;

drop policy if exists "cuadrante_diario_empleados_select_all"
on public.cuadrante_diario_empleados;
create policy "cuadrante_diario_empleados_select_all"
on public.cuadrante_diario_empleados
for select
to anon, authenticated
using (true);

drop policy if exists "cuadrante_diario_empleados_insert_all"
on public.cuadrante_diario_empleados;
create policy "cuadrante_diario_empleados_insert_all"
on public.cuadrante_diario_empleados
for insert
to anon, authenticated
with check (true);

drop policy if exists "cuadrante_diario_empleados_update_all"
on public.cuadrante_diario_empleados;
create policy "cuadrante_diario_empleados_update_all"
on public.cuadrante_diario_empleados
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "cuadrante_diario_empleados_delete_all"
on public.cuadrante_diario_empleados;
create policy "cuadrante_diario_empleados_delete_all"
on public.cuadrante_diario_empleados
for delete
to anon, authenticated
using (true);

drop trigger if exists trg_cuadrante_diario_empleados_updated_at
on public.cuadrante_diario_empleados;
create trigger trg_cuadrante_diario_empleados_updated_at
before update on public.cuadrante_diario_empleados
for each row execute function public.set_updated_at();
