-- Colunas de database/migrations/advanced_financial.sql que NAO estao duplicadas
-- em nenhuma outra migration ativa (type/category/installments ja existem em
-- update_financial_schema.sql e advanced_features.sql). Extraidas para ca antes
-- de arquivar advanced_financial.sql, que so tinha uma 3a definicao conflitante
-- de financial_goals + colunas ja cobertas em outro lugar.

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS recipe JSONB DEFAULT '[]';

ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS customer_rating VARCHAR(20);
