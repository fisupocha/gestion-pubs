create table if not exists public.consultas_reparto_riverocio (
  movimiento_id text primary key,
  origen text not null,
  registro_id bigint not null,
  porcentajes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.consultas_reparto_riverocio enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_reparto_riverocio'
      and policyname = 'consultas_reparto_riverocio_select'
  ) then
    create policy consultas_reparto_riverocio_select
      on public.consultas_reparto_riverocio
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_reparto_riverocio'
      and policyname = 'consultas_reparto_riverocio_insert'
  ) then
    create policy consultas_reparto_riverocio_insert
      on public.consultas_reparto_riverocio
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_reparto_riverocio'
      and policyname = 'consultas_reparto_riverocio_update'
  ) then
    create policy consultas_reparto_riverocio_update
      on public.consultas_reparto_riverocio
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'consultas_reparto_riverocio'
      and policyname = 'consultas_reparto_riverocio_delete'
  ) then
    create policy consultas_reparto_riverocio_delete
      on public.consultas_reparto_riverocio
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;
