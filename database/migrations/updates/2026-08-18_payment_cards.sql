-- Cadastro de cartões (empresa e clientes) para o financeiro, e vínculo em
-- financial_records/order_payments para saber qual cartão foi usado em cada
-- lançamento. O saldo pendente é derivado do campo `status` já existente em
-- financial_records ('pending'/'paid') combinado com o `owner_type` do cartão
-- -- não precisa de coluna de saldo separada.
--
-- SEM loja_id de propósito: a migration de multiloja (etapa1_fundacao_multiloja.sql)
-- ainda não foi aplicada neste banco (tabela `lojas` não existe), então essa
-- coluna ficaria travando o INSERT à toa. Quando o multiloja for ativado de
-- verdade, adiciona-se `loja_id` aqui do mesmo jeito que foi feito nas outras
-- 21 tabelas (ALTER TABLE ... ADD COLUMN ... DEFAULT '00000000-...' REFERENCES lojas(id)).

-- Idempotente: recria a função mesmo que já exista (não quebra nada se
-- 20260817_restrict_financial_tables_to_admin.sql já tiver rodado antes).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE TABLE IF NOT EXISTS public.payment_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type TEXT NOT NULL CHECK (owner_type IN ('empresa', 'cliente')),
    client_id UUID REFERENCES auth.users(id),
    client_name TEXT,
    label TEXT NOT NULL,
    last_digits TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.payment_cards(id);
ALTER TABLE public.order_payments   ADD COLUMN IF NOT EXISTS card_id UUID REFERENCES public.payment_cards(id);

-- Mesmo padrão de trava usada em 20260817_restrict_financial_tables_to_admin.sql:
-- só admin/employee autenticado mexe em cartões.
ALTER TABLE public.payment_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_cards_admin_only ON public.payment_cards;
CREATE POLICY payment_cards_admin_only ON public.payment_cards
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
