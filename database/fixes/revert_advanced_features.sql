-- REVERT ADVANCED FINANCIAL FEATURES
-- Use this if you want to remove the "Pro" features but KEEP the basic fixes.

-- 1. DROP FEATURES
DROP TABLE IF EXISTS public.financial_goals;

-- 2. REMOVE COLUMNS from Financial Records
-- Note: We keep 'type' and 'category' because they are essential for the basic Expense module.
-- We only remove the complex installment/VIP logic.
ALTER TABLE public.financial_records DROP COLUMN IF EXISTS installment_number;
ALTER TABLE public.financial_records DROP COLUMN IF EXISTS installments_total;
ALTER TABLE public.financial_records DROP COLUMN IF EXISTS parent_group_id;
ALTER TABLE public.financial_records DROP COLUMN IF EXISTS customer_rating;

-- The system will return to "Basic Expense Tracking" mode.
