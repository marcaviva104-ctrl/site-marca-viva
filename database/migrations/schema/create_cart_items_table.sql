-- ========================================
-- TABELA DE CARRINHO (SINCRONIZAÇÃO ENTRE DISPOSITIVOS)
-- ========================================
-- Uma linha por item de carrinho (não um blob JSON por usuário), permitindo
-- upsert/delete parcial por item ao sincronizar com o localStorage do cliente.
-- localStorage continua sendo a fonte offline-first; esta tabela é o backup/sync
-- na nuvem usado por scripts/components/cart.js (pushToCloud/pullAndMerge).

-- 1. Criar tabela de itens de carrinho
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    line_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    name TEXT,
    image TEXT,
    price NUMERIC,
    qty INTEGER NOT NULL DEFAULT 1,
    customization TEXT,
    configuration JSONB,
    file_url TEXT,
    file_name TEXT,
    added_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Evitar duplicatas do mesmo item de carrinho por usuário
    UNIQUE(user_id, line_id)
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso (mesmo padrão de user_favorites)

DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;
CREATE POLICY "Users can view own cart items"
    ON cart_items FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
CREATE POLICY "Users can insert own cart items"
    ON cart_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
CREATE POLICY "Users can update own cart items"
    ON cart_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;
CREATE POLICY "Users can delete own cart items"
    ON cart_items FOR DELETE
    USING (auth.uid() = user_id);

-- 5. Verificar criação
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'cart_items';
