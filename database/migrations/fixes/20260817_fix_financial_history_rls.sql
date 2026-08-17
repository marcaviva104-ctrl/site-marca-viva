-- FIX: financial_history tinha duas migrations conflitantes
--   database/migrations/step2_financial_history.sql         -> policy publica "USING (true)"
--   database/migrations/schema/create_financial_history.sql -> policy restrita a role='admin'
--                                                                + changed_by UUID REFERENCES auth.users(id)
-- admin.js (logFinancialAction, admin/js/admin.js) grava changed_by com o E-MAIL do usuario
-- (window.currentUser?.email || 'admin'), NUNCA um UUID -- se a coluna for UUID (com ou sem
-- REFERENCES) todo insert de historico falha silenciosamente (try/catch engole o erro).
-- Esta migration e idempotente e corrige os dois problemas: tipo de coluna e policy.

CREATE TABLE IF NOT EXISTS public.financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    changed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Corrige o tipo da coluna caso a tabela ja exista com changed_by UUID
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'financial_history'
      AND column_name = 'changed_by' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.financial_history DROP COLUMN changed_by;
    ALTER TABLE public.financial_history ADD COLUMN changed_by TEXT;
  END IF;
END $$;

ALTER TABLE public.financial_history ENABLE ROW LEVEL SECURITY;

-- Remove as policies conflitantes das duas migrations antigas
DROP POLICY IF EXISTS "Public full access financial_history" ON public.financial_history;
DROP POLICY IF EXISTS "Admins can do everything on financial_history" ON public.financial_history;
DROP POLICY IF EXISTS "Public read financial_history" ON public.financial_history;
DROP POLICY IF EXISTS "financial_history_admin_access" ON public.financial_history;

-- Policy unica: mesmo padrao ja usado em financial_records/order_payments (acesso liberado).
-- O admin painel nao usa Supabase Auth "de verdade" (changed_by e so um e-mail em texto),
-- entao restringir por role='admin' via auth.uid() bloquearia todo mundo.
CREATE POLICY "financial_history_access" ON public.financial_history
    FOR ALL USING (true) WITH CHECK (true);
