-- ========================================
-- SETUP COMPLETO DE CATEGORIAS
-- ========================================

-- 1. Criar tabela de categorias (se não existe)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL
);

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- 3. Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4. Limpar políticas antigas
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON categories;

-- 5. Criar políticas de acesso
CREATE POLICY "Enable read access for all users" ON categories FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON categories FOR DELETE USING (auth.role() = 'authenticated');

-- ========================================
-- POPULAR CATEGORIAS
-- ========================================

-- Limpar categorias existentes (CUIDADO: só use isso se quiser resetar)
-- TRUNCATE categories CASCADE;

-- Inserir categorias principais (roots)
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Tecnologia', 'tecnologia', NULL),
    ('Papelaria', 'papelaria', NULL),
    ('Drinkware', 'drinkware', NULL),
    ('Kits Corporativos', 'kits-corporativos', NULL),
    ('Ecológicos', 'ecologicos', NULL),
    ('Vestuário', 'vestuario', NULL)
ON CONFLICT (name) DO NOTHING;

-- Inserir subcategorias (opcional - descomente se quiser hierarquia)
/*
-- Subcategorias de Tecnologia
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Power Banks', 'power-banks', (SELECT id FROM categories WHERE name = 'Tecnologia')),
    ('Pen Drives', 'pen-drives', (SELECT id FROM categories WHERE name = 'Tecnologia')),
    ('Fones de Ouvido', 'fones-de-ouvido', (SELECT id FROM categories WHERE name = 'Tecnologia'))
ON CONFLICT (name) DO NOTHING;

-- Subcategorias de Papelaria
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Cadernos', 'cadernos', (SELECT id FROM categories WHERE name = 'Papelaria')),
    ('Canetas', 'canetas', (SELECT id FROM categories WHERE name = 'Papelaria')),
    ('Blocos de Notas', 'blocos-de-notas', (SELECT id FROM categories WHERE name = 'Papelaria'))
ON CONFLICT (name) DO NOTHING;

-- Subcategorias de Drinkware
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Garrafas Térmicas', 'garrafas-termicas', (SELECT id FROM categories WHERE name = 'Drinkware')),
    ('Copos', 'copos', (SELECT id FROM categories WHERE name = 'Drinkware')),
    ('Canecas', 'canecas', (SELECT id FROM categories WHERE name = 'Drinkware'))
ON CONFLICT (name) DO NOTHING;
*/

-- Verificar categorias criadas
SELECT * FROM categories ORDER BY parent_id NULLS FIRST, name;
