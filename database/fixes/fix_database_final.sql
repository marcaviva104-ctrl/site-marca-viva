-- ==========================================
-- SCRIPT DE CORREÇÃO DO BANCO DE DADOS (SUPABASE)
-- ==========================================

-- 1. Corrigir erro de "Recursão Infinita" nas políticas de perfil
-- Isso corrige o problema de login e carregamento de usuários.

drop policy if exists "Enable read access for all users" on profiles;
drop policy if exists "Enable insert for authenticated users only" on profiles;
drop policy if exists "Enable update for users based on email" on profiles;
drop policy if exists "Allow read access for authenticated users" on profiles;
drop policy if exists "Allow update for owners" on profiles;
drop policy if exists "Allow insert for owners" on profiles;

-- Nova Política Simplificada e Segura
create policy "Allow read access for authenticated users"
on profiles for select
to authenticated
using ( true );

create policy "Allow update for owners"
on profiles for update
to authenticated
using ( auth.uid() = id );

create policy "Allow insert for owners"
on profiles for insert
to authenticated
with check ( auth.uid() = id );

-- 2. Garantir que categorias são visíveis para todos (público)
drop policy if exists "Allow public read access" on categories;
create policy "Allow public read access"
on categories for select
to public
using ( true );

-- 3. Garantir que produtos são visíveis para todos
drop policy if exists "Allow public read access" on products;
create policy "Allow public read access"
on products for select
to public
using ( true );

-- ==========================================
-- FIM DO SCRIPT
-- Copie e cole no SQL Editor do Supabase
-- ==========================================
