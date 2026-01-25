-- ========================================
-- CONFIGURAR DIMENSÕES DOS PRODUTOS
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- PASSO 1: Ver produtos atuais e suas dimensões
SELECT id, name, category, weight, height, width, length 
FROM products 
ORDER BY category, name
LIMIT 50;

-- ========================================
-- PASSO 2: Atualizar dimensões por categoria
-- Ajuste os valores conforme necessário!
-- ========================================

-- ROUPAS (Camisetas, Blusas, Vestidos)
UPDATE products 
SET 
  weight = 0.3,   -- 300g
  height = 5,     -- 5cm (dobrado)
  width = 25,     -- 25cm
  length = 30     -- 30cm
WHERE category ILIKE '%roupa%' 
   OR category ILIKE '%camiseta%'
   OR category ILIKE '%blusa%'
   OR category ILIKE '%vestido%';

-- CALÇAS / JEANS
UPDATE products 
SET 
  weight = 0.5,   -- 500g
  height = 8,     -- 8cm (dobrado)
  width = 28,     -- 28cm
  length = 35     -- 35cm
WHERE category ILIKE '%calça%' 
   OR category ILIKE '%jeans%'
   OR category ILIKE '%short%';

-- SAPATOS / CALÇADOS
UPDATE products 
SET 
  weight = 0.8,   -- 800g
  height = 12,    -- 12cm
  width = 28,     -- 28cm
  length = 35     -- 35cm (caixa de sapato)
WHERE category ILIKE '%sapato%' 
   OR category ILIKE '%calçado%'
   OR category ILIKE '%tênis%'
   OR category ILIKE '%sandália%';

-- ACESSÓRIOS PEQUENOS (Bijuterias, Relógios)
UPDATE products 
SET 
  weight = 0.1,   -- 100g
  height = 3,     -- 3cm
  width = 10,     -- 10cm
  length = 15     -- 15cm
WHERE category ILIKE '%acessório%' 
   OR category ILIKE '%bijuteria%'
   OR category ILIKE '%relógio%'
   OR category ILIKE '%joia%';

-- BOLSAS / MOCHILAS
UPDATE products 
SET 
  weight = 0.6,   -- 600g
  height = 15,    -- 15cm
  width = 30,     -- 30cm
  length = 40     -- 40cm
WHERE category ILIKE '%bolsa%' 
   OR category ILIKE '%mochila%'
   OR category ILIKE '%carteira%';

-- LIVROS
UPDATE products 
SET 
  weight = 0.4,   -- 400g
  height = 3,     -- 3cm
  width = 15,     -- 15cm
  length = 21     -- 21cm
WHERE category ILIKE '%livro%';

-- ELETRÔNICOS PEQUENOS
UPDATE products 
SET 
  weight = 0.5,   -- 500g
  height = 8,     -- 8cm
  width = 15,     -- 15cm
  length = 20     -- 20cm
WHERE category ILIKE '%eletrônico%' 
   OR category ILIKE '%celular%'
   OR category ILIKE '%fone%';

-- ========================================
-- PASSO 3: Atualizar produtos específicos
-- (Se precisar ajustar produtos individuais)
-- ========================================

-- Exemplo: Atualizar um produto específico pelo nome
-- UPDATE products 
-- SET weight = 1.2, height = 20, width = 30, length = 40
-- WHERE name = 'Nome Exato do Produto';

-- ========================================
-- PASSO 4: Verificar resultado
-- ========================================

-- Ver todos os produtos com dimensões atualizadas
SELECT 
  name,
  category,
  weight || 'kg' as peso,
  height || '×' || width || '×' || length || 'cm' as dimensoes
FROM products 
ORDER BY category, name;

-- Ver produtos que ainda NÃO têm dimensões
SELECT id, name, category
FROM products 
WHERE weight IS NULL OR height IS NULL
ORDER BY category;

-- ========================================
-- DICAS:
-- ========================================
-- • Peso em KG (ex: 0.5 = 500g)
-- • Dimensões em CM
-- • Altura = espessura do pacote
-- • Comprimento = lado maior
-- • Largura = lado médio

-- ========================================
-- VALORES PADRÃO SE NÃO CONFIGURAR:
-- ========================================
-- weight = 0.5kg (500g)
-- height = 10cm
-- width = 20cm  
-- length = 30cm
