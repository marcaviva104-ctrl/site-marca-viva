-- ============================================================
--  RESET TOTAL — Marca Viva
--  Apaga tudo, mantém só a conta leivinjesus57@gmail.com.
-- ============================================================
--
--  O QUE ISSO APAGA (permanentemente, sem volta):
--    - Pedidos, itens, histórico, avaliação (protocols e afins,
--      incluindo a tabela legada orders/order_items se existir)
--    - Pagamentos e uso de cupom
--    - Financeiro (registros e metas)
--    - Chat de suporte
--    - Notificações (painel e cliente)
--    - Log de auditoria
--    - Histórico de movimentação de estoque
--    - Avaliações de produto, favoritos, endereços salvos
--    - Catálogo inteiro: produtos, faixas de preço, insumos, categorias
--    - Cupons (definição)
--    - Perfil (profiles) de todo mundo, EXCETO leivinjesus57@gmail.com
--
--  O QUE NÃO É TOCADO:
--    - Configurações da loja (nome, WhatsApp, cores, banners) — ficam
--      como estão, por pedido seu
--    - O login (auth.users) de leivinjesus57@gmail.com
--    - Colunas do Kanban (kanban_columns) — é estrutura, não dado
--
--  IMPORTANTE — O QUE ESTE ARQUIVO **NÃO** FAZ:
--    Não apaga os LOGINS dos outros usuários (auth.users). Mexer direto
--    nessa tabela pelo SQL Editor pode deixar sessão/token órfão pra
--    trás. Depois de rodar este script, apague os outros logins pelo
--    caminho oficial: Supabase Dashboard -> Authentication -> Users ->
--    selecione todos MENOS leivinjesus57@gmail.com -> Delete. Nessa
--    hora já não sobra mais nenhum dado (profile, pedido, etc.)
--    amarrado a essas contas, porque este script já limpou tudo antes.
--
--  Cada bloco confere se a tabela existe (to_regclass) antes de mexer,
--  então não quebra mesmo que seu banco não tenha alguma dessas
--  tabelas (esse projeto teve mais de uma versão de schema ao longo
--  do tempo — orders/protocols, financial_history/financial_records,
--  etc. — este script cobre as duas gerações onde fez sentido).
--
--  Confirme que já fez os backups (PDF do Dashboard + os CSVs pelo
--  Table Editor) antes de rodar. NÃO tem como desfazer.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) Pedidos, histórico e financeiro (filhos antes dos pais)
-- ------------------------------------------------------------
DO $$ BEGIN
    IF to_regclass('public.protocol_reviews') IS NOT NULL THEN DELETE FROM public.protocol_reviews; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.protocol_history') IS NOT NULL THEN DELETE FROM public.protocol_history; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.protocol_items') IS NOT NULL THEN DELETE FROM public.protocol_items; END IF;
END $$;

-- Tabela legada (versão antiga do sistema, antes de "protocols" existir)
DO $$ BEGIN
    IF to_regclass('public.order_items') IS NOT NULL THEN DELETE FROM public.order_items; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.order_payments') IS NOT NULL THEN DELETE FROM public.order_payments; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.coupon_usage') IS NOT NULL THEN DELETE FROM public.coupon_usage; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.protocols') IS NOT NULL THEN DELETE FROM public.protocols; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.orders') IS NOT NULL THEN DELETE FROM public.orders; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.financial_records') IS NOT NULL THEN DELETE FROM public.financial_records; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.financial_goals') IS NOT NULL THEN DELETE FROM public.financial_goals; END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Chat, notificações, auditoria, estoque
-- ------------------------------------------------------------
DO $$ BEGIN
    IF to_regclass('public.support_messages') IS NOT NULL THEN DELETE FROM public.support_messages; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.support_chats') IS NOT NULL THEN DELETE FROM public.support_chats; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.notifications') IS NOT NULL THEN DELETE FROM public.notifications; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.customer_notifications') IS NOT NULL THEN DELETE FROM public.customer_notifications; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.admin_audit_logs') IS NOT NULL THEN DELETE FROM public.admin_audit_logs; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.inventory_movements') IS NOT NULL THEN DELETE FROM public.inventory_movements; END IF;
END $$;

-- ------------------------------------------------------------
-- 3) Dados presos à conta do usuário (precisam sumir antes do
--    catálogo e antes de apagar o profile de cada um)
-- ------------------------------------------------------------
DO $$ BEGIN
    IF to_regclass('public.product_reviews') IS NOT NULL THEN DELETE FROM public.product_reviews; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.user_favorites') IS NOT NULL THEN DELETE FROM public.user_favorites; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.customer_addresses') IS NOT NULL THEN DELETE FROM public.customer_addresses; END IF;
END $$;

-- ------------------------------------------------------------
-- 4) Catálogo inteiro
-- ------------------------------------------------------------
DO $$ BEGIN
    IF to_regclass('public.product_tiers') IS NOT NULL THEN DELETE FROM public.product_tiers; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.coupons') IS NOT NULL THEN DELETE FROM public.coupons; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.products') IS NOT NULL THEN DELETE FROM public.products; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.inventory_items') IS NOT NULL THEN DELETE FROM public.inventory_items; END IF;
END $$;

DO $$ BEGIN
    IF to_regclass('public.categories') IS NOT NULL THEN DELETE FROM public.categories; END IF;
END $$;

-- ------------------------------------------------------------
-- 5) Perfis — mantém só o seu
-- ------------------------------------------------------------
DO $$ BEGIN
    IF to_regclass('public.profiles') IS NOT NULL THEN
        DELETE FROM public.profiles
        WHERE email IS DISTINCT FROM 'leivinjesus57@gmail.com';
    END IF;
END $$;

COMMIT;

-- ============================================================
--  FIM. Confira o resultado com:
--    SELECT 'protocols' t, count(*) FROM public.protocols
--    UNION ALL SELECT 'products', count(*) FROM public.products
--    UNION ALL SELECT 'coupons', count(*) FROM public.coupons
--    UNION ALL SELECT 'profiles', count(*) FROM public.profiles;
--  Tudo em 0, exceto profiles (deve mostrar 1: a sua conta).
--
--  PRÓXIMO PASSO (fora do SQL): Supabase Dashboard -> Authentication
--  -> Users -> selecione todos MENOS leivinjesus57@gmail.com -> Delete.
-- ============================================================
