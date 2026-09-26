-- ============================================================
-- Alumaxi - materiais: coluna de imagem + bucket de Storage
-- Rode uma vez no SQL Editor do Supabase.
-- ============================================================

-- 1) coluna da imagem (URL publica do arquivo no Storage)
alter table materiais add column if not exists imagem_url text;

-- 2) bucket publico para as fotos dos materiais
insert into storage.buckets (id, name, public)
values ('materiais', 'materiais', true)
on conflict (id) do nothing;

-- 3) politicas no storage.objects para o bucket 'materiais'
drop policy if exists "materiais_leitura_publica" on storage.objects;
create policy "materiais_leitura_publica"
  on storage.objects for select
  using (bucket_id = 'materiais');

drop policy if exists "materiais_insert_auth" on storage.objects;
create policy "materiais_insert_auth"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais');

drop policy if exists "materiais_update_auth" on storage.objects;
create policy "materiais_update_auth"
  on storage.objects for update to authenticated
  using (bucket_id = 'materiais')
  with check (bucket_id = 'materiais');

drop policy if exists "materiais_delete_auth" on storage.objects;
create policy "materiais_delete_auth"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materiais');
