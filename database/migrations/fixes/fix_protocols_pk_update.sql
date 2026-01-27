-- FIX: Enable Cascade Update on Protocol ID
-- Context: When promoting a Request (#REQ-...) to Protocol (#MV-...), we update the ID.
-- This was failing because foreign keys (items and history) were blocking the update.

DO $$
BEGIN

  -- 1. Fix protocol_items FK
  -- Try to find the existing constraint name. Usually 'protocol_items_protocol_id_fkey'.
  ALTER TABLE protocol_items
  DROP CONSTRAINT IF EXISTS protocol_items_protocol_id_fkey;

  -- Add new constraint with ON UPDATE CASCADE
  ALTER TABLE protocol_items
  ADD CONSTRAINT protocol_items_protocol_id_fkey
  FOREIGN KEY (protocol_id)
  REFERENCES protocols(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;


  -- 2. Fix protocol_history FK
  -- Try to find existing constraint. Usually 'protocol_history_protocol_id_fkey'.
  ALTER TABLE protocol_history
  DROP CONSTRAINT IF EXISTS protocol_history_protocol_id_fkey;

  -- Add new constraint with ON UPDATE CASCADE
  ALTER TABLE protocol_history
  ADD CONSTRAINT protocol_history_protocol_id_fkey
  FOREIGN KEY (protocol_id)
  REFERENCES protocols(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

END $$;
