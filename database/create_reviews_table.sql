-- Tabela de Avaliações de Produtos - VERSÃO RECRIAÇÃO
-- Execute este SQL no Supabase SQL Editor

-- REMOVER TUDO (se já existe)
DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON product_reviews;
DROP POLICY IF EXISTS "Qualquer um pode ler avaliações" ON product_reviews;
DROP POLICY IF EXISTS "Usuários autenticados podem criar avaliações" ON product_reviews;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias avaliações" ON product_reviews;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias avaliações" ON product_reviews;
DROP TABLE IF EXISTS product_reviews CASCADE;

-- CRIAR TABELA
CREATE TABLE product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler avaliações
CREATE POLICY "Qualquer um pode ler avaliações"
ON product_reviews FOR SELECT
USING (true);

-- Policy: Apenas usuários autenticados podem criar avaliações
CREATE POLICY "Usuários autenticados podem criar avaliações"
ON product_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários só podem atualizar suas próprias avaliações
CREATE POLICY "Usuários podem atualizar suas próprias avaliações"
ON product_reviews FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários só podem deletar suas próprias avaliações
CREATE POLICY "Usuários podem deletar suas próprias avaliações"
ON product_reviews FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_reviews_updated_at
    BEFORE UPDATE ON product_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Inserir avaliações de exemplo
INSERT INTO product_reviews (product_id, user_id, user_name, rating, comment, verified) VALUES
('MV-ECR001', '00000000-0000-0000-0000-000000000001', 'Dimas Galdino da Silva', 5, 'Muito bem elaboradas as canetas, trabalho eficiente e entrega rápida. Recomendo a todos.', true),
('MV-ECR001', '00000000-0000-0000-0000-000000000002', 'Fabia Caroline Ferraz Monteiro', 5, 'Trabalho de muita qualidade!', true),
('MV-PAP001', '00000000-0000-0000-0000-000000000003', 'Elaine Venturino', 4, 'Atendimento com muita atenção, paciência e cuidado. Entrega antes do prazo. Produto de muita qualidade!', true),
('MV-PAP001', '00000000-0000-0000-0000-000000000004', 'Carlos Mendes', 5, 'Cadernos de excelente qualidade, perfeitos para presentear nossos clientes!', true),
('MV-TEC001', '00000000-0000-0000-0000-000000000005', 'Fernanda Silva', 5, 'Power banks de ótima qualidade, carregam rápido e a personalização ficou impecável!', true),
('MV-KIT001', '00000000-0000-0000-0000-000000000006', 'Ricardo Santos', 5, 'O kit ficou perfeito! Nossos novos colaboradores adoraram.', true);

-- Query de teste
SELECT 
    product_id,
    user_name,
    rating,
    comment,
    verified,
    created_at
FROM product_reviews
ORDER BY created_at DESC;
