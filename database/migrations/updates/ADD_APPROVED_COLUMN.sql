-- =================================================================
-- PASSO FINAL: CRIAR COLUNAS DE APROVAÇÃO (Oculta erros de "Coluna não encontrada")
-- =================================================================

-- 1. Cria a coluna 'approved' (Se aprovado ou não)
--    Default true para não bloquear ninguém antigo sem querer
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS approved boolean DEFAULT true;

-- 2. Cria a coluna 'permissions' (Para o admin dar poderes específicos)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- 3. Atualiza todo mundo para 'Aprovado' (Pra garantir que ninguém fique trancado)
UPDATE public.profiles SET approved = true;

-- 4. BLOQUEIA A YESLENA (Para você testar o botão de aprovar)
--    Assim ela vai aparecer como "Pendente" e você poderá clicar no botão.
UPDATE public.profiles 
SET approved = false 
WHERE email = 'romeroyeslenaz09@gmail.com';

-- 5. Garante que seu usuário Admin está aprovado e tem permissões totais (opcional, só pra garantir)
UPDATE public.profiles
SET approved = true
WHERE email = 'leivinjesus57@gmail.com';

-- 6. Verifica se deu certo
SELECT email, approved, permissions FROM public.profiles;
