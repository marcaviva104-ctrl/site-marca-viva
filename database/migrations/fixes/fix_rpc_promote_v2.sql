CREATE OR REPLACE FUNCTION promote_request_to_protocol(
    p_request_id TEXT,
    p_admin_id UUID
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
    -- REQUIRES: ON UPDATE CASCADE on Foreign Keys (protocol_items, protocol_history)
    UPDATE protocols
    SET 
        id = v_new_id,
        status = 'production',
        column_id = 1, -- Move to "01. Entrada"
        updated_at = now()
    WHERE id = p_request_id;

    -- 4. Log History
    -- Using actor_id matching the table schema
    INSERT INTO protocol_history (protocol_id, action, details, actor_id)
    VALUES (
        v_new_id, 
        'PROMOTED', 
        jsonb_build_object('reason', 'Admin Approved Request', 'original_id', p_request_id), 
        p_admin_id
    );

    RETURN jsonb_build_object('success', true, 'new_id', v_new_id);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
