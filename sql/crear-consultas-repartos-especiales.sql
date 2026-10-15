create table if not exists public.consultas_repartos_especiales (
  movimiento_id text primary key,
  origen text not null,
  registro_id bigint not null,
  meses jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint consultas_repartos_especiales_origen_check
    check (origen in ('facturas-emitidas', 'facturas-recibidas')),
  constraint consultas_repartos_especiales_meses_check
    check (jsonb_typeof(meses) = 'array' and jsonb_array_length(meses) > 0)
);

alter table public.consultas_repartos_especiales enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_repartos_especiales'
      and policyname = 'consultas_repartos_especiales_select'
  ) then
    create policy consultas_repartos_especiales_select
      on public.consultas_repartos_especiales
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_repartos_especiales'
      and policyname = 'consultas_repartos_especiales_insert'
  ) then
    create policy consultas_repartos_especiales_insert
      on public.consultas_repartos_especiales
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_repartos_especiales'
      and policyname = 'consultas_repartos_especiales_update'
  ) then
    create policy consultas_repartos_especiales_update
      on public.consultas_repartos_especiales
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_repartos_especiales'
      and policyname = 'consultas_repartos_especiales_delete'
  ) then
    create policy consultas_repartos_especiales_delete
      on public.consultas_repartos_especiales
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;
