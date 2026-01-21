-- ================================================
-- SETUP ADMIN ROLE - Marca Viva
-- ================================================
-- Este script configura o sistema de roles para
-- garantir que SOMENTE o proprietário tenha acesso admin
-- ================================================

-- 1. Adicionar coluna 'role' na tabela profiles (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'client';
    END IF;
END $$;

-- 2. Definir todos os usuários existentes como 'client' (se role for NULL)
UPDATE profiles 
SET role = 'client' 
WHERE role IS NULL;

-- 3. Marcar o email do proprietário como ADMIN
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'leivinjesus57@gmail.com';

-- 4. Se o perfil do admin ainda não existe, vamos criá-lo manualmente
-- (isso garante que mesmo se você ainda não tiver feito login, o role estará pronto)
INSERT INTO profiles (email, role, name)
VALUES ('leivinjesus57@gmail.com', 'admin', 'Admin Marca Viva')
ON CONFLICT (email) 
DO UPDATE SET role = 'admin';

-- 5. Criar índice para melhorar performance em verificações de role
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- ================================================
-- CONFIRMAÇÃO
-- ================================================
-- Verificar se o admin foi configurado corretamente
SELECT 
    email,
    role,
    name,
    created_at
FROM profiles 
WHERE role = 'admin';

-- Deve retornar: leivinjesus57@gmail.com com role = 'admin'
