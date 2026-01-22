-- Liberar acesso total para Categorias (Correção de Erro RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas restritivas
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON categories;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON categories;

-- Criar policies permissivas (públicas) para evitar bloqueios
CREATE POLICY "Enable insert for all" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON categories FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all" ON categories FOR DELETE USING (true);
