-- =================================================================
-- ETAPA 2: HISTÓRICO FINANCEIRO
-- Execute este script no Supabase SQL Editor.
-- =================================================================

-- 1. Criar a tabela para guardar o histórico financeiro
-- Isso permite saber quem apagou um pedido, quando entrou dinheiro, etc.
CREATE TABLE IF NOT EXISTS public.financial_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL, -- ex: 'create', 'payment', 'delete', 'update'
    entity_type TEXT NOT NULL, -- ex: 'manual_debt', 'order'
    entity_id TEXT NOT NULL,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID, -- ID do usuário que fez a ação (opcional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Ativar Segurança (RLS)
ALTER TABLE public.financial_history ENABLE ROW LEVEL SECURITY;

-- 3. Permitir acesso total (Por enquanto, para garantir que funcione)
-- Em produção, você pode restringir isso apenas para Admins.
DROP POLICY IF EXISTS "Public full access financial_history" ON public.financial_history;

CREATE POLICY "Public full access financial_history"
ON public.financial_history
FOR ALL
USING (true);

-- FIM DA ETAPA 2
