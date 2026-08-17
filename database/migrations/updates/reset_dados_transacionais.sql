-- ============================================================
--  RESET DE DADOS TRANSACIONAIS — Marca Viva
-- ============================================================
--
--  O QUE ISSO APAGA (permanentemente, sem volta):
--    - Pedidos (protocols) e itens de cada pedido
--    - Histórico/avaliação de pedido (protocol_history, protocol_reviews)
--    - Financeiro (financial_records, financial_goals, order_payments)
--    - Uso de cupom (coupon_usage) — os CUPONS em si continuam existindo,
--      só o histórico de quem usou é zerado (usage_count volta a 0)
--    - Chat de suporte (support_chats, support_messages)
--    - Notificações do painel e do cliente (notifications, customer_notifications)
--    - Log de auditoria (admin_audit_logs)
--    - Histórico de movimentação de estoque (inventory_movements)
--
--  O QUE NÃO É TOCADO:
--    - Contas de login (auth.users / profiles) — TODOS continuam
--      logando normalmente, inclusive clientes
--    - Catálogo de produtos (products) e insumos (inventory_items,
--      só o histórico de MOVIMENTAÇÃO é apagado, o cadastro e o
--      estoque atual continuam iguais)
--    - Categorias, cupons (definição), configurações da loja
--    - Colunas do Kanban (kanban_columns)
--
--  Cada bloco confere se a tabela existe antes de mexer (to_regclass),
--  então é seguro mesmo que seu banco não tenha todas essas tabelas
--  ainda (nem toda migration do projeto foi necessariamente aplicada).
--
--  ATENÇÃO: NÃO tem como desfazer isso. Se quiser guardar os dados
--  antes, use o botão "Backup" no Dashboard do admin (gera um PDF)
--  ou exporte as tabelas pelo Table Editor do Supabase primeiro.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
-- ============================================================

BEGIN;

-- 1) Filhos de "protocols" primeiro (senão a FK trava o delete do pai)
DO $$ BEGIN
    IF to_regclass('public.protocol_reviews') IS NOT NULL THEN
        DELETE FROM public.protocol_reviews;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.protocol_history') IS NOT NULL THEN
        DELETE FROM public.protocol_history;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.protocol_items') IS NOT NULL THEN
        DELETE FROM public.protocol_items;
    END IF;
END $$;

-- order_id aqui é texto solto (sem FK de verdade), mas ainda é
-- histórico do pedido — apaga junto.
DO $$ BEGIN
    IF to_regclass('public.order_payments') IS NOT NULL THEN
        DELETE FROM public.order_payments;
    END IF;
END $$;

-- Uso de cupom referencia o pedido (order_id, texto solto) — apaga o
-- histórico de uso, mas o CUPOM em si (tabela coupons) fica intacto.
DO $$ BEGIN
    IF to_regclass('public.coupon_usage') IS NOT NULL THEN
        DELETE FROM public.coupon_usage;
    END IF;
END $$;

-- 2) Agora sim, os pedidos (pai)
DO $$ BEGIN
    IF to_regclass('public.protocols') IS NOT NULL THEN
        DELETE FROM public.protocols;
    END IF;
END $$;

-- Zera o contador de uso nos cupons que sobraram (a definição do cupom
-- fica, só o "quantas vezes foi usado" volta a 0 — senão ficaria
-- registrando uso de pedido que não existe mais).
DO $$ BEGIN
    IF to_regclass('public.coupons') IS NOT NULL THEN
        UPDATE public.coupons SET usage_count = 0;
    END IF;
END $$;

-- 3) Financeiro
DO $$ BEGIN
    IF to_regclass('public.financial_records') IS NOT NULL THEN
        DELETE FROM public.financial_records;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.financial_goals') IS NOT NULL THEN
        DELETE FROM public.financial_goals;
    END IF;
END $$;

-- 4) Chat de suporte (mensagens antes da conversa, por causa da FK)
DO $$ BEGIN
    IF to_regclass('public.support_messages') IS NOT NULL THEN
        DELETE FROM public.support_messages;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.support_chats') IS NOT NULL THEN
        DELETE FROM public.support_chats;
    END IF;
END $$;

-- 5) Notificações (painel do admin e do cliente)
DO $$ BEGIN
    IF to_regclass('public.notifications') IS NOT NULL THEN
        DELETE FROM public.notifications;
    END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.customer_notifications') IS NOT NULL THEN
        DELETE FROM public.customer_notifications;
    END IF;
END $$;

-- 6) Log de auditoria
DO $$ BEGIN
    IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN
        DELETE FROM public.admin_audit_logs;
    END IF;
END $$;

-- 7) Histórico de movimentação de estoque (o cadastro do insumo e o
-- estoque atual continuam — só o "livro-razão" de entradas/saídas some)
DO $$ BEGIN
    IF to_regclass('public.inventory_movements') IS NOT NULL THEN
        DELETE FROM public.inventory_movements;
    END IF;
END $$;

COMMIT;

-- ============================================================
--  FIM. Confira o resultado com:
--    SELECT 'protocols' t, count(*) FROM public.protocols
--    UNION ALL SELECT 'financial_records', count(*) FROM public.financial_records
--    UNION ALL SELECT 'support_chats', count(*) FROM public.support_chats
--    UNION ALL SELECT 'admin_audit_logs', count(*) FROM public.admin_audit_logs;
--  Tudo deve voltar 0.
-- ============================================================
