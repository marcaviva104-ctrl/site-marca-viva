-- Add 'type' and 'category' to financial_records for Expense Tracking

-- 1. Add 'type' column (income/expense)
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'income';

-- 2. Add 'category' column (e.g., 'Logística', 'Fornecedor')
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 3. Update existing records to be 'income' (safe default)
UPDATE public.financial_records 
SET type = 'income' 
WHERE type IS NULL;

-- 4. Create Policy for Admin Write Access (Re-affirm just in case)
-- (Assuming existing RLS covers INSERT/UPDATE for authenticated admins)
