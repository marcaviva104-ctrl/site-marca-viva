-- FIX: parent_group_id foi criado como UUID (advanced_features.sql /
-- advanced_financial.sql), mas admin.js sempre gerou o valor como texto
-- ("GRP-" + Date.now(), ex.: "GRP-1786990566315") -- nunca um UUID válido.
-- Resultado: TODO insert em financial_records falhava com
-- "invalid input syntax for type uuid", inclusive despesa avulsa (1x),
-- já que o campo é sempre preenchido independente do número de parcelas.
ALTER TABLE public.financial_records
    ALTER COLUMN parent_group_id TYPE TEXT USING parent_group_id::text;
