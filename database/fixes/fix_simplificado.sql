-- ========================================
-- FIX SIMPLIFICADO - Aba Clientes
-- ========================================
-- Se a outra aba do Supabase estiver bugada,
-- execute ESTE SQL em uma nova aba!

-- PASSO 1: Desabilitar RLS temporariamente
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- PASSO 3: Reabilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- PASSO 4: Criar políticas SIMPLES e CORRETAS
CREATE POLICY "allow_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "allow_update" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "allow_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PRONTO! Teste:
SELECT COUNT(*) FROM profiles;
