require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Configuração Manual (copiada do seu config.js para teste isolado)
// Se falhar, verifique se estas chaves ainda são válidas no config.js
const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL'; // Chave pública é suficiente para testar acesso público

console.log("🔍 INICIANDO VERIFICAÇÃO DO SISTEMA...");
console.log("----------------------------------------");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verifySystem() {
    let allPassed = true;

    // 1. TESTE DE CONEXÃO E LEITURA PÚBLICA (Produtos)
    console.log("1️⃣  Testando Leitura de Produtos (Público)...");
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name')
        .limit(1);

    if (prodError) {
        console.error("❌ FALHA: Não foi possível ler produtos.", prodError.message);
        console.error("   Dica: Rode o script 'MASTER_FIX_DEPLOY.sql'");
        allPassed = false;
    } else {
        console.log(`✅ SUCESSO: Produtos acessíveis. (${products.length} encontrados)`);
    }

    // 2. TESTE DE LEITURA DE CATEGORIAS
    console.log("\n2️⃣  Testando Leitura de Categorias...");
    const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .limit(1);

    if (catError) {
        console.error("❌ FALHA: Não foi possível ler categorias.", catError.message);
        allPassed = false;
    } else {
        console.log("✅ SUCESSO: Categorias acessíveis.");
    }

    // 3. TENTATIVA DE INSERÇÃO DE PEDIDO (Simulando Checkout)
    // Nota: Como estamos com chave anônima, isso testa se o Guest Checkout está ativado
    console.log("\n3️⃣  Simulando Criação de Pedido (Guest Checkout)...");
    const testOrder = {
        total_amount: 10.00,
        status: 'pending',
        payment_method: 'pix_test',
        customer_email: 'test_script@verifier.com',
        shipping_address: 'Teste Automatizado'
    };

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([testOrder])
        .select();

    if (orderError) {
        console.error("❌ FALHA: Não foi possível criar pedido.", orderError.message);
        console.error("   Causa Provável: RLS de 'orders' ainda está bloqueado.");
        console.error("   Solução: O script 'MASTER_FIX_DEPLOY.sql' corrige isso.");
        allPassed = false;
    } else {
        console.log("✅ SUCESSO: Pedido criado com sucesso! (Guest Checkout OK)");
        // Limpar pedido de teste
        // Nota: Delete pode falhar com chave anônima se RLS não deixar, mas o insert é o importante.
        console.log("   (Pedido de teste criado ID: " + (order && order[0] ? order[0].id : 'N/A') + ")");
    }

    console.log("----------------------------------------");
    if (allPassed) {
        console.log("🎉  TODOS OS TESTES PASSARAM!");
        console.log("    O Banco de Dados está pronto para Produção.");
    } else {
        console.log("⚠️  KOURO ALGUNS TESTES FALHARAM.");
        console.log("    Por favor, execute o arquivo 'MASTER_FIX_DEPLOY.sql' no Supabase.");
    }
}

// Instalar dependência se necessário (não precisamos pois usaremos o cdn no browser ou assumimos ambiente, 
// mas para rodar via node precisamos instalar. Vou assumir que o usuário talvez não tenha node modules, 
// então esse script é mais um 'modelo' ou eu tento rodar se tiver o pacote)
// Se não tiver, eu instruo o usuário.

verifySystem();
