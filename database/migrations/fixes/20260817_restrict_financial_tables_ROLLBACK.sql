-- ROLLBACK de 20260817_restrict_financial_tables_to_admin.sql
-- Rode isto SÓ SE o painel admin parar de carregar dados financeiros depois
-- da migration de endurecimento (ex.: login não está de fato autenticando
-- via Supabase Auth, ou a conta usada não tem profiles.role='admin').
--
-- Isso volta as 4 tabelas pro estado "aberto" (qualquer request), do jeito
-- que estavam antes. Depois de rodar, o painel volta a funcionar imediatamente
-- -- mas o problema de segurança volta junto. Use só como emergência.

DO $$
DECLARE
    tbl text;
    tabelas text[] := ARRAY[
        'financial_records', 'order_payments', 'financial_goals', 'financial_history'
    ];
BEGIN
    FOREACH tbl IN ARRAY tabelas LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            CONTINUE;
        END IF;

        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_admin_only', tbl);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)',
            tbl || '_open_rollback', tbl
        );
    END LOOP;
END $$;
