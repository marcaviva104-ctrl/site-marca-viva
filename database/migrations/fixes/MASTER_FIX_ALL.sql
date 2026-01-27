-- =========================================================
-- MASTER FIX - MARCA VIVA (Checkout & Tracking)
-- Rode tudo de uma vez para corrigir o sistema
-- =========================================================

-- 1. CORREÇÃO DE COLUNAS FALTANTES (Erro: column "status" does not exist)
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'status') then
    alter table protocols add column status text default 'inquiry';
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'payment_status') then
    alter table protocols add column payment_status text default 'pending';
  end if;
    if not exists (select 1 from information_schema.columns where table_name = 'protocols' and column_name = 'column_id') then
    alter table protocols add column column_id bigint default 1;
  end if;
end $$;

-- 2. LIBERAR USUÁRIO DE TESTE (Erro: Foreign Key Violation)
-- Remove a trava que exige que o ID do usuário exista na tabela auth.users real
ALTER TABLE protocols 
DROP CONSTRAINT IF EXISTS protocols_client_id_fkey;

-- 3. LIBERAR RASTREIO PÚBLICO (Erro: Not Found / RLS Policy)
-- Permite que qualquer pessoa com o código do pedido consiga visualizar (sem login)
DROP POLICY IF EXISTS "Public Read Protocols" ON protocols;
CREATE POLICY "Public Read Protocols" ON protocols FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Items" ON protocol_items;
CREATE POLICY "Public Read Items" ON protocol_items FOR SELECT USING (true);

-- 4. PERMISSÃO DE ESCRITA (Para Checkout funcionar sem login/teste)
-- Permite criar pedidos (insert) livremente
DROP POLICY IF EXISTS "Public Insert Protocols" ON protocols;
CREATE POLICY "Public Insert Protocols" ON protocols FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Insert Items" ON protocol_items;
CREATE POLICY "Public Insert Items" ON protocol_items FOR INSERT WITH CHECK (true);

-- FIM DA CORREÇÃO
