-- MIGRATION: ADVANCED FEATURES (Loyalty & Polish)

-- 1. LOYALTY PROGRAM
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.loyalty_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points INT NOT NULL, -- Positive for gain, negative for spend
    reason VARCHAR(255), -- 'Purchase #102', 'Manual Bonus'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ENSURE GOALS (Redundancy check)
CREATE TABLE IF NOT EXISTS public.financial_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    allocation_percentage DECIMAL(5,2) DEFAULT 5.0,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENSURE INSTALLMENTS
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS installment_number INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS installments_total INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_group_id UUID;

-- 4. RLS FOR LOYALTY
ALTER TABLE public.loyalty_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read loyalty" ON public.loyalty_history FOR SELECT USING (true);
CREATE POLICY "Admin write loyalty" ON public.loyalty_history FOR INSERT WITH CHECK (true); -- Simplify for dev
