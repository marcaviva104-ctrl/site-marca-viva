-- Adicionar coluna Subcategoria se não existir
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory);
