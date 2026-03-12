create table if not exists public.subfamilias (
  id bigint primary key generated always as identity,
  nombre text not null,
  familia_id bigint not null references public.familias(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (familia_id, nombre)
);

create index if not exists idx_subfamilias_familia_id
  on public.subfamilias(familia_id);
