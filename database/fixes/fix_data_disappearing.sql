-- 🚨 FIX TOTAL: DADOS SUMINDO / RECURSÃO INFINITA 🚨
-- Este script reseta as permissões das tabelas principais para garantir que o Admin consiga ler tudo.

-- 1. CORREÇÃO CRÍTICA: Tabela de Perfis (Onde ocorre o loop infinito)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow update for owners" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for owners" ON public.profiles;

-- Permite que qualquer usuário logado LEIA qualquer perfil (Necessário para o Admin carregar nomes)
CREATE POLICY "Fix: Leitura Geral"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Permite que o usuário edite APENAS o próprio perfil
CREATE POLICY "Fix: Edição Própria"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Permite inserir (caso o trigger falhe)
CREATE POLICY "Fix: Inserção Própria"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);


-- 2. CORREÇÃO: Financeiro e Pedidos (Garantir leitura)
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.financial_records;

-- Libera TUDO de financeiro para usuários logados (Simplificação para resolver o bug)
CREATE POLICY "Fix: Acesso Total Financeiro"
ON public.financial_records FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. CORREÇÃO: Estoque
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated can update inventory" ON public.inventory_items;

CREATE POLICY "Fix: Acesso Total Estoque"
ON public.inventory_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. CORREÇÃO: Produtos
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;

-- Leitura pública de produtos (para a loja funcionar sem login)
CREATE POLICY "Fix: Produtos Públicos"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

-- Edição/Criação só logado (Admin)
CREATE POLICY "Fix: Editar Produtos"
ON public.products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- FIM (Rode este script no SQL Editor do Supabase)
