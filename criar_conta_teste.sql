-- ============================================
-- CRIAR CONTA DE TESTE PARA DESENVOLVIMENTO
-- ============================================
-- Execute este script no Supabase SQL Editor
-- para criar uma conta de teste para desenvolvimento

-- CREDENCIAIS DA CONTA DE TESTE:
-- Email: teste@marcaviva.com
-- Senha: Teste123!
-- Nome: Cliente Teste
-- Tipo: PF (Pessoa Física)
-- CPF: 12345678900
-- Telefone: (11) 99999-9999

-- ============================================
-- INSTRUÇÕES:
-- 1. Copie este script
-- 2. Acesse o Supabase Dashboard > SQL Editor
-- 3. Cole e execute
-- 4. Use as credenciais acima para login
-- ============================================

-- Primeiro, criar o usuário na tabela auth.users
-- NOTA: O Supabase geralmente cria usuários via API signup,
-- mas para testes você pode usar a função de registro normal do site
-- ou criar manualmente aqui

-- Como não podemos inserir diretamente em auth.users via SQL,
-- vamos criar apenas o perfil (profile) para um usuário existente
-- Você precisará registrar via interface primeiro, ou usar este script
-- alternativo que funciona no Supabase

-- OPÇÃO 1: Use a interface de registro do site com estas informações:
-- Email: teste@marcaviva.com
-- Senha: Teste123!
-- Nome: Cliente
-- Sobrenome: Teste
-- CPF: 12345678900
-- Telefone: (11) 99999-9999

-- OPÇÃO 2: Se você tiver acesso ao painel admin do Supabase Auth,
-- crie o usuário lá com o email teste@marcaviva.com

-- OPÇÃO 3: Execute este código JavaScript no console do browser
-- enquanto estiver na página de registro:

/*
// Cole este código no console do navegador da página de registro:
async function criarContaTeste() {
    // Preencher o formulário
    document.getElementById('modal-reg-name').value = 'Cliente';
    document.getElementById('modal-reg-surname').value = 'Teste';
    document.getElementById('modal-reg-cpf').value = '12345678900';
    document.getElementById('modal-reg-phone').value = '11999999999';
    document.getElementById('modal-reg-email').value = 'teste@marcaviva.com';
    document.getElementById('modal-reg-pass').value = 'Teste123!';
    
    // Submeter
    await submitModalRegister();
    
    console.log('✅ Conta de teste criada!');
    console.log('Email: teste@marcaviva.com');
    console.log('Senha: Teste123!');
}

criarContaTeste();
*/

-- ============================================
-- VERIFICAR SE A CONTA FOI CRIADA
-- ============================================
-- Execute esta query para verificar:

SELECT 
    id,
    name,
    email,
    role,
    type,
    cpf,
    phone,
    created_at
FROM profiles
WHERE email = 'teste@marcaviva.com';

-- ============================================
-- DELETAR A CONTA DE TESTE (SE NECESSÁRIO)
-- ============================================
-- Se precisar remover a conta de teste, execute:

/*
DELETE FROM profiles WHERE email = 'teste@marcaviva.com';
-- NOTA: Você também precisará deletar o usuário do Auth Dashboard
*/
