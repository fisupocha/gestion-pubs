grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on table public.operativa_facturas_recibidas to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_facturas_emitidas to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_alquileres to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_gastos_bancarios to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_creditos to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_impuestos to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_personal to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_caja to anon, authenticated, service_role;
grant select, insert, update, delete on table public.operativa_notas_varias to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

alter table public.operativa_facturas_recibidas enable row level security;
alter table public.operativa_facturas_emitidas enable row level security;
alter table public.operativa_alquileres enable row level security;
alter table public.operativa_gastos_bancarios enable row level security;
alter table public.operativa_creditos enable row level security;
alter table public.operativa_impuestos enable row level security;
alter table public.operativa_personal enable row level security;
alter table public.operativa_caja enable row level security;
alter table public.operativa_notas_varias enable row level security;

drop policy if exists "operativa_facturas_recibidas_select_all" on public.operativa_facturas_recibidas;
create policy "operativa_facturas_recibidas_select_all"
on public.operativa_facturas_recibidas
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_facturas_recibidas_insert_all" on public.operativa_facturas_recibidas;
create policy "operativa_facturas_recibidas_insert_all"
on public.operativa_facturas_recibidas
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_facturas_recibidas_update_all" on public.operativa_facturas_recibidas;
create policy "operativa_facturas_recibidas_update_all"
on public.operativa_facturas_recibidas
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_facturas_recibidas_delete_all" on public.operativa_facturas_recibidas;
create policy "operativa_facturas_recibidas_delete_all"
on public.operativa_facturas_recibidas
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_facturas_emitidas_select_all" on public.operativa_facturas_emitidas;
create policy "operativa_facturas_emitidas_select_all"
on public.operativa_facturas_emitidas
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_facturas_emitidas_insert_all" on public.operativa_facturas_emitidas;
create policy "operativa_facturas_emitidas_insert_all"
on public.operativa_facturas_emitidas
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_facturas_emitidas_update_all" on public.operativa_facturas_emitidas;
create policy "operativa_facturas_emitidas_update_all"
on public.operativa_facturas_emitidas
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_facturas_emitidas_delete_all" on public.operativa_facturas_emitidas;
create policy "operativa_facturas_emitidas_delete_all"
on public.operativa_facturas_emitidas
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_alquileres_select_all" on public.operativa_alquileres;
create policy "operativa_alquileres_select_all"
on public.operativa_alquileres
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_alquileres_insert_all" on public.operativa_alquileres;
create policy "operativa_alquileres_insert_all"
on public.operativa_alquileres
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_alquileres_update_all" on public.operativa_alquileres;
create policy "operativa_alquileres_update_all"
on public.operativa_alquileres
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_alquileres_delete_all" on public.operativa_alquileres;
create policy "operativa_alquileres_delete_all"
on public.operativa_alquileres
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_gastos_bancarios_select_all" on public.operativa_gastos_bancarios;
create policy "operativa_gastos_bancarios_select_all"
on public.operativa_gastos_bancarios
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_gastos_bancarios_insert_all" on public.operativa_gastos_bancarios;
create policy "operativa_gastos_bancarios_insert_all"
on public.operativa_gastos_bancarios
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_gastos_bancarios_update_all" on public.operativa_gastos_bancarios;
create policy "operativa_gastos_bancarios_update_all"
on public.operativa_gastos_bancarios
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_gastos_bancarios_delete_all" on public.operativa_gastos_bancarios;
create policy "operativa_gastos_bancarios_delete_all"
on public.operativa_gastos_bancarios
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_creditos_select_all" on public.operativa_creditos;
create policy "operativa_creditos_select_all"
on public.operativa_creditos
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_creditos_insert_all" on public.operativa_creditos;
create policy "operativa_creditos_insert_all"
on public.operativa_creditos
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_creditos_update_all" on public.operativa_creditos;
create policy "operativa_creditos_update_all"
on public.operativa_creditos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_creditos_delete_all" on public.operativa_creditos;
create policy "operativa_creditos_delete_all"
on public.operativa_creditos
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_impuestos_select_all" on public.operativa_impuestos;
create policy "operativa_impuestos_select_all"
on public.operativa_impuestos
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_impuestos_insert_all" on public.operativa_impuestos;
create policy "operativa_impuestos_insert_all"
on public.operativa_impuestos
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_impuestos_update_all" on public.operativa_impuestos;
create policy "operativa_impuestos_update_all"
on public.operativa_impuestos
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_impuestos_delete_all" on public.operativa_impuestos;
create policy "operativa_impuestos_delete_all"
on public.operativa_impuestos
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_personal_select_all" on public.operativa_personal;
create policy "operativa_personal_select_all"
on public.operativa_personal
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_personal_insert_all" on public.operativa_personal;
create policy "operativa_personal_insert_all"
on public.operativa_personal
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_personal_update_all" on public.operativa_personal;
create policy "operativa_personal_update_all"
on public.operativa_personal
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_personal_delete_all" on public.operativa_personal;
create policy "operativa_personal_delete_all"
on public.operativa_personal
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_caja_select_all" on public.operativa_caja;
create policy "operativa_caja_select_all"
on public.operativa_caja
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_caja_insert_all" on public.operativa_caja;
create policy "operativa_caja_insert_all"
on public.operativa_caja
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_caja_update_all" on public.operativa_caja;
create policy "operativa_caja_update_all"
on public.operativa_caja
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_caja_delete_all" on public.operativa_caja;
create policy "operativa_caja_delete_all"
on public.operativa_caja
for delete
to anon, authenticated
using (true);

drop policy if exists "operativa_notas_varias_select_all" on public.operativa_notas_varias;
create policy "operativa_notas_varias_select_all"
on public.operativa_notas_varias
for select
to anon, authenticated
using (true);

drop policy if exists "operativa_notas_varias_insert_all" on public.operativa_notas_varias;
create policy "operativa_notas_varias_insert_all"
on public.operativa_notas_varias
for insert
to anon, authenticated
with check (true);

drop policy if exists "operativa_notas_varias_update_all" on public.operativa_notas_varias;
create policy "operativa_notas_varias_update_all"
on public.operativa_notas_varias
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "operativa_notas_varias_delete_all" on public.operativa_notas_varias;
create policy "operativa_notas_varias_delete_all"
on public.operativa_notas_varias
for delete
to anon, authenticated
using (true);

notify pgrst, 'reload schema';
