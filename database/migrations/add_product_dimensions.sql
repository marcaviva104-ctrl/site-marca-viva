-- Adicionar Dimensões e Peso aos Produtos
-- Execute este SQL no Supabase Dashboard: SQL Editor

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS width NUMERIC DEFAULT 20,
ADD COLUMN IF NOT EXISTS length NUMERIC DEFAULT 30;

-- Comentários para documentação
COMMENT ON COLUMN products.weight IS 'Peso do produto em kg (exemplo: 0.5 = 500g)';
COMMENT ON COLUMN products.height IS 'Altura do produto em cm';
COMMENT ON COLUMN products.width IS 'Largura do produto em cm';
COMMENT ON COLUMN products.length IS 'Comprimento do produto em cm';
