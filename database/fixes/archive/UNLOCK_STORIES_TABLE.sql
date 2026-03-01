-- 🔓 SCRIPT DE LIBERAÇÃO TOTAL DA TABELA STORIES (UNLOCK_STORIES_TABLE)
-- O erro da sua imagem diz "policy for table stories". É aqui que está travando agora!

-- 1. Remove TODAS as políticas antigas da tabela stories
DROP POLICY IF EXISTS "Stories são públicos" ON public.stories;
DROP POLICY IF EXISTS "Admins gerenciam stories" ON public.stories;
DROP POLICY IF EXISTS "Leitura Publica Stories" ON public.stories;
DROP POLICY IF EXISTS "Logado Pode Gerenciar Stories" ON public.stories;
DROP POLICY IF EXISTS "Auth Manage Stories" ON public.stories;
DROP POLICY IF EXISTS "Public See Stories" ON public.stories;
DROP POLICY IF EXISTS "Anon Pode Ver Stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated Pode Insert Stories" ON public.stories;

-- 2. CRIA POLÍTICA "LIBERA GERAL" (Leitura e Escrita)
-- Isso remove qualquer barreira. Se falhar agora, é feitiçaria.

CREATE POLICY "Liberou Geral Stories"
ON public.stories FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Garante RLS ativado (para a política funcionar)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

SELECT '✅ Tabela stories 100% LIBERADA.' as status;
