-- Vencimento opcional para "Contas a Receber". Preenchido manualmente pelo
-- admin (ex.: "cliente disse que paga até dia X") -- sem backfill automático
-- para não marcar pedidos antigos como atrasados por engano. Quando nulo, a
-- UI usa um fallback (created_at + 7 dias) só para exibição, nunca gravado aqui.
ALTER TABLE public.protocols ADD COLUMN IF NOT EXISTS due_date DATE;

CREATE INDEX IF NOT EXISTS idx_protocols_due_date
    ON public.protocols(due_date)
    WHERE payment_status != 'paid_full';
