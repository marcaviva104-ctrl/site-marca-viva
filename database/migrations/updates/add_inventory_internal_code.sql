-- Código interno opcional por insumo (referência única para NF / busca).
-- Execute no SQL Editor do Supabase se a coluna ainda não existir.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'inventory_items' AND column_name = 'internal_code'
    ) THEN
        ALTER TABLE public.inventory_items ADD COLUMN internal_code text;
        COMMENT ON COLUMN public.inventory_items.internal_code IS 'Referência interna opcional (SKU insumo); única quando preenchida.';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_internal_code_unique
    ON public.inventory_items (upper(btrim(internal_code)))
    WHERE internal_code IS NOT NULL AND btrim(internal_code) <> '';
