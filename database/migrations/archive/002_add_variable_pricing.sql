-- Migration: Add Variable Pricing Columns
-- Description: Adds support for fixed/variable pricing models (e.g., Apostilas).

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS pricing_type text DEFAULT 'fixed' CHECK (pricing_type IN ('fixed', 'variable')),
ADD COLUMN IF NOT EXISTS base_price numeric(10,2) DEFAULT 0.00, -- Custo Fixo (ex: Encadernação)
ADD COLUMN IF NOT EXISTS variable_price numeric(10,2) DEFAULT 0.00, -- Custo por Página (Padrão)
ADD COLUMN IF NOT EXISTS variable_price_heavy numeric(10,2) DEFAULT 0.00; -- Custo por Página (Chapado > 50%)

-- Update Logic:
-- Existing products rely on 'price' column. 
-- 'variable' products will use 'price' as a fallback or display price, 
-- but actual calculation will use base_price + (qty * variable_price) + (heavy_qty * variable_price_heavy).
