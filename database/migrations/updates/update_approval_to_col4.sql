-- Atualizar função para Mover para Produção (Coluna 4)
-- Antes movia para Coluna 1. Agora o fluxo é: Inbox (0) -> Aguardando Pagamento (3) -> Produção (4)

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
    -- 1. Gera o número oficial (#MV-2026-XXXX)
    v_new_id := '#MV-' || to_char(now(), 'YYYY') || '-' || floor(random() * 8999 + 1000)::text;

    -- 2. Atualiza o pedido para "Produção"
    UPDATE protocols
    SET 
        id = v_new_id,          -- Troca ID provisório pelo Oficial
        status = 'production',  -- Muda status para Produção
        column_id = 4,          -- Joga na coluna "Produção" (Antes era 1)
        payment_status = 'paid_full', -- Assume pago pois Admin clicou em "Confirmar"
        updated_at = now()
    WHERE id = p_request_id;

    -- 3. Retorna sucesso
    RETURN jsonb_build_object('success', true, 'new_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
