-- Migration: Configure Apostila Product
-- Description: Inserts or updates the 'Apostila' product with variable pricing settings (2 Tiers).

-- 1. Ensure the product exists or update it
INSERT INTO products (
    id, 
    name, 
    category, 
    price, 
    description, 
    image, 
    status, 
    stock, 
    pricing_type, 
    base_price,        -- Custo da Capa / Encadernação
    variable_price,    -- Custo por Página Padrão (<50%)
    variable_price_heavy -- Custo por Página Chapada (>50%)
) VALUES (
    'PROD-APOSTILA-001',
    'Apostila Personalizada',
    'Serviços',
    3.00, -- Preço de vitrine (mínimo ou base)
    'Impressão de apostilas sob demanda. Envie seu PDF para cálculo automático.',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600&q=80', -- Placeholder image
    'active',
    99999, -- Estoque infinito
    'variable',
    3.00,  -- Valor da Capa/Encadernação
    0.10,  -- < 50% Cobertura
    0.25   -- > 50% Cobertura
)
ON CONFLICT (id) DO UPDATE SET 
    pricing_type = 'variable',
    base_price = 3.00,
    variable_price = 0.10,
    variable_price_heavy = 0.25,
    status = 'active';

-- 2. Verify Result
SELECT id, name, pricing_type, base_price, variable_price, variable_price_heavy
FROM products 
WHERE id = 'PROD-APOSTILA-001';
