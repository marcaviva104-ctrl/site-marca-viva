-- FIX: financial_goals tinha duas migrations conflitantes
--   database/migrations/schema/create_financial_goals.sql  -> retention_rate INTEGER
--   database/migrations/advanced_financial.sql              -> allocation_percentage DECIMAL
-- Como ambas usam CREATE TABLE IF NOT EXISTS, cada banco só tem UMA das duas colunas,
-- dependendo de qual rodou primeiro. admin.js usa retention_rate em 7 lugares e
-- allocation_percentage em 2 (código órfão/divergente). Esta migration é idempotente:
-- roda em qualquer banco, independente de qual das duas já existe.

-- 1. Garante que a coluna canônica existe
ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS retention_rate INTEGER DEFAULT 5;

-- 2. Se a coluna divergente existir com dado real, migra pro nome canônico
--    (só sobrescreve o default, não pisa em valor já migrado/editado manualmente)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'financial_goals'
      AND column_name = 'allocation_percentage'
  ) THEN
    UPDATE public.financial_goals
      SET retention_rate = ROUND(allocation_percentage)
      WHERE (retention_rate IS NULL OR retention_rate = 5)
        AND allocation_percentage IS NOT NULL;

    COMMENT ON COLUMN public.financial_goals.allocation_percentage IS 'DEPRECATED - use retention_rate';
  END IF;
END $$;
