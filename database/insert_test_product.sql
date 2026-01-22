-- ================================================
-- PRODUTO DE TESTE BARATO PARA TESTAR FLUXO
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- Inserir produto de teste de R$ 2,00
INSERT INTO products (
    id,
    name,
    description,
    category,
    price,
    cost,
    min_qty,
    stock,
    status,
    image,
    weight,
    height,
    width,
    length,
    recipe,
    created_at,
    updated_at
) VALUES (
    'TEST-ADESIVO-001',
    'Adesivo Teste - R$ 2,00',
    'Produto de teste para validar fluxo completo de compra. Adesivo pequeno personalizado.',
    'Adesivos',
    2.00,
    0.50,
    1,
    100,
    'active',
    'https://images.unsplash.com/photo-1572375927902-1c09ec8bb596?w=500&q=80',
    0.01,
    0.1,
    5,
    5,
    '[]'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    price = 2.00,
    stock = 100,
    status = 'active',
    updated_at = NOW();

-- Verificar se foi inserido
SELECT id, name, price, stock, status FROM products WHERE id = 'TEST-ADESIVO-001';
