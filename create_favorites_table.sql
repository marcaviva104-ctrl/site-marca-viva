-- ========================================
-- TABELA DE FAVORITOS (WISHLIST)
-- ========================================

-- 1. Criar tabela de favoritos de usuários
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Evitar duplicatas
    UNIQUE(user_id, product_id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON user_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Acesso

-- Usuários podem ver apenas seus próprios favoritos
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
CREATE POLICY "Users can view own favorites" 
    ON user_favorites FOR SELECT 
    USING (auth.uid() = user_id);

-- Usuários podem adicionar seus próprios favoritos
DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
CREATE POLICY "Users can insert own favorites" 
    ON user_favorites FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Usuários podem deletar seus próprios favoritos
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
CREATE POLICY "Users can delete own favorites" 
    ON user_favorites FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Verificar criação
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'user_favorites';

-- 6. Contar favoritos (teste)
SELECT COUNT(*) as total_favorites FROM user_favorites;
