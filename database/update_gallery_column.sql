-- Add gallery column to support multiple images per product
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS gallery TEXT[] DEFAULT '{}';

-- Index is not strictly necessary for array column unless searching inside it, 
-- but ensuring the column exists is crucial.
