create table if not exists public.gestion_diaria_adelantos_empleados (
  id bigint primary key generated always as identity,
  fecha date not null,
  empleado_id bigint not null references public.empleados(id) on delete cascade,
  importe numeric(12,2) not null default 0,
  observaciones text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gestion_diaria_adelantos_empleados_fecha
on public.gestion_diaria_adelantos_empleados(fecha);

create index if not exists idx_gestion_diaria_adelantos_empleados_empleado_id
on public.gestion_diaria_adelantos_empleados(empleado_id);

grant select, insert, update, delete on table public.gestion_diaria_adelantos_empleados
to anon, authenticated, service_role;

grant usage, select on sequence public.gestion_diaria_adelantos_empleados_id_seq
to anon, authenticated, service_role;

alter table public.gestion_diaria_adelantos_empleados enable row level security;

drop policy if exists "gestion_diaria_adelantos_empleados_select_all"
on public.gestion_diaria_adelantos_empleados;
create policy "gestion_diaria_adelantos_empleados_select_all"
on public.gestion_diaria_adelantos_empleados
for select
to anon, authenticated
using (true);

drop policy if exists "gestion_diaria_adelantos_empleados_insert_all"
on public.gestion_diaria_adelantos_empleados;
create policy "gestion_diaria_adelantos_empleados_insert_all"
on public.gestion_diaria_adelantos_empleados
for insert
to anon, authenticated
with check (true);

drop policy if exists "gestion_diaria_adelantos_empleados_update_all"
on public.gestion_diaria_adelantos_empleados;
create policy "gestion_diaria_adelantos_empleados_update_all"
on public.gestion_diaria_adelantos_empleados
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "gestion_diaria_adelantos_empleados_delete_all"
on public.gestion_diaria_adelantos_empleados;
create policy "gestion_diaria_adelantos_empleados_delete_all"
on public.gestion_diaria_adelantos_empleados
for delete
to anon, authenticated
using (true);

drop trigger if exists trg_gestion_diaria_adelantos_empleados_updated_at
on public.gestion_diaria_adelantos_empleados;
create trigger trg_gestion_diaria_adelantos_empleados_updated_at
before update on public.gestion_diaria_adelantos_empleados
for each row execute function public.set_updated_at();
