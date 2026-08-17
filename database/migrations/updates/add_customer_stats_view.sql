-- ============================================================
--  customer_stats — visão agregada de clientes, para o CRM
-- ============================================================
--
--  SITUAÇÃO ANTES DESTA MIGRATION:
--    CRMManager.loadCustomers() (scripts/services/crm-client.js)
--    buscava TODOS os profiles + TODOS os protocols (com
--    protocol_items via join completo) e somava gasto/pedidos
--    por cliente inteiramente no navegador. Sem limite: cresce
--    para sempre, e traz o pedido inteiro (itens, endereço, tudo)
--    só para calcular uma soma.
--
--  O QUE ESTA VIEW FAZ:
--    Agrega no banco (SUM/COUNT/MAX), uma linha por cliente,
--    já pronta pra ordenar por quem gastou mais — sem trazer
--    protocol_items nenhum. Cobre tanto cliente cadastrado
--    (profiles) quanto quem só fez pedido sem conta (guest),
--    igual o comportamento atual do CRM.
--
--  SEGURANÇA:
--    security_invoker = true faz a view "transparente": quem
--    consulta só vê o que já veria consultando profiles/protocols
--    direto, respeitando as políticas de RLS de cada um. A view
--    em si não abre acesso novo a dado nenhum.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: idempotente (CREATE OR REPLACE VIEW), pode rodar de novo.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_protocols_client_email ON public.protocols (client_email);

CREATE OR REPLACE VIEW public.customer_stats
WITH (security_invoker = true) AS
WITH order_stats AS (
    SELECT
        lower(client_email) AS email_key,
        (array_agg(client_email ORDER BY created_at DESC))[1] AS sample_email,
        (array_agg(client_name ORDER BY created_at DESC))[1] AS sample_name,
        (array_agg(client_phone ORDER BY created_at DESC))[1] AS sample_phone,
        COUNT(*)::int AS order_count,
        COALESCE(SUM(total_amount), 0)::numeric AS total_spent,
        MAX(created_at) AS last_order
    FROM public.protocols
    WHERE client_email IS NOT NULL AND client_email <> ''
    GROUP BY lower(client_email)
)
SELECT
    p.id,
    COALESCE(p.email, os.sample_email) AS email,
    COALESCE(p.full_name, os.sample_name, 'Cliente (Guest)') AS name,
    COALESCE(p.phone, os.sample_phone, '-') AS phone,
    COALESCE(p.approved, true) AS approved,
    COALESCE(p.role, 'guest') AS role,
    COALESCE(p.cpf, '') AS cpf,
    COALESCE(p.cnpj, '') AS cnpj,
    COALESCE(p.person_type, 'pf') AS person_type,
    COALESCE(os.order_count, 0) AS order_count,
    COALESCE(os.total_spent, 0) AS total_spent,
    os.last_order
FROM public.profiles p
FULL OUTER JOIN order_stats os ON lower(p.email) = os.email_key
WHERE COALESCE(p.email, os.sample_email) IS NOT NULL;

COMMENT ON VIEW public.customer_stats IS
    'Uma linha por cliente (cadastrado ou guest), com total gasto/pedidos/última compra já agregados. Usada pelo CRM (Admin → Clientes) para não ter que somar tudo no navegador a cada carregamento.';

-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  COMO TESTAR:
--    SELECT * FROM customer_stats ORDER BY total_spent DESC LIMIT 10;
--  Deve trazer os clientes que mais compraram, cada um em uma
--  linha só, sem repetir por pedido.
-- ============================================================
