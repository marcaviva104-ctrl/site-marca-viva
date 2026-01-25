-- =================================================================
-- ETAPA 3: CONFIGURAR DIMENSÕES DE FRETE
-- Execute este script no Supabase SQL Editor.
-- =================================================================

-- 1. Definir dimensões padrão para ROUPAS (300g)
UPDATE products 
SET weight = 0.3, height = 5, width = 25, length = 30 
WHERE category ILIKE '%roupa%' 
   OR category ILIKE '%camiseta%' 
   OR category ILIKE '%blusa%' 
   OR category ILIKE '%vestido%';

-- 2. Definir dimensões para CALÇAS/JEANS (500g)
UPDATE products 
SET weight = 0.5, height = 8, width = 28, length = 35 
WHERE category ILIKE '%calça%' 
   OR category ILIKE '%jeans%'
   OR category ILIKE '%short%';

-- 3. Definir dimensões para ACESSÓRIOS (100g)
UPDATE products 
SET weight = 0.1, height = 3, width = 10, length = 15 
WHERE category ILIKE '%acessório%' 
   OR category ILIKE '%bijuteria%'
   OR category ILIKE '%relógio%';

-- 4. Definir PADRÃO para tudo que sobrou (500g)
-- Isso evita erro de "peso inválido" no Melhor Envio
UPDATE products 
SET weight = 0.5, height = 10, width = 20, length = 30 
WHERE weight IS NULL;

-- FIM DA ETAPA 3
