-- Script SQL para Desabilitar RLS e Permitir Leitura Pública

-- =========================================
-- DESABILITAR ROW LEVEL SECURITY (RLS)
-- =========================================
-- Execute este SQL no Supabase SQL Editor para permitir que o admin leia os dados

-- Produtos
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Tiers de Preço
ALTER TABLE product_tiers DISABLE ROW LEVEL SECURITY;

-- Protocolos/Pedidos
ALTER TABLE protocols DISABLE ROW LEVEL SECURITY;

-- Itens dos Protocolos
ALTER TABLE protocol_items DISABLE ROW LEVEL SECURITY;

-- Histórico
ALTER TABLE protocol_history DISABLE ROW LEVEL SECURITY;

-- Colunas do Kanban
ALTER TABLE kanban_columns DISABLE ROW LEVEL SECURITY;

-- Perfis de Usuário
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- =========================================
-- MENSAGEM DE SUCESSO
-- =========================================
SELECT '✅ RLS desabilitado em todas as tabelas!' as status;
SELECT '🔓 Admin agora pode ler todos os dados' as info;
