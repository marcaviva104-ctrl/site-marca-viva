# ⚠️ IMPORTANTE: Pendência de Banco de Dados

**Você precisa rodar este código no Supabase para o botão "Aprovar" funcionar.**

## Passos:
1. Acesse o Supabase: https://supabase.com/dashboard/
2. Vá em **SQL Editor**.
3. Cole e execute (**RUN**) o código abaixo:

```sql
-- Habilita a função de transformar Orçamento em Protocolo Oficial
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
```

Apague este arquivo após executar.
