-- FIX ALL DATABASE SCHEMA ISSUES
-- Run this in Supabase SQL Editor to fix Product Creation and Expense Tracking

-- 1. Fix Product Creation (Missing 'recipe' column)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS recipe JSONB DEFAULT '[]';

-- 2. Fix Expense Tracking (Missing 'type' and 'category' columns)
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'income';

ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 3. Cleanup: Set defaults for existing records
UPDATE public.financial_records 
SET type = 'income' 
WHERE type IS NULL;

-- 4. Create Financial History Table (if missing)
CREATE TABLE IF NOT EXISTS public.financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'
    entity_type VARCHAR(50) NOT NULL, -- 'expense', 'manual_debt', 'order'
    entity_id VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- End of Fixes
