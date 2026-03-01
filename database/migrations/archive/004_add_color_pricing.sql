-- Migration: Add Variable Pricing for Color Printing
-- Description: Adds variable_price_color and variable_price_heavy_color columns
-- Author: Antigravity

-- 1. Add Columns if they don't exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS variable_price_color numeric DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS variable_price_heavy_color numeric DEFAULT 1.00;

-- 2. Update Comments
COMMENT ON COLUMN products.variable_price_color IS 'Price per standard page (Color)';
COMMENT ON COLUMN products.variable_price_heavy_color IS 'Price per heavy ink/coverage page (Color)';

-- 3. Update Existing "Apostila" Product (PROD-APOSTILA-001)
-- Setting specific prices for the Apostila
UPDATE products
SET 
    variable_price_color = 0.50,
    variable_price_heavy_color = 1.00
WHERE id = 'PROD-APOSTILA-001';

-- Verify
SELECT id, name, variable_price, variable_price_heavy, variable_price_color, variable_price_heavy_color 
FROM products 
WHERE id = 'PROD-APOSTILA-001';
