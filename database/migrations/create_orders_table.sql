-- ========================================
-- TABELA DE PEDIDOS (ORDERS)
-- ========================================

-- 1. Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Identificação do pedido
    order_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, processing, shipped, delivered, cancelled
    
    -- Produtos (JSON com array de items)
    items JSONB NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Endereço de entrega
    shipping_address JSONB NOT NULL,
    shipping_method TEXT,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    shipping_deadline INTEGER, -- dias úteis
    
    -- Pagamento
    payment_method TEXT NOT NULL, -- pix, credit_card, boleto
    payment_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, refunded
    payment_data JSONB, -- dados específicos do método (ex: PIX code, transaction ID)
    
    -- Totais
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    
    -- Notas
    customer_notes TEXT,
    admin_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 3. Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso

-- Usuários podem ver seus próprios pedidos
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" 
    ON orders FOR SELECT 
    USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios pedidos
DROP POLICY IF EXISTS "Users can create own orders" ON orders;
CREATE POLICY "Users can create own orders" 
    ON orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os pedidos
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" 
    ON orders FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Admins podem atualizar pedidos
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" 
    ON orders FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- 5. Função para gerar número de pedido único
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Formato: MV-YYYYMMDD-XXXXX
        new_number := 'MV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
        
        -- Verifica se já existe
        SELECT COUNT(*) INTO exists_check FROM orders WHERE order_number = new_number;
        
        EXIT WHEN exists_check = 0;
    END LOOP;
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para gerar número do pedido automaticamente
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- 7. Verificar criação
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'orders';
