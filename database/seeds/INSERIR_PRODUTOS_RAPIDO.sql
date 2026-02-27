-- ================================================
-- INSERIR PRODUTOS DE TESTE - VERSÃO CORRIGIDA
-- FUNCIONA COM SUA ESTRUTURA ATUAL DO SUPABASE
-- ================================================

-- 1. BLUSA DE POLIÉSTER (seu produto)
INSERT INTO products (
    id, name, category, price, description, image, status, stock, cost, min_qty, weight, height, width, length, recipe
) VALUES (
    'PROD-BLUSA-POLI-001', 
    'Blusa de Poliéster', 
    'Vestuário', 
    38.00,
    'Blusa confeccionada em poliéster 100% de alta qualidade. Confortável, durável e ideal para personalização.',
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    'active', 
    100,
    15.00,
    1,
    0.20,
    0.5,
    25,
    30,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET price = 38.00, stock = 100, status = 'active';

-- 2. CANETA METAL
INSERT INTO products (
    id, name, category, price, description, image, status, stock, cost, min_qty, weight, height, width, length, recipe
) VALUES (
    'PROD-CANETA-001',
    'Caneta Metal Executive',
    'Canetas',
    22.00,
    'Caneta corpo alumínio, grip emborrachado, estojo. Gravação laser.',
    'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&q=80',
    'active',
    200,
    8.00,
    10,
    0.05,
    0.5,
    1,
    15,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET price = 22.00, stock = 200, status = 'active';

-- 3. CADERNO A5
INSERT INTO products (
    id, name, category, price, description, image, status, stock, cost, min_qty, weight, height, width, length, recipe
) VALUES (
    'PROD-CADERNO-001',
    'Caderno Capa Dura A5',
    'Cadernos',
    25.00,
    'Caderno executivo capa dura A5, 100 folhas, elástico. Personalização capa.',
    'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80',
    'active',
    150,
    10.00,
    5,
    0.30,
    1.5,
    15,
    21,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET price = 25.00, stock = 150, status = 'active';

-- 4. ECOBAG
INSERT INTO products (
    id, name, category, price, description, image, status, stock, cost, min_qty, weight, height, width, length, recipe
) VALUES (
    'PROD-ECOBAG-001',
    'Ecobag Sacola Algodão',
    'Bolsas',
    12.00,
    'Ecobag algodão cru 40x35cm, alças reforçadas. Serigrafia 1 cor.',
    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
    'active',
    300,
    5.00,
    20,
    0.15,
    0.5,
    35,
    40,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET price = 12.00, stock = 300, status = 'active';

-- 5. COPO TÉRMICO
INSERT INTO products (
    id, name, category, price, description, image, status, stock, cost, min_qty, weight, height, width, length, recipe
) VALUES (
    'PROD-COPO-001',
    'Copo Térmico Inox 450ml',
    'Copos e Garrafas',
    45.00,
    'Copo térmico inox 450ml, tampa rosqueável. Mantém temperatura 6h.',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
    'active',
    100,
    18.00,
    10,
    0.40,
    2.0,
    8,
    20,
    '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET price = 45.00, stock = 100, status = 'active';

-- VERIFICAR PRODUTOS INSERIDOS
SELECT '✅ PRODUTOS INSERIDOS COM SUCESSO!' as status;
SELECT id, name, price, stock, category FROM products WHERE id LIKE 'PROD-%' ORDER BY price;
