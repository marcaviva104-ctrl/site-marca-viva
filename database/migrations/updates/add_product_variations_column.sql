-- Variações de estoque (ex.: cores/tamanhos) em JSON — execute no Supabase SQL Editor se a coluna ainda não existir.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'variations'
    ) THEN
        ALTER TABLE public.products ADD COLUMN variations jsonb NOT NULL DEFAULT '[]'::jsonb;
        COMMENT ON COLUMN public.products.variations IS 'Lista de variações: [{ "name": "Azul P", "stock": 10 }, ...]';
    END IF;
END $$;
