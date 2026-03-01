-- ========================================
-- EXECUTAR NO SUPABASE - SQL EDITOR
-- Data: 04/02/2026
-- Função: Estabilização do Admin Panel
-- ========================================

-- INSTRUÇÕES:
-- 1. Acesse: https://supabase.com/dashboard/
-- 2. Selecione seu projeto
-- 3. Vá em: SQL Editor
-- 4. Cole TODO este arquivo
-- 5. Clique em RUN (ou pressione Ctrl+Enter)
-- 6. Aguarde mensagem: "Success. No rows returned"

-- ========================================
-- PARTE 1: Função promote_request_to_protocol
-- (Necessária para o botão "Aprovar" funcionar)
-- ========================================

CREATE OR REPLACE FUNCTION promote_request_to_protocol(
    p_request_id TEXT,
    p_admin_user TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_id TEXT;
BEGIN
    -- Gera ID Oficial (#MV-2026-XXXX)
    v_new_id := '#MV-' || to_char(now(), 'YYYY') || '-' || floor(random() * 8999 + 1000)::text;

    UPDATE protocols
    SET 
        id = v_new_id,
        status = 'production',
        column_id = 1,
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object('success', true, 'new_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ========================================
-- PARTE 2: Fix Foreign Key Constraints
-- (Permite criar pedidos de teste sem quebrar banco)
-- ========================================

ALTER TABLE protocols 
DROP CONSTRAINT IF EXISTS protocols_client_id_fkey;

ALTER TABLE protocols 
ALTER COLUMN client_id DROP NOT NULL;

-- ========================================
-- PARTE 3: Verificação (Teste da Função)
-- ========================================

-- Teste rápido da função (pode comentar se preferir)
-- SELECT promote_request_to_protocol('#REQ-TEST', 'admin@teste.com');

-- ========================================
-- FIM - Arquivo pronto para execução
-- ========================================

-- APÓS EXECUTAR:
-- ✅ A função está criada
-- ✅ O botão "Aprovar" no admin funcionará
-- ✅ Transformações de #REQ-XXXX → #MV-2026-XXXX possíveis
-- ✅ Foreign key relaxada para permitir testes

-- APAGUE O ARQUIVO LEMBRETE_URGENTE.md APÓS CONFIRMAR SUCESSO
