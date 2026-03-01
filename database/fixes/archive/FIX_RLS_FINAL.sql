-- 🚨 SCRIPT DE CORREÇÃO DEFINITIVA (FIX_RLS_FINAL)
-- Execute este script no SQL Editor do Supabase para liberar o upload.

-- PARTE 1: TABELA STORIES (Banco de Dados)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (limpeza geral)
DROP POLICY IF EXISTS "Stories são públicos" ON public.stories;
DROP POLICY IF EXISTS "Admins gerenciam stories" ON public.stories;
DROP POLICY IF EXISTS "Leitura Publica Stories" ON public.stories;
DROP POLICY IF EXISTS "Logado Pode Gerenciar Stories" ON public.stories;
DROP POLICY IF EXISTS "Anon Pode Ver Stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated Pode Insert Stories" ON public.stories;

-- Cria Novas Políticas (Simplificadas)

-- 1. Qualquer um pode ver (Leitura)
CREATE POLICY "Public See Stories"
ON public.stories FOR SELECT
USING (true);

-- 2. Qualquer usuário LOGADO pode CRIAR/EDITAR/DELETAR
-- (Isso resolve o erro ao tentar salvar no banco)
CREATE POLICY "Auth Manage Stories"
ON public.stories FOR ALL
USING (auth.role() = 'authenticated');


-- PARTE 2: STORAGE (Arquivos de Mídia)
-- O erro "new row violates..." geralmente acontece aqui na tabela storage.objects

-- Garante que o bucket existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stories-media', 'stories-media', true, 104857600, null) -- 100MB limit
ON CONFLICT (id) DO UPDATE SET file_size_limit = 104857600;

-- Remove políticas antigas do bucket
DROP POLICY IF EXISTS "Leitura pública do bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Upload admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Delete admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Ver Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Upload Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Deletar Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar Imagens Stories" ON storage.objects;

-- Cria Novas Políticas de Storage

-- 1. Ver Imagens (Público)
CREATE POLICY "Storage Public View"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stories-media' );

-- 2. Fazer Upload (Qualquer Logado)
CREATE POLICY "Storage Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'stories-media' 
    AND auth.role() = 'authenticated'
);

-- 3. Atualizar/Deletar (Qualquer Logado)
CREATE POLICY "Storage Auth Manage"
ON storage.objects FOR ALL
USING (
    bucket_id = 'stories-media' 
    AND auth.role() = 'authenticated'
);

-- Confirmação
SELECT 'Policies Atualizadas com Sucesso! Tente o upload novamente.' as status;
