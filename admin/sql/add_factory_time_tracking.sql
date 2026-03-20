-- ============================================================
-- Marca Viva — Migração Completa
-- Cole TUDO isso no Supabase SQL Editor e clique em Run
-- ============================================================

-- 1. COLUNAS DA FÁBRICA (protocolo de produção)
ALTER TABLE protocols
    ADD COLUMN IF NOT EXISTS production_start_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS production_end_time TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS production_pauses JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS total_production_minutes INTEGER,
    ADD COLUMN IF NOT EXISTS approved_for_production BOOLEAN DEFAULT FALSE;

-- 2. COLUNAS FISCAIS E DE PRODUÇÃO DOS PRODUTOS
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS ncm VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unit_type VARCHAR(10) DEFAULT 'UN',
    ADD COLUMN IF NOT EXISTS tempo_producao NUMERIC(6,2) DEFAULT 1.0;

-- 3. VERIFICAÇÃO — deve retornar todas as colunas adicionadas
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('protocols', 'products')
  AND column_name IN (
    'production_start_time','production_end_time','production_pauses',
    'total_production_minutes','approved_for_production',
    'ncm','tax_rate','unit_type','tempo_producao'
  )
ORDER BY table_name, column_name;
