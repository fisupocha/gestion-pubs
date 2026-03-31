insert into storage.buckets (id, name, public)
values ('operativa-adjuntos', 'operativa-adjuntos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "operativa_adjuntos_select_all" on storage.objects;
create policy "operativa_adjuntos_select_all"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'operativa-adjuntos');

drop policy if exists "operativa_adjuntos_insert_all" on storage.objects;
create policy "operativa_adjuntos_insert_all"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'operativa-adjuntos');

drop policy if exists "operativa_adjuntos_update_all" on storage.objects;
create policy "operativa_adjuntos_update_all"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'operativa-adjuntos')
with check (bucket_id = 'operativa-adjuntos');

drop policy if exists "operativa_adjuntos_delete_all" on storage.objects;
create policy "operativa_adjuntos_delete_all"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'operativa-adjuntos');
