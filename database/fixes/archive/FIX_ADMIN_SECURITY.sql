-- =================================================================
-- CORREÇÃO DE SEGURANÇA (FINAL - VERSÃO CORRIGIDA V2)
-- =================================================================

-- 1. Verifica se a coluna 'role' existe e cria se precisar
--    (Para evitar erros futuros se o banco estiver muito antigo)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
END $$;

-- 2. Tira admin de TODO MUNDO (Zera tudo)
UPDATE public.profiles SET role = 'user' WHERE role = 'admin';

-- 3. Devolve admin SÓ PARA VOCÊ (leivinjesus57@gmail.com)
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'leivinjesus57@gmail.com'; 

-- 4. (Opcional) Deletar usuário - DESATIVADO A PEDIDO
-- DELETE FROM public.profiles WHERE email = 'romeroyeslenaz09@gmail.com';
-- DELETE FROM auth.users WHERE email = 'romeroyeslenaz09@gmail.com';

-- 5. Garante que o padrão é 'user' para novos cadastros
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'user';

-- 6. Confirmação (Deve aparecer APENAS o seu email)
SELECT email, role FROM public.profiles WHERE role = 'admin';
was