-- ============================================================
--  NOTIFICACOES DO PAINEL — cobrir os outros 3 eventos
-- ============================================================
--
--  SITUACAO ANTES DESTA MIGRATION:
--    add_notifications.sql criou a tabela e UM gatilho: pedido novo.
--    Faltava avisar de: empresa (PJ) nova pendente de aprovacao,
--    mensagem nova de cliente no chat, e item de estoque baixo —
--    mesmo o tipo 'estoque' ja estando previsto na tabela sem uso.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: idempotente, pode rodar quantas vezes precisar.
--  PRE-REQUISITO: rodar depois de add_notifications.sql,
--  add_support_chat.sql e supabase_inventory.sql (tabelas ja devem
--  existir).
-- ============================================================


-- ------------------------------------------------------------
-- 0) Liberar os tipos novos no CHECK da coluna 'type'
-- ------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('info', 'pedido', 'pagamento', 'estoque', 'alerta', 'cliente', 'chat'));


-- ------------------------------------------------------------
-- 1) Empresa (PJ) nova pendente de aprovacao
--
--    Liga direto com a fila de aprovacao B2B: cadastro de empresa
--    entra com approved = false e so pode comprar depois que o
--    admin libera em Admin -> Clientes. Sem aviso aqui, a empresa
--    podia ficar dias na fila sem ninguem perceber.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_cliente_pj_pendente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.person_type = 'pj' AND NEW.approved = false THEN
        INSERT INTO public.notifications (title, message, type, link)
        VALUES (
            'Empresa nova aguardando liberacao',
            COALESCE(NEW.full_name, 'Empresa') ||
            ' (' || COALESCE(NEW.email, 'sem e-mail') || ') se cadastrou como PJ e esta na fila.',
            'cliente',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_cliente_pj_pendente ON public.profiles;
CREATE TRIGGER trg_notificar_cliente_pj_pendente
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_cliente_pj_pendente();


-- ------------------------------------------------------------
-- 2) Mensagem nova de cliente no chat
--
--    So mensagem do CLIENTE gera aviso (sender = 'client'); resposta
--    do proprio admin nao precisa avisar o admin.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_chat_novo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chat_email text;
    chat_name  text;
BEGIN
    IF NEW.sender = 'client' THEN
        SELECT email, user_name INTO chat_email, chat_name
        FROM public.support_chats
        WHERE id = NEW.chat_id;

        INSERT INTO public.notifications (title, message, type, link)
        VALUES (
            'Mensagem nova no chat',
            COALESCE(chat_name, chat_email, 'Cliente') || ': ' ||
            left(NEW.message, 120),
            'chat',
            NEW.chat_id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_chat_novo ON public.support_messages;
CREATE TRIGGER trg_notificar_chat_novo
    AFTER INSERT ON public.support_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_chat_novo();


-- ------------------------------------------------------------
-- 3) Item de estoque cruzou o minimo (zerado tambem conta)
--
--    So avisa na hora em que o estoque CRUZA para baixo do minimo
--    (nao ficava ja baixo antes da atualizacao), para nao repetir
--    aviso a cada movimentacao enquanto o item continua baixo.
--
--    O painel usa duas regras diferentes entre si hoje:
--    admin.js (aba Insumos) exclui estoque zerado, mas admin.js
--    (aba Estoque) e getLowStockInputs() (products.js) contam
--    zero como baixo tambem. Este trigger segue a maioria: zero
--    conta.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_estoque_baixo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.min_stock > 0 AND NEW.stock <= NEW.min_stock
       AND NOT (OLD.min_stock > 0 AND OLD.stock <= OLD.min_stock) THEN
        INSERT INTO public.notifications (title, message, type, link)
        VALUES (
            'Estoque baixo: ' || NEW.name,
            'Restam ' || NEW.stock || ' ' || COALESCE(NEW.unit, 'un') ||
            ' (minimo: ' || NEW.min_stock || ').',
            'estoque',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_estoque_baixo ON public.inventory_items;
CREATE TRIGGER trg_notificar_estoque_baixo
    AFTER UPDATE ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_estoque_baixo();


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  COMO TESTAR:
--    1) Cadastre uma empresa PJ no site -> sino deve mostrar
--       "Empresa nova aguardando liberacao".
--    2) Mande uma mensagem pelo widget de chat -> sino deve
--       mostrar "Mensagem nova no chat".
--    3) Edite um insumo no painel e baixe o estoque para igual
--       ou menor que o minimo -> sino deve mostrar "Estoque baixo".
--
--  Se quiser desligar algum aviso depois:
--    DROP TRIGGER trg_notificar_cliente_pj_pendente ON public.profiles;
--    DROP TRIGGER trg_notificar_chat_novo ON public.support_messages;
--    DROP TRIGGER trg_notificar_estoque_baixo ON public.inventory_items;
-- ============================================================
