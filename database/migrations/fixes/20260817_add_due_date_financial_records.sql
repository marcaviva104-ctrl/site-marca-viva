-- Vencimento real para "Contas a Pagar" (financial_records type='expense').
-- Antes só existia created_at (data de lançamento/parcela), sobrecarregado
-- como "vencimento" em várias partes do código -- devido é o próprio dia
-- calculado por parcela em saveExpense(), então o backfill abaixo replica
-- exatamente o que o código já assumia implicitamente.
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS due_date DATE;

UPDATE public.financial_records
SET due_date = created_at::date
WHERE due_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_records_due_date
    ON public.financial_records(due_date)
    WHERE type = 'expense' AND status != 'paid';
