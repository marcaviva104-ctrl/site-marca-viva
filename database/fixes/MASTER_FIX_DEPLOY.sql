-- ==============================================================================
-- 🚀 MASTER FIX DEPLOY - SCRIPT DE CORREÇÃO TOTAL
-- ==============================================================================
-- Este script reúne todas as correções necessárias para o site funcionar em Produção.
-- Execute este arquivo NÚNICO no Supabase SQL Editor.

-- ==============================================================================
-- PARTE 1: CORREÇÃO DE PEDIDOS (ORDERS)
-- ==============================================================================
-- Permite que clientes façam pedidos (mesmo sem conta, guest checkout)
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
DROP POLICY IF EXISTS "Enable insert for all (Guest Checkout)" ON orders;

CREATE POLICY "Enable insert for all (Guest Checkout)" 
ON orders 
FOR INSERT 
WITH CHECK (true);

-- Permite que usuários vejam seus próprios pedidos
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" 
ON orders FOR SELECT 
USING (auth.uid() = user_id OR user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003'));

-- ==============================================================================
-- PARTE 2: CORREÇÃO DE PERFIS (PROFILES) - ERRO DE RECURSÃO
-- ==============================================================================
-- Limpa políticas antigas que travavam o admin
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Allow update for owners" ON profiles;
DROP POLICY IF EXISTS "Allow insert for owners" ON profiles;

-- Políticas simplificadas
CREATE POLICY "Allow read access for authenticated users"
ON profiles FOR SELECT
TO authenticated
USING ( true );

CREATE POLICY "Allow update for owners"
ON profiles FOR UPDATE
TO authenticated
USING ( auth.uid() = id );

CREATE POLICY "Allow insert for owners"
ON profiles FOR INSERT
TO authenticated
WITH CHECK ( auth.uid() = id );

-- ==============================================================================
-- PARTE 3: GARANTIR VISIBILIDADE DE PRODUTOS E CATEGORIAS
-- ==============================================================================
DROP POLICY IF EXISTS "Allow public read access" ON categories;
CREATE POLICY "Allow public read access"
ON categories FOR SELECT
TO public
USING ( true );

DROP POLICY IF EXISTS "Allow public read access" ON products;
CREATE POLICY "Allow public read access"
ON products FOR SELECT
TO public
USING ( true );

-- ==============================================================================
-- FIM - CONFIRMAÇÃO
-- ==============================================================================
SELECT '✅ SUCESSO: Banco de dados corrigido e pronto para uso!' as status;
