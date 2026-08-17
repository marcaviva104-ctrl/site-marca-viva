-- ============================================================
--  CHAT DE SUPORTE — cliente logado passa a ver a resposta do admin
-- ============================================================
--
--  O QUE ACONTECE HOJE (antes desta migration):
--    Admin responde pelo painel -> grava certinho em support_messages
--    Widget do cliente nunca le support_messages (so lia localStorage)
--    Mesmo se o widget tentasse ler, a regra de seguranca bloqueava:
--    "Ler mensagem: so a equipe" (support_messages_select_equipe)
--    Resultado: resposta do admin nunca chega no cliente.
--
--  Esta migration libera LEITURA da propria conversa para o cliente
--  LOGADO, comparando o e-mail da conversa com o e-mail da conta
--  autenticada (auth.uid() -> profiles.email). Visitante anonimo
--  continua sem leitura em tempo real (nao ha como confiar num
--  e-mail digitado sem login) - a mensagem dele ainda chega no
--  admin normalmente, so a resposta ao vivo no widget nao aparece.
--
--  COMO USAR: SQL Editor do Supabase -> New query -> colar -> RUN
--  E SEGURO: idempotente, pode rodar quantas vezes precisar.
-- ============================================================

DROP POLICY IF EXISTS support_messages_select_own ON public.support_messages;
CREATE POLICY support_messages_select_own ON public.support_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.support_chats sc
            JOIN public.profiles p ON p.email = sc.email
            WHERE sc.id = support_messages.chat_id
              AND p.id = auth.uid()
        )
    );

-- ============================================================
--  FIM. Esperado: "Success. No rows returned".
--
--  Confere se pegou (rode como o proprio cliente, ou olhe
--  pg_policies): a tabela support_messages deve ter agora duas
--  policies de SELECT — a da equipe (todas as conversas) e esta
--  (so a propria conversa, por e-mail).
-- ============================================================
