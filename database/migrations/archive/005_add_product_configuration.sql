-- =============================================
-- Migration: Add Product Configuration Rules (JSONB)
-- Purpose: Enable "Enterprise" Configurable Products
-- =============================================

-- 1. Add column to store configuration rules (e.g., Option Groups, Price Modifiers)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS configuration_rules JSONB DEFAULT '[]'::jsonb;

-- 2. Comment on column for clarity
COMMENT ON COLUMN products.configuration_rules IS 'Stores dynamic product options (e.g., Size, Color, Material) and their price modifiers.';

-- Example Structure:
/*
[
  {
    "id": "uuid",
    "name": "Tipo de Capa",
    "type": "radio", 
    "required": true,
    "options": [
       { "label": "Mole", "price_mod": 0 },
       { "label": "Dura", "price_mod": 10.50 }
    ]
  }
]
*/
