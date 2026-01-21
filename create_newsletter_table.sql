-- ================================================
-- NEWSLETTER TABLE - Marca Viva
-- ================================================
-- Tabela para armazenar emails de newsletter
-- ================================================

-- 1. Criar tabela de newsletter
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    source TEXT DEFAULT 'website',
    confirmed BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status ON newsletter_subscribers(status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribed_at ON newsletter_subscribers(subscribed_at);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
-- Permitir que qualquer pessoa insira (subscribe)
CREATE POLICY "Qualquer pessoa pode se inscrever" 
ON newsletter_subscribers 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Apenas admins podem ler todos os emails
CREATE POLICY "Apenas admin pode ver subscribers" 
ON newsletter_subscribers 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- Apenas admins podem atualizar/deletar
CREATE POLICY "Apenas admin pode gerenciar subscribers" 
ON newsletter_subscribers 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

CREATE POLICY "Apenas admin pode deletar subscribers" 
ON newsletter_subscribers 
FOR DELETE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
    )
);

-- 5. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_newsletter_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS newsletter_updated_at ON newsletter_subscribers;
CREATE TRIGGER newsletter_updated_at
    BEFORE UPDATE ON newsletter_subscribers
    FOR EACH ROW
    EXECUTE FUNCTION update_newsletter_updated_at();

-- ================================================
-- VERIFICAÇÃO
-- ================================================
-- Verificar se a tabela foi criada
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'newsletter_subscribers'
ORDER BY ordinal_position;
