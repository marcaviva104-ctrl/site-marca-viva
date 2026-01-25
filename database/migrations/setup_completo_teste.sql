-- ================================================
-- SCRIPT COMPLETO DE SETUP PARA TESTES
-- Execute este SQL no Supabase SQL Editor
-- ================================================

-- 🎁 PARTE 1: INSERIR PRODUTO DE TESTE BARATO
-- ================================================

-- Inserir produto de teste de R$ 2,00
INSERT INTO products (
    id,
    name,
    description,
    category,
    price,
    cost,
    min_qty,
    stock,
    status,
    image,
    created_at
) VALUES (
    'TEST-ADESIVO-001',
    '🔖 Adesivo Teste - R$ 2,00',
    'Produto de teste para validar fluxo completo de compra. Adesivo pequeno personalizado.',
    'Adesivos',
    2.00,
    0.50,
    1,
    100,
    'active',
    'https://images.unsplash.com/photo-1572375927902-1c09ec8bb596?w=500&q=80',
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    price = 2.00,
    stock = 100,
    status = 'active';

-- Verificar produto inserido
SELECT id, name, price, stock, status FROM products WHERE id = 'TEST-ADESIVO-001';


-- 🔧 PARTE 2: TRANSFORMAR USUÁRIO EXISTENTE EM ADMIN
-- ================================================
-- IMPORTANTE: Substitua 'SEU_EMAIL@GMAIL.COM' pelo email de um usuário que já existe!
-- Este usuário precisa ter sido criado via signup no site primeiro.

-- Opção A: Se você souber o email do usuário
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'SEU_EMAIL@GMAIL.COM';

-- Opção B: Ver todos os usuários e escolher um
SELECT id, email, full_name, role FROM profiles;

-- Depois de executar a Opção B, pegue o email e execute:
-- UPDATE profiles SET role = 'admin' WHERE email = 'email_do_usuario@gmail.com';


-- ✅ RESUMO FINAL
-- ================================================
SELECT 
    '✅ Setup Completo!' as status,
    (SELECT COUNT(*) FROM profiles WHERE role = 'admin') as admins_count,
    (SELECT COUNT(*) FROM products WHERE id = 'TEST-ADESIVO-001') as produto_teste_count;
