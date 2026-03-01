-- 🛠️ SCRIPT DE CORREÇÃO: PERMISSÕES DE STORIES
-- Rode este script no Supabase para liberar o upload.

-- 1. Garantir que o usuário seja Admin (Substitua pelo email se necessário, mas aqui liberamos geral para teste)
-- ATENÇÃO: Para testes, vamos permitir que qualquer usuário logado gerencie stories.
-- Depois podemos restringir.

-- --- TABELA STORIES ---

DROP POLICY IF EXISTS "Admins gerenciam stories" ON public.stories;
DROP POLICY IF EXISTS "Stories são públicos" ON public.stories;

-- Permitir LEITURA para todos (anônimo e logado)
CREATE POLICY "Leitura Publica Stories"
ON public.stories FOR SELECT
USING (true);

-- Permitir TUDO para qualquer usuário LOGADO (Authenticated)
-- Isso resolve o erro "Row Level Security" para quem está logado no painel.
CREATE POLICY "Logado Pode Gerenciar Stories"
ON public.stories FOR ALL
USING (auth.role() = 'authenticated');


-- --- STORAGE (BUCKET) ---

-- Remover policies antigas para não conflitar
DROP POLICY IF EXISTS "Upload admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Delete admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública do bucket stories" ON storage.objects;

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories-media', 'stories-media', true)
ON CONFLICT (id) DO NOTHING;

-- 1. Download/View Público
CREATE POLICY "Ver Imagens Stories"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stories-media' );

-- 2. Upload Liberado para Logados
CREATE POLICY "Upload Imagens Stories"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'stories-media' 
    AND auth.role() = 'authenticated'
);

-- 3. Delete Liberado para Logados
CREATE POLICY "Deletar Imagens Stories"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'stories-media' 
    AND auth.role() = 'authenticated'
);

-- 4. Update Liberado para Logados
CREATE POLICY "Atualizar Imagens Stories"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'stories-media' 
    AND auth.role() = 'authenticated'
);

-- FIM
