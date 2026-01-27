-- Remove Foreign Key Constraint from protocols
-- This allows "Test Users" (defined in JS with fake IDs) to create orders
-- without breaking database integrity checks.

ALTER TABLE protocols 
DROP CONSTRAINT IF EXISTS protocols_client_id_fkey;

-- Optional: If you want to allow NULLs explicitly (already allowed by default usually, but good to ensure)
ALTER TABLE protocols 
ALTER COLUMN client_id DROP NOT NULL;
