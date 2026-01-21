-- ========================================
-- ADICIONAR PESO AOS PRODUTOS
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- 1. Adicionar coluna de peso (em kg)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3) DEFAULT 0.5;

-- 2. Comentário explicativo
COMMENT ON COLUMN products.weight IS 'Peso do produto em quilogramas (kg) - usado para cálculo de frete';

-- 3. Verificar se foi adicionado
SELECT 
    id, 
    name, 
    weight,
    price
FROM products 
LIMIT 5;

-- ========================================
-- EXEMPLOS DE ATUALIZAÇÃO MANUAL
-- ========================================

-- Exemplo 1: Caneta (leve)
-- UPDATE products SET weight = 0.015 WHERE name LIKE '%Caneta%';

-- Exemplo 2: Caderno (médio)
-- UPDATE products SET weight = 0.3 WHERE name LIKE '%Caderno%';

-- Exemplo 3: Camiseta (médio)
-- UPDATE products SET weight = 0.2 WHERE name LIKE '%Camiseta%';

-- Exemplo 4: Squeeze (pesado)
-- UPDATE products SET weight = 0.5 WHERE name LIKE '%Squeeze%';

-- ========================================
-- PRONTO!
-- ========================================
-- Agora o sistema calcula o peso total automaticamente:
-- Exemplo: 100 canetas × 0.015kg = 1.5kg total
-- Este peso é enviado para a API de frete
