-- Allow public read access for tracking pages and test users (anon)
-- This fixes the "User not found" or "Empty list" error on track.html

DROP POLICY IF EXISTS "Public Read Protocols" ON protocols;
CREATE POLICY "Public Read Protocols" 
ON protocols FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Public Read Items" ON protocol_items;
CREATE POLICY "Public Read Items" 
ON protocol_items FOR SELECT 
USING (true);
