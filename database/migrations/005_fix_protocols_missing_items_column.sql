-- 005_fix_protocols_missing_items_column.sql
-- Add the missing 'items' column that was causing the table rendering error.

ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Extra: just ensuring 'total_amount' exists as well in case it's missing
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) DEFAULT 0.00;
