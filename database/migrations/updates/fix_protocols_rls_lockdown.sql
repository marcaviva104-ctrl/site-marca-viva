-- ============================================================
--  protocols / protocol_items — fecha o acesso público
-- ============================================================
--
--  PROBLEMA (achado revisando o backlog de segurança desta rodada):
--  ao longo do tempo, migrations de "fix rápido" (fixes/MASTER_FIX_ALL.sql,
--  fixes/fix_rls_public_read.sql) deixaram estas policies ativas:
--
--      "Public Read Protocols"  ON protocols       FOR SELECT USING (true)
--      "Public Insert Protocols" ON protocols      FOR INSERT WITH CHECK (true)
--      "Public Read Items"      ON protocol_items  FOR SELECT USING (true)
--      "Public Insert Items"    ON protocol_items  FOR INSERT WITH CHECK (true)
--
--  USING (true) não significa "só quem sabe o ID" — significa
--  QUALQUER UM, sem login, pode listar a tabela protocols INTEIRA:
--  nome, e-mail, telefone e valor de todo pedido já feito. Isso
--  era usado de propósito pela página pública de rastreio
--  (pages/track.html), que hoje baixa TODOS os pedidos só pra
--  procurar um ID no navegador (scripts/pages/track.js).
--
--  O QUE ESTE ARQUIVO FAZ:
--    1. Remove todas as policies públicas/antigas conhecidas
--       (nomes de fixes/MASTER_FIX_ALL.sql e arquivos anteriores).
--    2. Cria regras corretas: dono do pedido (por conta logada
--       ou e-mail) ou equipe (admin/employee) — mesmo padrão já
--       usado em notifications, coupons e support_messages.
--    3. Cria a view protocol_tracking, com só status (sem nome,
--       e-mail, telefone, valor, itens) — ESSA sim pode ficar
--       pública de verdade, porque não vaza dado de ninguém.
--
--  Depois de rodar isto, troque scripts/pages/track.js pra usar
--  a view nova (arquivo já entregue junto) — sem essa troca a
--  página de rastreio para de funcionar, porque protocols deixa
--  de estar aberta.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: idempotente (DROP POLICY IF EXISTS antes de recriar).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Remove todas as policies antigas conhecidas
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Admin vê tudo" ON public.protocols;
DROP POLICY IF EXISTS "Cliente vê seus protocolos" ON public.protocols;
DROP POLICY IF EXISTS "Admin vê tudo protocolos" ON public.protocols;
DROP POLICY IF EXISTS "Public Read Protocols" ON public.protocols;
DROP POLICY IF EXISTS "Public Insert Protocols" ON public.protocols;
DROP POLICY IF EXISTS protocols_select_owner_or_staff ON public.protocols;
DROP POLICY IF EXISTS protocols_insert_owner_or_staff ON public.protocols;
DROP POLICY IF EXISTS protocols_update_staff ON public.protocols;

DROP POLICY IF EXISTS "Public Read Items" ON public.protocol_items;
DROP POLICY IF EXISTS "Public Insert Items" ON public.protocol_items;
DROP POLICY IF EXISTS protocol_items_select_via_parent ON public.protocol_items;
DROP POLICY IF EXISTS protocol_items_insert_via_parent ON public.protocol_items;
DROP POLICY IF EXISTS protocol_items_update_staff ON public.protocol_items;
DROP POLICY IF EXISTS protocol_items_delete_staff ON public.protocol_items;

ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_items ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 2) protocols: dono (por id da conta ou e-mail) ou equipe
-- ------------------------------------------------------------

-- LER: o cliente vê os próprios pedidos (client_id bate com a conta
-- logada, ou o e-mail do pedido bate com o e-mail da conta — cobre
-- pedidos antigos feitos antes do checkout exigir login). Equipe vê tudo.
CREATE POLICY protocols_select_owner_or_staff ON public.protocols
    FOR SELECT TO authenticated
    USING (
        client_id = auth.uid()
        OR lower(client_email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
        )
    );

-- CRIAR: cliente só cria pedido pra si mesmo (client_id = a própria
-- conta); equipe pode criar manualmente (Admin → Pedidos → lançamento manual).
CREATE POLICY protocols_insert_owner_or_staff ON public.protocols
    FOR INSERT TO authenticated
    WITH CHECK (
        client_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
        )
    );

-- EDITAR: só equipe (aprovar, mudar status, atribuir responsável,
-- editar itens/valores — tudo isso já só acontece no painel admin).
CREATE POLICY protocols_update_staff ON public.protocols
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ------------------------------------------------------------
-- 3) protocol_items: segue a visibilidade do pedido pai
-- ------------------------------------------------------------

CREATE POLICY protocol_items_select_via_parent ON public.protocol_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.protocols pr
        WHERE pr.id = protocol_items.protocol_id
          AND (
              pr.client_id = auth.uid()
              OR lower(pr.client_email) = lower((SELECT email FROM public.profiles WHERE id = auth.uid()))
              OR EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
              )
          )
    ));

CREATE POLICY protocol_items_insert_via_parent ON public.protocol_items
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.protocols pr
        WHERE pr.id = protocol_items.protocol_id
          AND (
              pr.client_id = auth.uid()
              OR EXISTS (
                  SELECT 1 FROM public.profiles p
                  WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
              )
          )
    ));

-- Editar/remover item: só equipe (ProtocolDetailView.saveItems apaga
-- e reinsere os itens do pedido — precisa de DELETE também).
CREATE POLICY protocol_items_update_staff ON public.protocol_items
    FOR UPDATE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));

CREATE POLICY protocol_items_delete_staff ON public.protocol_items
    FOR DELETE TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ------------------------------------------------------------
-- 4) protocol_tracking: view pública SEM dado pessoal, só status
--
--    Não usa security_invoker — roda com o dono da view (o
--    papel que executa esta migration no SQL Editor), por isso
--    consegue ler protocols mesmo sem o visitante ter acesso à
--    tabela. Como só expõe id/status/datas, isso é seguro: é
--    literalmente pra ser público, tipo código de rastreio dos
--    Correios.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW public.protocol_tracking AS
SELECT
    id,
    status,
    column_id,
    payment_status,
    priority,
    created_at,
    updated_at,
    production_steps,
    production_start_time,
    production_end_time
FROM public.protocols;

COMMENT ON VIEW public.protocol_tracking IS
    'Status público de um pedido por ID, sem dado pessoal (nome/e-mail/telefone/valor/itens ficam de fora). Usada pela página de rastreio (pages/track.html).';

GRANT SELECT ON public.protocol_tracking TO anon, authenticated;

-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  COMO TESTAR:
--    1) Deslogado, abra pages/track.html com um ID de pedido real
--       na URL (?id=...) — deve continuar mostrando o status.
--    2) No DevTools (Network), confira que a chamada agora é só
--       pra protocol_tracking, filtrada por id — não deve mais
--       baixar a lista inteira de pedidos.
--    3) Logado como cliente A, tente acessar (via console)
--       supabase.from('protocols').select('*') sem filtro —
--       deve trazer só os pedidos do cliente A, não de todo mundo.
-- ============================================================
