-- ==============================================================
-- ATUALIZAR LIMITE DE TAMANHO DE UPLOAD DO BUCKET 'products'
-- ==============================================================
-- Cole e rode isso na aba SQL Editor do seu Supabase para 
-- permitir uploads de PDFs de até 50MB (52428800 bytes).

UPDATE storage.buckets
SET file_size_limit = 52428800 -- 50 MB em bytes
WHERE id = 'products';
