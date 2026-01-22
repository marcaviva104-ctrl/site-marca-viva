-- Create Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- 'percentage' or 'fixed'
    discount_value NUMERIC(10,2) NOT NULL,
    min_purchase NUMERIC(10,2) DEFAULT 0,
    max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
    uses_count INTEGER DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id)
);

-- Create Coupon Usage Tracking Table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    order_id UUID,
    user_email TEXT,
    discount_applied NUMERIC(10,2)
);

-- RLS Policies
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons" ON coupons
    FOR SELECT USING (is_active = true AND (expiry_date IS NULL OR expiry_date > now()));

CREATE POLICY "Admins can manage coupons" ON coupons
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Track coupon usage" ON coupon_usage
    FOR INSERT WITH CHECK (true);

CREATE POLICY "View usage" ON coupon_usage
    FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_active ON coupons(is_active, expiry_date);
