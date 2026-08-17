-- Campos extras pra "Nova Despesa" virar um registro de compra de verdade:
-- fornecedor, forma de pagamento específica, observações e anexo do comprovante.
-- "Fonte" (exp-source, Conta/Caixa) existia no HTML mas nunca era lido em
-- admin.js -- payment_method substitui esse campo morto por um de verdade.
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS supplier TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Bucket para anexar comprovante/nota fiscal da despesa. Mesmo padrão já usado
-- pelo bucket 'products' (database/migrations/schema/create_bucket.sql):
-- público simples, sem autenticação real de admin nesse painel.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

drop policy if exists "Receipts Public Access" on storage.objects;
create policy "Receipts Public Access"
  on storage.objects for select
  using ( bucket_id = 'receipts' );

drop policy if exists "Receipts Admin Upload" on storage.objects;
create policy "Receipts Admin Upload"
  on storage.objects for insert
  with check ( bucket_id = 'receipts' );

drop policy if exists "Receipts Admin Delete" on storage.objects;
create policy "Receipts Admin Delete"
  on storage.objects for delete
  using ( bucket_id = 'receipts' );
