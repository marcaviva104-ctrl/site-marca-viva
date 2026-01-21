-- ================================================
-- COUPONS SYSTEM - Marca Viva
-- ================================================
-- Sistema de cupons de desconto promocionais
-- ================================================

-- 1. Criar tabela de cupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Tipo de desconto
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value DECIMAL(10, 2), -- Percentual (ex: 10.00 = 10%) ou Valor fixo (ex: 50.00 = R$ 50)
    
    -- Limites
    min_purchase_value DECIMAL(10, 2) DEFAULT 0, -- Valor mínimo de compra
    max_discount_value DECIMAL(10, 2), -- Desconto máximo (para percentuais)
    usage_limit INTEGER, -- Limite total de usos (null = ilimitado)
    usage_count INTEGER DEFAULT 0, -- Contador de usos
    usage_limit_per_user INTEGER DEFAULT 1, -- Limite por usuário
    
    -- Validade
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadados
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de uso de cupons (histórico)
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    order_id UUID, -- Referência ao pedido
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_until ON coupons(valid_until);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);

-- 4. Enable RLS
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - Coupons

-- Qualquer pessoa autenticada pode ver cupons ativos
CREATE POLICY "Usuários podem ver cupons ativos" 
ON coupons 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Apenas admins podem criar/editar/deletar cupons
CREATE POLICY "Apenas admin gerencia cupons" 
ON coupons 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 6. Políticas RLS - Coupon Usage

-- Usuários podem ver seu próprio histórico
CREATE POLICY "Usuários veem próprio histórico" 
ON coupon_usage 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Sistema pode inserir uso de cupom
CREATE POLICY "Sistema registra uso" 
ON coupon_usage 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Apenas admins veem todo histórico
CREATE POLICY "Admin vê todo histórico" 
ON coupon_usage 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 7. Função para validar cupom
CREATE OR REPLACE FUNCTION validate_coupon(
    p_code TEXT,
    p_user_id UUID,
    p_order_value DECIMAL
)
RETURNS JSON AS $$
DECLARE
    v_coupon RECORD;
    v_usage_count INTEGER;
    v_result JSON;
BEGIN
    -- Buscar cupom
    SELECT * INTO v_coupon
    FROM coupons
    WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true;
    
    -- Cupom não existe
    IF NOT FOUND THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Cupom inválido ou inexistente'
        );
    END IF;
    
    -- Verificar validade
    IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Cupom expirado'
        );
    END IF;
    
    IF v_coupon.valid_from > NOW() THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Cupom ainda não está válido'
        );
    END IF;
    
    -- Verificar valor mínimo
    IF p_order_value < v_coupon.min_purchase_value THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Valor mínimo de compra: R$ ' || v_coupon.min_purchase_value
        );
    END IF;
    
    -- Verificar limite total de usos
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Cupom esgotado'
        );
    END IF;
    
    -- Verificar limite por usuário
    SELECT COUNT(*) INTO v_usage_count
    FROM coupon_usage
    WHERE coupon_id = v_coupon.id
    AND user_id = p_user_id;
    
    IF v_usage_count >= v_coupon.usage_limit_per_user THEN
        RETURN json_build_object(
            'valid', false,
            'message', 'Você já utilizou este cupom o máximo de vezes permitido'
        );
    END IF;
    
    -- Cupom válido!
    RETURN json_build_object(
        'valid', true,
        'coupon', row_to_json(v_coupon)
    );
    
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_coupons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_coupons_updated_at();

-- 9. Inserir cupons de exemplo
INSERT INTO coupons (code, description, discount_type, discount_value, min_purchase_value, valid_until, usage_limit)
VALUES 
    ('BEMVINDO10', 'Desconto de 10% para novos clientes', 'percentage', 10.00, 50.00, NOW() + INTERVAL '30 days', NULL),
    ('FRETEGRATIS', 'Frete grátis em compras acima de R$ 100', 'free_shipping', 0, 100.00, NOW() + INTERVAL '60 days', 100),
    ('PRIMEIRA50', 'R$ 50 de desconto na primeira compra', 'fixed', 50.00, 150.00, NOW() + INTERVAL '90 days', NULL)
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- VERIFICAÇÃO
-- ================================================
SELECT * FROM coupons ORDER BY created_at DESC;
