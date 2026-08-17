-- ============================================================
--  MELHORIAS NA ÁREA DO CLIENTE — pacote combinado
--  Junta em um arquivo só os 7 SQLs gerados nesta sessão, na
--  ordem certa (tabelas antes dos triggers que dependem delas).
--  Seguro rodar mais de uma vez: usa IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================


-- ============================================================
-- 1) Frete real no checkout
-- ============================================================
-- Frete calculado no checkout (antes só ia como texto solto em `notes`,
-- sempre "À Combinar" mesmo quando o admin configurava frete fixo/grátis
-- em Configurações > Frete & Entrega).
ALTER TABLE public.protocols
    ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipping_method TEXT;


-- ============================================================
-- 2) Autoatendimento LGPD — solicitação de exclusão de conta
-- ============================================================
-- Cliente solicita exclusão da própria conta pela aba "Minha Conta".
-- Não apaga na hora (histórico de pedidos pode ter retenção fiscal
-- obrigatória) — fica registrado pra equipe tratar.
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id),
    email      text NOT NULL,
    status     text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'rejected')),
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS account_deletion_requests_insert_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_insert_own ON public.account_deletion_requests
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS account_deletion_requests_select_own ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_select_own ON public.account_deletion_requests
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS account_deletion_requests_staff_all ON public.account_deletion_requests;
CREATE POLICY account_deletion_requests_staff_all ON public.account_deletion_requests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')));


-- ============================================================
-- 3) product_id em protocol_items (reviews precisas por produto)
-- ============================================================
-- Sem product_id, a verificação de "cliente comprou este produto" (reviews)
-- só conseguia checar "tem algum pedido entregue", liberando avaliar
-- qualquer produto do catálogo. Ver scripts/pages/produto-reviews.js.
ALTER TABLE public.protocol_items
    ADD COLUMN IF NOT EXISTS product_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_protocol_items_product_id ON public.protocol_items(product_id);


-- ============================================================
-- 4) Notificações do cliente + trigger de mudança de status
-- ============================================================
-- Notificações pro CLIENTE (ex: "seu pedido mudou de status"). Tabela
-- separada de public.notifications, que é 100% interna da equipe (RLS
-- restrita a admin/employee) e já tem duas migrations conflitantes de
-- schema — não misturar.
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES auth.users(id),
    title      text NOT NULL,
    message    text,
    type       text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'pedido', 'pagamento')),
    link       text,
    is_read    boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_user_id ON public.customer_notifications(user_id);

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_notifications_select_own ON public.customer_notifications;
CREATE POLICY customer_notifications_select_own ON public.customer_notifications
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_notifications_update_own ON public.customer_notifications;
CREATE POLICY customer_notifications_update_own ON public.customer_notifications
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Trigger: toda vez que o protocolo do cliente muda de coluna no kanban
-- (via RPC move_protocol, ver KanbanService.moveCard), avisa o dono do
-- pedido. Só dispara se houver client_id (pedidos criados por bypass do
-- admin, sem client_id, não geram notificação de cliente).
CREATE OR REPLACE FUNCTION public.notificar_cliente_status_pedido()
RETURNS TRIGGER AS $$
DECLARE
    v_titulo_coluna text;
BEGIN
    IF NEW.client_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
        SELECT title INTO v_titulo_coluna FROM public.kanban_columns WHERE id = NEW.column_id;

        INSERT INTO public.customer_notifications (user_id, title, message, type, link)
        VALUES (
            NEW.client_id,
            'Seu pedido foi atualizado',
            'O pedido ' || NEW.id || ' agora está em: ' || COALESCE(v_titulo_coluna, 'Atualizado'),
            'pedido',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notificar_cliente_status_pedido ON public.protocols;
CREATE TRIGGER trg_notificar_cliente_status_pedido
    AFTER UPDATE OF column_id ON public.protocols
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_cliente_status_pedido();


-- ============================================================
-- 5) Múltiplos endereços do cliente
-- ============================================================
-- Antes só existia profiles.address (um objeto JSON único, sobrescrito a
-- cada edição). Mantemos profiles.address como o endereço padrão/fallback
-- (é o que o autofill do checkout já lê).
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES auth.users(id),
    label        text NOT NULL DEFAULT 'Endereço',
    is_default   boolean NOT NULL DEFAULT false,
    zip          text,
    street       text,
    number       text,
    complement   text,
    neighborhood text,
    city         text,
    state        text,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id ON public.customer_addresses(user_id);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_addresses_all_own ON public.customer_addresses;
CREATE POLICY customer_addresses_all_own ON public.customer_addresses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 6) Avaliação de pedido/atendimento
-- ============================================================
-- Avaliação do PEDIDO/ATENDIMENTO (prazo, atendimento), separada de
-- product_reviews (que é por produto) e sem relação com a coluna solta
-- financial_records.customer_rating (essa é interna do financeiro).
CREATE TABLE IF NOT EXISTS public.protocol_reviews (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    protocol_id text NOT NULL REFERENCES public.protocols(id),
    user_id     uuid NOT NULL REFERENCES auth.users(id),
    rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (protocol_id, user_id)
);

ALTER TABLE public.protocol_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS protocol_reviews_insert_own ON public.protocol_reviews;
CREATE POLICY protocol_reviews_insert_own ON public.protocol_reviews
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS protocol_reviews_select_own ON public.protocol_reviews;
CREATE POLICY protocol_reviews_select_own ON public.protocol_reviews
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ============================================================
-- 7) Cupom automático de boas-vindas
-- ============================================================
-- Ao criar o cadastro (profiles AFTER INSERT), gera um cupom de uso único
-- pro cliente e avisa via customer_notifications (seção 4 acima) — o
-- cliente não lê a tabela coupons direto (RLS restrita à equipe), então o
-- aviso é o único jeito dele saber o código.
-- PRÉ-REQUISITO: a tabela public.coupons já precisa existir (migration
-- database/migrations/updates/add_coupons.sql).
CREATE OR REPLACE FUNCTION public.gerar_cupom_boas_vindas()
RETURNS TRIGGER AS $$
DECLARE
    v_codigo text;
BEGIN
    v_codigo := 'BEMVINDO-' || upper(substring(NEW.id::text, 1, 8));

    INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, usage_limit, usage_limit_per_user, active)
    VALUES (v_codigo, 'Cupom de boas-vindas - 10% na primeira compra', 'percentage', 10, 0, 1, 1, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.customer_notifications (user_id, title, message, type)
    VALUES (
        NEW.id,
        'Bem-vindo(a) à Marca Viva! 🎁',
        'Use o cupom ' || v_codigo || ' e ganhe 10% de desconto na sua primeira compra.',
        'info'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_gerar_cupom_boas_vindas ON public.profiles;
CREATE TRIGGER trg_gerar_cupom_boas_vindas
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_cupom_boas_vindas();


-- ============================================================
-- 8) Programa de indicação — cupom pessoal por cliente
-- ============================================================
-- Cada cliente tem um cupom próprio (10% pro amigo) que pode compartilhar.
-- coupons não é legível pelo cliente direto (RLS restrita à equipe), então
-- o código só sai por uma RPC SECURITY DEFINER — o cliente nunca lê a
-- tabela, só chama a função e recebe o código de volta.
ALTER TABLE public.coupons
    ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION public.get_my_referral_coupon()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_codigo text;
BEGIN
    SELECT code INTO v_codigo FROM public.coupons WHERE owner_user_id = auth.uid() LIMIT 1;

    IF v_codigo IS NULL THEN
        v_codigo := 'INDICA-' || upper(substring(auth.uid()::text, 1, 8));

        INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order_value, usage_limit_per_user, owner_user_id, active)
        VALUES (v_codigo, 'Cupom de indicação de amigo - 10% de desconto', 'percentage', 10, 0, 1, auth.uid(), true)
        ON CONFLICT DO NOTHING;

        -- Se duas abas chamarem ao mesmo tempo e colidirem no ON CONFLICT,
        -- garante que devolve o código que realmente ficou salvo.
        SELECT code INTO v_codigo FROM public.coupons WHERE owner_user_id = auth.uid() LIMIT 1;
    END IF;

    RETURN v_codigo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_coupon() TO authenticated;

-- Trigger: quando o cupom de indicação de alguém é usado por um amigo
-- (register_coupon_usage grava em coupon_usage), avisa o dono do cupom.
CREATE OR REPLACE FUNCTION public.notificar_indicacao_usada()
RETURNS TRIGGER AS $$
DECLARE
    v_owner uuid;
    v_codigo text;
BEGIN
    SELECT owner_user_id, code INTO v_owner, v_codigo FROM public.coupons WHERE id = NEW.coupon_id;

    IF v_owner IS NOT NULL THEN
        INSERT INTO public.customer_notifications (user_id, title, message, type)
        VALUES (
            v_owner,
            'Sua indicação foi usada! 🎉',
            'Alguém usou seu cupom ' || v_codigo || ' de indicação. Obrigado por divulgar a Marca Viva!',
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notificar_indicacao_usada ON public.coupon_usage;
CREATE TRIGGER trg_notificar_indicacao_usada
    AFTER INSERT ON public.coupon_usage
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_indicacao_usada();


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
-- ============================================================
