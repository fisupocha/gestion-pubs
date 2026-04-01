create table if not exists public.gestion_diaria_caja (
  id bigint primary key generated always as identity,
  fecha date not null unique,
  tarantino_taquilla numeric(12,2),
  tarantino_taran numeric(12,2),
  tarantino_smoking numeric(12,2),
  cue_taquilla numeric(12,2),
  cue_taquilla_parte_1 numeric(12,2),
  cue_taquilla_parte_2 numeric(12,2),
  cue_barra_grande numeric(12,2),
  cue_barra_grande_parte_1 numeric(12,2),
  cue_barra_grande_parte_2 numeric(12,2),
  cue_barra_pequena numeric(12,2),
  cue_barra_pequena_parte_1 numeric(12,2),
  cue_barra_pequena_parte_2 numeric(12,2),
  hangar numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gestion_diaria_caja_fecha
on public.gestion_diaria_caja(fecha);

grant select, insert, update, delete on table public.gestion_diaria_caja
to anon, authenticated, service_role;

grant usage, select on sequence public.gestion_diaria_caja_id_seq
to anon, authenticated, service_role;

alter table public.gestion_diaria_caja enable row level security;

drop policy if exists "gestion_diaria_caja_select_all"
on public.gestion_diaria_caja;
create policy "gestion_diaria_caja_select_all"
on public.gestion_diaria_caja
for select
to anon, authenticated
using (true);

drop policy if exists "gestion_diaria_caja_insert_all"
on public.gestion_diaria_caja;
create policy "gestion_diaria_caja_insert_all"
on public.gestion_diaria_caja
for insert
to anon, authenticated
with check (true);

drop policy if exists "gestion_diaria_caja_update_all"
on public.gestion_diaria_caja;
create policy "gestion_diaria_caja_update_all"
on public.gestion_diaria_caja
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "gestion_diaria_caja_delete_all"
on public.gestion_diaria_caja;
create policy "gestion_diaria_caja_delete_all"
on public.gestion_diaria_caja
for delete
to anon, authenticated
using (true);

drop trigger if exists trg_gestion_diaria_caja_updated_at
on public.gestion_diaria_caja;
create trigger trg_gestion_diaria_caja_updated_at
before update on public.gestion_diaria_caja
for each row execute function public.set_updated_at();
