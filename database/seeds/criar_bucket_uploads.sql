-- ============================================
-- CRIAR BUCKET PARA UPLOADS DE CLIENTES
-- ============================================
-- Cole e rode isso na aba SQL Editor do seu Supabase

INSERT INTO storage.buckets (id, name, public) 
VALUES ('products', 'products', true) 
ON CONFLICT (id) DO NOTHING;

-- Permitir que qualquer pessoa faça upload na pasta client_uploads/
CREATE POLICY "Permitir uploads publicos para clientes" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'products' );

-- Permitir que qualquer pessoa LEIA os arquivos publicamente
CREATE POLICY "Permitir leitura publica" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'products' );
