-- ENDURECIMENTO DE SEGURANÇA: restringe as tabelas puramente financeiras/internas
-- (nunca tocadas pelo site público) para exigir role='admin' de verdade, em vez
-- de "USING (true)" (qualquer request, autenticado ou não).
--
-- NÃO mexe em `protocols`/`protocol_items` -- essas o checkout do site usa pra
-- criar pedido de cliente, travar elas quebraria as vendas.
--
-- Login já é Supabase Auth real (verificado em pages/login.html + auth.js);
-- o que faltava era o banco de dados também checar isso, não só a interface.
--
-- Se algo quebrar depois de rodar este arquivo, rode
-- 20260817_restrict_financial_tables_ROLLBACK.sql pra voltar ao estado aberto.

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

DO $$
DECLARE
    tbl text;
    pol record;
    tabelas text[] := ARRAY[
        'financial_records', 'order_payments', 'financial_goals', 'financial_history'
    ];
BEGIN
    FOREACH tbl IN ARRAY tabelas LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            RAISE NOTICE 'pulando % (tabela nao existe)', tbl;
            CONTINUE;
        END IF;

        -- Remove QUALQUER policy existente na tabela, seja qual for o nome
        -- (podem ter sido criadas por migrations diferentes ao longo do tempo)
        FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
        END LOOP;

        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())',
            tbl || '_admin_only', tbl
        );

        RAISE NOTICE 'travado: % agora exige role=admin', tbl;
    END LOOP;
END $$;
