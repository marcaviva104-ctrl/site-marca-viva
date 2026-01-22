-- Tabela de Faixas de Preço (Tiers)
CREATE TABLE IF NOT EXISTS product_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index para busca rápida por produto
CREATE INDEX IF NOT EXISTS idx_product_tiers_product_id ON product_tiers(product_id);

-- RLS Policies
ALTER TABLE product_tiers ENABLE ROW LEVEL SECURITY;

-- Todos podem ler (para exibir no site)
CREATE POLICY "Public Tiers Access" ON product_tiers
    FOR SELECT USING (true);

-- Apenas autenticados (admins) podem modificar
CREATE POLICY "Admin Manage Tiers" ON product_tiers
    FOR ALL USING (auth.role() = 'authenticated');

-- Garantir coluna de Custo na tabela de Produtos (para validação de segurança)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2) DEFAULT 0;

-- Comentário de Ajuda:
-- Rode este script no Editor SQL do Supabase para habilitar o sistema de descontos.
