-- Create Financial Goals Table (Cofrinho)
CREATE TABLE IF NOT EXISTS financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    name TEXT NOT NULL,
    target_amount NUMERIC(10,2) NOT NULL,
    current_amount NUMERIC(10,2) DEFAULT 0,
    retention_rate INTEGER DEFAULT 5, -- Percentage (e.g., 5%)
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused'
    user_id UUID REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON financial_goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON financial_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON financial_goals
    FOR UPDATE USING (auth.uid() = user_id);
