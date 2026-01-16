-- Adicionar suporte a múltiplas imagens
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';

-- Comentário:
-- A coluna 'image' continuará sendo a capa principal.
-- 'gallery' conterá todas as fotos adicionais.
