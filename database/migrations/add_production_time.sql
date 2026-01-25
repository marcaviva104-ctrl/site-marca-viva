-- Adicionar campo de tempo de produção à tabela products
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar coluna tempo_producao (em horas por unidade)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tempo_producao DECIMAL(10,2) DEFAULT 1.0;

-- 2. Comentário explicativo
COMMENT ON COLUMN products.tempo_producao IS 'Tempo de produção em horas por unidade do produto';

-- 3. Exemplo: atualizar produtos existentes (ajuste conforme necessário)
-- UPDATE products SET tempo_producao = 2.5 WHERE id = 'MV-ECR001'; -- Kit VIP leva 2.5 horas por unidade

-- 4. Verificar alteração
SELECT id, name, tempo_producao FROM products LIMIT 5;
