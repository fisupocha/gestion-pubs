create table if not exists public.gestion_diaria_liquidacion_empleados (
  id bigint primary key generated always as identity,
  periodo date not null,
  empleado_id bigint not null references public.empleados(id) on delete cascade,
  pagado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gestion_diaria_liquidacion_empleados_unique unique (periodo, empleado_id)
);

create index if not exists idx_gestion_diaria_liquidacion_empleados_periodo
on public.gestion_diaria_liquidacion_empleados(periodo);

create index if not exists idx_gestion_diaria_liquidacion_empleados_empleado_id
on public.gestion_diaria_liquidacion_empleados(empleado_id);

grant select, insert, update, delete on table public.gestion_diaria_liquidacion_empleados
to anon, authenticated, service_role;

grant usage, select on sequence public.gestion_diaria_liquidacion_empleados_id_seq
to anon, authenticated, service_role;

alter table public.gestion_diaria_liquidacion_empleados enable row level security;

drop policy if exists "gestion_diaria_liquidacion_empleados_select_all"
on public.gestion_diaria_liquidacion_empleados;
create policy "gestion_diaria_liquidacion_empleados_select_all"
on public.gestion_diaria_liquidacion_empleados
for select
to anon, authenticated
using (true);

drop policy if exists "gestion_diaria_liquidacion_empleados_insert_all"
on public.gestion_diaria_liquidacion_empleados;
create policy "gestion_diaria_liquidacion_empleados_insert_all"
on public.gestion_diaria_liquidacion_empleados
for insert
to anon, authenticated
with check (true);

drop policy if exists "gestion_diaria_liquidacion_empleados_update_all"
on public.gestion_diaria_liquidacion_empleados;
create policy "gestion_diaria_liquidacion_empleados_update_all"
on public.gestion_diaria_liquidacion_empleados
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "gestion_diaria_liquidacion_empleados_delete_all"
on public.gestion_diaria_liquidacion_empleados;
create policy "gestion_diaria_liquidacion_empleados_delete_all"
on public.gestion_diaria_liquidacion_empleados
for delete
to anon, authenticated
using (true);

drop trigger if exists trg_gestion_diaria_liquidacion_empleados_updated_at
on public.gestion_diaria_liquidacion_empleados;
create trigger trg_gestion_diaria_liquidacion_empleados_updated_at
before update on public.gestion_diaria_liquidacion_empleados
for each row execute function public.set_updated_at();
