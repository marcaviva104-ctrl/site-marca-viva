-- ============================================================
--  NOTIFICACOES DO PAINEL (a sininha do admin)
--  Gerado em 14/08/2026
-- ============================================================
--
--  SITUACAO HOJE:
--    O admin.js LE a tabela 'notifications', mas ela nao existe.
--    E, mesmo se existisse, nenhum codigo do sistema ESCREVE nela.
--    Ou seja: a sininha ficaria sempre vazia.
--
--  O QUE ESTE ARQUIVO FAZ:
--    1. Cria a tabela
--    2. Cria um gatilho no banco: toda vez que entrar um pedido
--       novo, a notificacao aparece sozinha no painel
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: usa IF NOT EXISTS. Pode rodar duas vezes.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Tabela
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    title      text NOT NULL,
    message    text,
    -- tipo serve para escolher o icone / cor no painel depois
    type       text NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'pedido', 'pagamento', 'estoque', 'alerta')),
    link       text,          -- para onde levar ao clicar (opcional)
    is_read    boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recentes
    ON public.notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_nao_lidas
    ON public.notifications (is_read, created_at DESC)
    WHERE is_read = false;

COMMENT ON TABLE public.notifications IS 'Avisos que aparecem na sininha do painel admin.';


-- ------------------------------------------------------------
-- 2) Gatilho: pedido novo gera aviso automatico
--
--    Sem isto a tabela ficaria sempre vazia, porque nenhuma
--    parte do sistema escreve notificacao.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notificar_pedido_novo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.notifications (title, message, type, link)
    VALUES (
        'Novo pedido ' || NEW.id,
        COALESCE(NEW.client_name, 'Cliente') ||
        ' enviou um orcamento de R$ ' ||
        to_char(COALESCE(NEW.total_amount, 0), 'FM999999990.00'),
        'pedido',
        NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_pedido_novo ON public.protocols;
CREATE TRIGGER trg_notificar_pedido_novo
    AFTER INSERT ON public.protocols
    FOR EACH ROW
    EXECUTE FUNCTION public.notificar_pedido_novo();


-- ------------------------------------------------------------
-- 3) Seguranca: so a equipe ve e marca como lida.
--    Cliente nenhum enxerga esta tabela.
-- ------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_equipe ON public.notifications;
CREATE POLICY notifications_equipe ON public.notifications
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  COMO TESTAR: faca um pedido no site. Ao abrir o painel,
--  a sininha deve mostrar "Novo pedido #REQ-0001".
--
--  Se quiser desligar o aviso automatico depois:
--    DROP TRIGGER trg_notificar_pedido_novo ON public.protocols;
-- ============================================================
