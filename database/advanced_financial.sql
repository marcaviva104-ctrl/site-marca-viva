-- MASTER MIGRATION: ADVANCED FINANCIAL SUITE
-- Runs all necessary fixes and adds new features (Goals, Installments)

-- 1. BASIC FIXES (Ensures previous features work)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS recipe JSONB DEFAULT '[]';

ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'income';

ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 2. FINANCIAL GOALS (For 'Cofrinho')
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          -- e.g., 'Nova Máquina'
    target_amount DECIMAL(10,2) NOT NULL, -- e.g., 5000.00
    current_amount DECIMAL(10,2) DEFAULT 0,
    allocation_percentage DECIMAL(5,2) DEFAULT 5.0, -- % of profit to auto-allocate
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. INSTALLMENTS (For 'Gestão de Parcelas')
-- Adds support for linking multiple expense records together
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS installment_number INT DEFAULT 1; -- 1/12

ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS installments_total INT DEFAULT 1; -- 12

ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS parent_group_id UUID; -- Common ID to link all 12 records

-- 4. VIP & MARGIN (Metadata columns, optional but good for filtering)
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS customer_rating VARCHAR(20); -- 'vip', 'standard', 'risk'

-- 5. RLS POLICIES (Safety Net)
-- Ensure public/anon can read/write for now (Development Mode)
-- In production, strict RLS is recommended.
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for anon" ON public.financial_goals FOR ALL USING (true) WITH CHECK (true);

