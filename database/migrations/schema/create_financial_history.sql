-- Create Financial History Table
CREATE TABLE IF NOT EXISTS public.financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL, -- 'create', 'payment', 'delete', 'update'
    entity_type TEXT NOT NULL, -- 'manual_debt', 'order'
    entity_id TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID REFERENCES auth.users(id), -- Optional if we want to track user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.financial_history ENABLE ROW LEVEL SECURITY;

-- Allow Admins to View/Insert
CREATE POLICY "Admins can do everything on financial_history"
ON public.financial_history
FOR ALL
USING (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- Allow public read (for dev ease if needed, or stick to admin only)
CREATE POLICY "Public read financial_history"
ON public.financial_history FOR SELECT
USING (true);
