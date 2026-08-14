-- Índices para leituras do admin (financeiro + lista + pagamentos).
-- Execute no SQL Editor do Supabase uma vez.

-- Já coberto por idx_protocols_list_performance.sql se você rodou aquele arquivo:
--   protocols (created_at DESC), (status, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_order_payments_order_id
  ON public.order_payments (order_id);

CREATE INDEX IF NOT EXISTS idx_financial_records_created_at
  ON public.financial_records (created_at DESC);
