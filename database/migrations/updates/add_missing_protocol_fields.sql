-- SQL para Adição de Campos nas Tabelas de Protocolos
-- Execute este script no SQL Editor do seu Supabase

-- 1. Tabela protocols
ALTER TABLE public.protocols 
ADD COLUMN IF NOT EXISTS wants_nfe boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS production_steps jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS assigned_to uuid,
ADD COLUMN IF NOT EXISTS production_notes text;

-- Comentários para documentação
COMMENT ON COLUMN public.protocols.wants_nfe IS 'true = cliente quer NF-e, false = sem NF (desconto de imposto)';
COMMENT ON COLUMN public.protocols.tax_amount IS 'Valor retido de imposto';
COMMENT ON COLUMN public.protocols.payment_fee IS 'Taxa de processamento de pagamento';

-- 2. Índices para performance (opcional, mas recomendado)
CREATE INDEX IF NOT EXISTS idx_protocols_status ON public.protocols(status);
CREATE INDEX IF NOT EXISTS idx_protocols_client_email ON public.protocols(client_email);
