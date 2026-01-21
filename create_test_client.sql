-- Script para criar um cliente de teste no sistema
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, criar o usuário de autenticação (se necessário)
-- IMPORTANTE: Você pode criar o user via interface do Supabase Auth ou via código
-- Este script assume que você vai criar manualmente ou via signup na aplicação

-- 2. Criar o perfil do cliente (profiles table)
-- Substitua 'USER_ID_AQUI' pelo ID do usuário criado no Auth

INSERT INTO profiles (
    id,                    -- UUID do usuário do Auth
    email,
    name,
    cpf,
    cnpj,
    phone,
    person_type,
    is_admin,
    approved,
    created_at,
    updated_at,
    -- Campos de endereço
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state
) VALUES (
    'USER_ID_AQUI',        -- ⚠️ SUBSTITUIR pelo UUID real
    'cliente.teste@marcaviva.com',
    'João Silva',
    '123.456.789-00',
    NULL,                  -- CNPJ (NULL para pessoa física)
    '(11) 98765-4321',
    'pf',                  -- Pessoa Física
    false,                 -- Não é admin
    true,                  -- Já aprovado
    NOW(),
    NOW(),
    -- Endereço
    '01310-100',
    'Av. Paulista',
    '1578',
    'Apto 42',
    'Bela Vista',
    'São Paulo',
    'SP'
);

-- 3. Verificar se foi criado com sucesso
SELECT * FROM profiles WHERE email = 'cliente.teste@marcaviva.com';

-- ALTERNATIVA: Criar cliente Pessoa Jurídica
/*
INSERT INTO profiles (
    id,
    email,
    name,
    cpf,
    cnpj,
    phone,
    person_type,
    is_admin,
    approved,
    created_at,
    updated_at,
    cep,
    street,
    number,
    complement,
    neighborhood,
    city,
    state
) VALUES (
    'USER_ID_PJ_AQUI',
    'empresa.teste@marcaviva.com',
    'Empresa Marca Viva LTDA',
    NULL,
    '12.345.678/0001-90',
    '(11) 3456-7890',
    'pj',                  -- Pessoa Jurídica
    false,
    true,
    NOW(),
    NOW(),
    '04543-907',
    'Av. Brigadeiro Faria Lima',
    '3477',
    'Sala 1001',
    'Itaim Bibi',
    'São Paulo',
    'SP'
);
*/
