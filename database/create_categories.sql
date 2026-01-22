-- Create Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public categories are viewable by everyone" ON categories
FOR SELECT USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "Admins can manage categories" ON categories
FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
