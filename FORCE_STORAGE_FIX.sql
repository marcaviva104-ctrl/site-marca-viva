-- ☢️ SCRIPT DE CORREÇÃO NUCLEAR (FORCE_STORAGE_FIX)
-- Esse script libera GERAL o upload para a pasta de stories.
-- Use isso se nada mais funcionou.

BEGIN;

-- 1. Garante que o bucket 'stories-media' existe e aceita arquivos grandes
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('stories-media', 'stories-media', true, 104857600) -- 100MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

-- 2. Limpa políticas antigas que podem estar travando
DROP POLICY IF EXISTS "Leitura pública do bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Upload admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Delete admin no bucket stories" ON storage.objects;
DROP POLICY IF EXISTS "Ver Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Upload Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Deletar Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar Imagens Stories" ON storage.objects;
DROP POLICY IF EXISTS "Storage Public View" ON storage.objects;
DROP POLICY IF EXISTS "Storage Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Storage Auth Manage" ON storage.objects;

-- 3. CRIA UMA POLÍTICA "LIBERA GERAL" (Sem checar login)
-- Isso vai garantir que não seja problema de autenticação do usuário.

CREATE POLICY "Libera Geral Stories Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'stories-media' );

CREATE POLICY "Libera Geral Stories Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stories-media' );

CREATE POLICY "Libera Geral Stories Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'stories-media' );

CREATE POLICY "Libera Geral Stories Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'stories-media' );

COMMIT;

SELECT '✅ Permissão TOTAL liberada para o bucket stories-media.' as status;
