-- ============================================================
--  CORRIGE PERMISSAO DO LOG DE AUDITORIA (admin_audit_logs)
-- ============================================================
--
--  PROBLEMA: as policies criadas em add_admin_audit_logs.sql liberam
--  SELECT e INSERT para QUALQUER usuario autenticado, sem checar o
--  role. Isso significa que um cliente comum logado (nao admin, nao
--  funcionario) consegue ler o log inteiro de auditoria -- quem
--  aprovou/rejeitou pedidos, valores antes/depois, etc.
--
--  Este arquivo troca a regra para "so admin/funcionario", igual ja
--  e feito em coupons (add_coupons.sql, policy coupons_admin_all) e
--  no chat de suporte (add_support_chat.sql).
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: usa DROP POLICY IF EXISTS antes de recriar. Pode rodar
--  duas vezes.
-- ============================================================

DROP POLICY IF EXISTS admin_audit_logs_insert_authenticated ON public.admin_audit_logs;
DROP POLICY IF EXISTS admin_audit_logs_select_authenticated ON public.admin_audit_logs;

-- INSERT: so admin/funcionario grava (quem chama e sempre o painel admin,
-- via ProtocolsManager.logAudit em admin/js/admin-protocols.js).
DROP POLICY IF EXISTS admin_audit_logs_insert_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_insert_admin ON public.admin_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));

-- SELECT: so admin/funcionario le (o painel de auditoria do admin).
DROP POLICY IF EXISTS admin_audit_logs_select_admin ON public.admin_audit_logs;
CREATE POLICY admin_audit_logs_select_admin ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));

-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
-- ============================================================
