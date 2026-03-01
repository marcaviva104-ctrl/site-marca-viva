-- ============================================================
-- Adicionando colunas 'notes' e 'paid_at' na tabela order_payments
-- Execute no Supabase SQL Editor (painel > SQL Editor > Run)
-- ============================================================

-- Adicionar coluna 'notes' (observação do pagamento)
ALTER TABLE public.order_payments 
ADD COLUMN IF NOT EXISTS notes text;

-- Adicionar coluna 'paid_at' (data/hora do pagamento)
ALTER TABLE public.order_payments 
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Confirmar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_payments'
ORDER BY ordinal_position;
