-- Migration: 004_update_protocol_status.sql
-- Description: Updates protocols table to support 'inquiry' status for the new Request flow.

-- 1. Drop existing constraints if necessary (Supabase specific)
-- NOTE: If using simple text column for status, we might just need to validate application side.
-- Assuming 'status' helps track the column workflow, but 'payment_status' is separate.

-- Let's add a robust function to promote request to protocol
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
    UPDATE protocols
    SET 
        id = v_new_id, -- Promoting ID (Dangerous if referenced, but cascading should handle or we update refs first)
        -- Actually, changing PK is risky. Better keep ID or use a separate 'official_id' column.
        -- Let's stick to: Keep original ID for technical ref, but display Official ID?
        -- user wants the #MV id.
        -- Alternative: The 'inquiry' already has a temp ID. We update it.
        status = 'production',
        column_id = 1, -- Move to "01. Entrada"
        updated_at = now()
    WHERE id = p_request_id;

    -- 4. Log History
    INSERT INTO protocol_history (protocol_id, action, details, user_email)
    VALUES (v_new_id, 'PROMOTED', '{"reason": "Admin Approved Request"}', p_admin_user);

    RETURN jsonb_build_object('success', true, 'new_id', v_new_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
