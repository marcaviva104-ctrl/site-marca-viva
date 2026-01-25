-- ========================================
-- CORRIGIR ERRO: Recursão Infinita - Aba Clientes
-- Execute este SQL no Supabase SQL Editor
-- ========================================

-- Problema: Política RLS da tabela "profiles" causa loop infinito
-- Solução: Usar auth.uid() ao invés de SELECT na própria tabela

-- ========================================
-- PASSO 1: Remover Políticas Antigas
-- ========================================

-- Remove política SELECT antiga (que causa recursão)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON profiles;

-- Remove política UPDATE antiga
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile data" ON profiles;

-- Remove política INSERT antiga (se existir)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

-- ========================================
-- PASSO 2: Criar Políticas CORRETAS (SEM RECURSÃO)
-- ========================================

-- Política SELECT (Ver perfis)
-- ✅ CORRETO: Usa auth.uid() direto, sem consultar a tabela
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Política UPDATE (Editar perfis)
-- ✅ CORRETO: Usa auth.uid() direto
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Política INSERT (Criar perfil)
-- ✅ CORRETO: Permite criar perfil após cadastro
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- ========================================
-- PASSO 3: Verificar se funcionou
-- ========================================

-- Testar consulta (deve retornar dados sem erro)
SELECT id, email, name, role 
FROM profiles 
LIMIT 3;

-- ========================================
-- PRONTO!
-- ========================================
-- Agora a aba "Clientes" no admin deve funcionar!
-- Sem mais erros de recursão infinita! ✅
