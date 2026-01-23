-- Migration: Add Shipping Dimensions to Products
-- Adds weight and dimensions for freight calculation

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 0.3, -- kg
ADD COLUMN IF NOT EXISTS height numeric DEFAULT 10,   -- cm
ADD COLUMN IF NOT EXISTS width numeric DEFAULT 10,    -- cm
ADD COLUMN IF NOT EXISTS length numeric DEFAULT 15;   -- cm

-- Comment: Default values are tiny generic box sizes to avoid errors in legacy products.
