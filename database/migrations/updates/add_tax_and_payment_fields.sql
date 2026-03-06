-- =================================================================
-- MIGRAÇÃO FISCAL: IMPOSTOS E TAXAS DE PAGAMENTO
-- Execute este script no Supabase SQL Editor.
-- Data: 2026-03-05
-- =================================================================

DO $$
BEGIN
    -- =====================================================
    -- TABELA: products — campos fiscais
    -- =====================================================

    -- NCM: código de 8 dígitos para classificação fiscal
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'ncm'
    ) THEN
        ALTER TABLE public.products ADD COLUMN ncm text;
        COMMENT ON COLUMN public.products.ncm IS 'Código NCM do produto (classificação fiscal SEFAZ)';
    END IF;

    -- Alíquota de imposto (%)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE public.products ADD COLUMN tax_rate numeric(5,2) DEFAULT 6.0;
        COMMENT ON COLUMN public.products.tax_rate IS 'Alíquota de imposto em % (ex: 6.0 para 6%)';
    END IF;

    -- =====================================================
    -- TABELA: protocols — campos financeiros fiscais
    -- =====================================================

    -- Cliente deseja Nota Fiscal?
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'protocols' AND column_name = 'wants_nfe'
    ) THEN
        ALTER TABLE public.protocols ADD COLUMN wants_nfe boolean DEFAULT true;
        COMMENT ON COLUMN public.protocols.wants_nfe IS 'true = cliente quer NF-e, false = sem NF (desconto de imposto)';
    END IF;

    -- Valor do imposto calculado
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'protocols' AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE public.protocols ADD COLUMN tax_amount numeric(10,2) DEFAULT 0;
        COMMENT ON COLUMN public.protocols.tax_amount IS 'Valor do imposto em R$ calculado sobre o total';
    END IF;

    -- Forma de pagamento escolhida
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'protocols' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE public.protocols ADD COLUMN payment_method text;
        COMMENT ON COLUMN public.protocols.payment_method IS 'Método de pagamento: pix, boleto, credito_1x, credito_6x, etc.';
    END IF;

    -- Taxa do Mercado Pago em R$
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'protocols' AND column_name = 'payment_fee'
    ) THEN
        ALTER TABLE public.protocols ADD COLUMN payment_fee numeric(10,2) DEFAULT 0;
        COMMENT ON COLUMN public.protocols.payment_fee IS 'Valor da taxa do Mercado Pago em R$ repassado ao cliente';
    END IF;

    -- Total final (após imposto e taxa de pagamento)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'protocols' AND column_name = 'final_amount'
    ) THEN
        ALTER TABLE public.protocols ADD COLUMN final_amount numeric(10,2);
        COMMENT ON COLUMN public.protocols.final_amount IS 'Total final cobrado do cliente: base - desconto_nfe + taxa_pagamento';
    END IF;

END $$;

DO $$
BEGIN
    RAISE NOTICE 'Migração de impostos e taxas concluída com sucesso!';
END $$;
