-- =================================================================
-- CORREÇÃO: COLUNAS FALTANTES NA TABELA PROFILES
-- Execute este script no Supabase SQL Editor para corrigir o cadastro.
-- =================================================================

-- 1. Adicionar colunas necessárias se não existirem
DO $$
BEGIN
    -- CPF / CNPJ
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'cpf') THEN
        ALTER TABLE public.profiles ADD COLUMN cpf text;
    END IF;

    -- Telefone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone text;
    END IF;

    -- Data de Nascimento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'birthdate') THEN
        ALTER TABLE public.profiles ADD COLUMN birthdate date; -- ou text se preferir
    END IF;

    -- Gênero
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE public.profiles ADD COLUMN gender text;
    END IF;

    -- Endereço (Objeto JSON completo)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'address') THEN
        ALTER TABLE public.profiles ADD COLUMN address jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- Indicação (Onde nos conheceu)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referral') THEN
        ALTER TABLE public.profiles ADD COLUMN referral text;
    END IF;
    
    -- Permissões (Array de textos)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'permissions') THEN
         ALTER TABLE public.profiles ADD COLUMN permissions text[] DEFAULT ARRAY[]::text[];
    END IF;

END $$;

-- 2. Garantir que políticas de segurança permitam atualização
-- (Opcional, mas bom garantir que o usuário possa atualizar o próprio perfil)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING ( auth.uid() = id );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK ( auth.uid() = id );
