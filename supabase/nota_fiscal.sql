-- Nota fiscal anexada ao pedido. Rode UMA vez no SQL Editor do Supabase.
-- Enquanto este script não rodar, o app não exige NF para marcar como entregue.

alter table pedidos
  add column if not exists nf_path text,          -- caminho do arquivo no Storage
  add column if not exists nf_nome text,          -- nome original do arquivo
  add column if not exists nf_tipo text,          -- application/pdf, image/jpeg...
  add column if not exists nf_anexada_em timestamptz,
  add column if not exists nf_numero text;        -- número da NF (para o financeiro achar o pedido)

-- Pasta (bucket) privada para as notas: PDF ou foto, até 10 MB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notas-fiscais', 'notas-fiscais', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Mesma abertura do resto do app (ele usa a chave pública): enviar, ver e apagar
drop policy if exists "notas-fiscais ver" on storage.objects;
create policy "notas-fiscais ver" on storage.objects
  for select to anon, authenticated using (bucket_id = 'notas-fiscais');

drop policy if exists "notas-fiscais enviar" on storage.objects;
create policy "notas-fiscais enviar" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'notas-fiscais');

drop policy if exists "notas-fiscais apagar" on storage.objects;
create policy "notas-fiscais apagar" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'notas-fiscais');
