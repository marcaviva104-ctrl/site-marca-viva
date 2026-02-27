-- ================================================
-- PRODUTO: BLUSA DE POLIÉSTER - VERSÃO CORRIGIDA
-- Preço único: R$ 38,00 (sem descontos progressivos)
-- ================================================

-- Inserir produto de Blusa de Poliéster
INSERT INTO products (
    id, 
    name, 
    category, 
    price, 
    description, 
    image, 
    status, 
    stock,
    cost,
    min_qty,
    weight,
    height,
    width,
    length,
    recipe
)
VALUES (
    'PROD-BLUSA-POLI-001', 
    'Blusa de Poliéster', 
    'Vestuário', 
    38.00,
    'Blusa confeccionada em poliéster 100% de alta qualidade. Confortável, durável e ideal para personalização com silk screen ou bordado. Material respirável e de fácil manutenção.',
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
)
ON CONFLICT (id) DO UPDATE SET 
    price = 38.00, 
    stock = 100,
    status = 'active';

-- Verificar se foi inserido corretamente
SELECT '✅ Produto de Blusa de Poliéster criado com sucesso!' as status;
SELECT id, name, price, stock, category, status FROM products WHERE id = 'PROD-BLUSA-POLI-001';
