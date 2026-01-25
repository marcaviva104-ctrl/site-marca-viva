-- Derrubar tabela antiga se existir (para recriar certo)
DROP TABLE IF EXISTS product_tiers;

-- Criar tabela com product_id como TEXT (Compatível com seus IDs 'MV-XXXX')
CREATE TABLE product_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_product_tiers_product ON product_tiers(product_id);

-- Segurança
ALTER TABLE product_tiers ENABLE ROW LEVEL SECURITY;

-- Liberar acesso
CREATE POLICY "Enable all" ON product_tiers FOR ALL USING (true) WITH CHECK (true);
