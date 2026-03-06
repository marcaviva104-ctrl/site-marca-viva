-- =================================================================
-- MIGRAÇÃO FISCAL: CAMPOS PARA NOTA FISCAL (NF-e)
-- Execute este script no Supabase SQL Editor.
-- Data: 2026-03-05
-- =================================================================

DO $$
BEGIN
    -- Tipo de Pessoa: 'pf' (Pessoa Física) ou 'pj' (Pessoa Jurídica)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'person_type'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN person_type text DEFAULT 'pf';
        COMMENT ON COLUMN public.profiles.person_type IS 'Tipo de pessoa: pf (física) ou pj (jurídica)';
    END IF;

    -- Inscrição Estadual (obrigatório para PJ, pode ser "ISENTO")
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'inscricao_estadual'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN inscricao_estadual text;
        COMMENT ON COLUMN public.profiles.inscricao_estadual IS 'Inscrição Estadual do cliente PJ (ou ISENTO)';
    END IF;

    -- Garantir que address seja JSONB com os subcampos de NF-e
    -- (coluna já existe, mas garantimos o default correto)
    -- Os subcampos são: cep, street, number, complement, neighborhood, city, uf
    BEGIN
        ALTER TABLE public.profiles ALTER COLUMN address SET DEFAULT '{
            "cep": "",
            "street": "",
            "number": "",
            "complement": "",
            "neighborhood": "",
            "city": "",
            "uf": ""
        }'::jsonb;
    EXCEPTION WHEN OTHERS THEN
        -- Coluna não existe ainda, ignora (será criada pela migração anterior)
        NULL;
    END;

END $$;

-- Mensagem de confirmação
DO $$
BEGIN
    RAISE NOTICE 'Migração fiscal concluída: person_type e inscricao_estadual adicionados à tabela profiles.';
END $$;
