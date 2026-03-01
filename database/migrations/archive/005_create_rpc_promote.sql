-- Migration: 005_create_rpc_promote.sql
-- Description: Creates the RPC function to promote a Request (inquiry) to a Protocol (production).

-- Function: promote_request_to_protocol
-- Logic:
-- 1. Checks if the protocol exists and is in 'inquiry' status.
-- 2. Generates a NEW official ID (#MV-YYYY-XXXX).
-- 3. Updates the record with the new ID, status='production', and moves to column 1.
-- 4. Logs the action in protocol_history.

CREATE OR REPLACE FUNCTION promote_request_to_protocol(
    p_request_id TEXT,
    p_admin_user TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_protocol_id TEXT;
    v_new_id TEXT;
    v_year TEXT;
    v_random TEXT;
BEGIN
    -- 1. Check if exists and is inquiry
    SELECT id INTO v_protocol_id
    FROM protocols
    WHERE id = p_request_id AND status = 'inquiry';

    IF v_protocol_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado ou já processado.');
    END IF;

    -- 2. Generate Official MV ID
    v_year := to_char(now(), 'YYYY');
    v_random := floor(random() * 8999 + 1000)::text;
    v_new_id := '#MV-' || v_year || '-' || v_random;

    -- 3. Update the record
    -- CRITICAL: We are changing the Primary Key (id). 
    -- This requires CASCADE on foreign keys (protocol_items, protocol_history).
    -- If FKs are not set to CASCADE, this will fail.
    -- Option B (Safer): Keep ID, add 'display_id'. 
    -- However, for this implementation we will assume the User wants the ID to literally change.
    
    UPDATE protocols
    SET 
        id = v_new_id,
        status = 'production',
        column_id = 1, -- Move to "01. Entrada"
        updated_at = now()
    WHERE id = p_request_id;

    -- 4. Log History (Using the NEW ID)
    INSERT INTO protocol_history (protocol_id, action, details, user_email)
    VALUES (v_new_id, 'PROMOTED', '{"reason": "Admin Approved Request", "original_id": "' || p_request_id || '"}', p_admin_user);

    RETURN jsonb_build_object('success', true, 'new_id', v_new_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
