-- ============================================================
--  CHAT DE SUPORTE
--  Gerado em 14/08/2026
-- ============================================================
--
--  O chat ja esta no ar (scripts/components/chat.js, carregado na
--  home e em Meus Pedidos), mas as tabelas nunca foram criadas.
--
--  O QUE ACONTECE HOJE:
--    Cliente manda mensagem -> salva no localStorage DELE
--                           -> tenta gravar no banco -> FALHA
--    Admin le o localStorage do proprio navegador
--    Resultado: a mensagem do cliente NUNCA chega ate voce.
--
--  Este arquivo faz a mensagem chegar de verdade.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: usa IF NOT EXISTS. Pode rodar duas vezes.
-- ============================================================


-- ------------------------------------------------------------
-- 1) Conversa (uma por cliente, identificada pelo e-mail)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_chats (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id    uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    email      text NOT NULL,
    user_name  text,
    status     text NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'closed')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- O codigo usa upsert com onConflict: 'email', entao email precisa ser unico
CREATE UNIQUE INDEX IF NOT EXISTS support_chats_email_unique
    ON public.support_chats (email);

CREATE INDEX IF NOT EXISTS idx_support_chats_updated
    ON public.support_chats (updated_at DESC);

COMMENT ON TABLE public.support_chats IS 'Conversas do chat de suporte, uma por cliente.';


-- ------------------------------------------------------------
-- 2) Mensagens da conversa
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.support_messages (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id    uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
    sender     text NOT NULL DEFAULT 'client'
               CHECK (sender IN ('client', 'admin')),
    message    text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_chat
    ON public.support_messages (chat_id, created_at);

-- Evita mensagem duplicada quando o navegador sincroniza mais de uma vez
CREATE UNIQUE INDEX IF NOT EXISTS support_messages_sem_duplicata
    ON public.support_messages (chat_id, created_at, md5(message));

COMMENT ON TABLE public.support_messages IS 'Mensagens trocadas no chat de suporte.';


-- ------------------------------------------------------------
-- 3) Seguranca
--
--    ESCREVER: qualquer visitante pode (o chat atende quem ainda
--              nao tem conta - e o objetivo dele).
--    LER:      so admin/funcionario. O cliente le a conversa dele
--              do proprio navegador (localStorage), nao do banco.
-- ------------------------------------------------------------
ALTER TABLE public.support_chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Visitante pode abrir conversa e mandar mensagem
DROP POLICY IF EXISTS support_chats_insert_todos ON public.support_chats;
CREATE POLICY support_chats_insert_todos ON public.support_chats
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS support_chats_update_todos ON public.support_chats;
CREATE POLICY support_chats_update_todos ON public.support_chats
    FOR UPDATE TO anon, authenticated
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS support_messages_insert_todos ON public.support_messages;
CREATE POLICY support_messages_insert_todos ON public.support_messages
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- O upsert precisa conseguir ler o id da conversa que acabou de gravar
DROP POLICY IF EXISTS support_chats_select_todos ON public.support_chats;
CREATE POLICY support_chats_select_todos ON public.support_chats
    FOR SELECT TO anon, authenticated
    USING (true);

-- Ler mensagem: so a equipe
DROP POLICY IF EXISTS support_messages_select_equipe ON public.support_messages;
CREATE POLICY support_messages_select_equipe ON public.support_messages
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'employee')
    ));


-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  ATENCAO - LIMITACAO CONHECIDA:
--  A leitura da conversa (support_chats) esta liberada para
--  qualquer visitante. Isso permite que alguem descubra o e-mail
--  e o nome de quem usou o chat. Nao vaza o conteudo das
--  mensagens, mas tambem nao e ideal.
--
--  O jeito certo e mover a sincronizacao para uma Edge Function,
--  junto com o resto do backend (Etapa 1 do replanejamento).
--  Ate la, isto ja e melhor do que perder a mensagem do cliente.
-- ============================================================
