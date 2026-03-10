/**
 * Script para criar cliente de teste via JavaScript
 * Execute no console do navegador com a aplicação carregada
 */

async function createTestClient() {
    if (!window.authService) {
        console.error('❌ authService não disponível');
        return;
    }

    console.log('📝 Criando cliente de teste...');

    const testClientData = {
        email: 'cliente.teste@marcaviva.com',
        password: 'Teste@123',
        name: 'João Silva',
        cpf: '123.456.789-00',
        phone: '(11) 98765-4321',
        person_type: 'pf',
        // Endereço
        cep: '01310-100',
        street: 'Av. Paulista',
        number: '1578',
        complement: 'Apto 42',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP'
    };

    try {
        // 1. Criar usuário no Supabase Auth
        console.log('1️⃣ Criando usuário no Auth...');
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email: testClientData.email,
            password: testClientData.password,
            options: {
                data: {
                    name: testClientData.name
                }
            }
        });

        if (authError) {
            console.error('❌ Erro ao criar auth:', authError);
            return;
        }

        console.log('✅ Usuário criado no Auth:', authData.user.id);

        // 2. Criar perfil no banco
        console.log('2️⃣ Criando perfil...');
        const { data: profileData, error: profileError } = await window.supabase
            .from('profiles')
            .insert([
                {
                    id: authData.user.id,
                    email: testClientData.email,
                    name: testClientData.name,
                    cpf: testClientData.cpf,
                    phone: testClientData.phone,
                    person_type: testClientData.person_type,
                    is_admin: false,
                    approved: true, // Já aprovado
                    cep: testClientData.cep,
                    street: testClientData.street,
                    number: testClientData.number,
                    complement: testClientData.complement,
                    neighborhood: testClientData.neighborhood,
                    city: testClientData.city,
                    state: testClientData.state
                }
            ])
            .select();

        if (profileError) {
            console.error('❌ Erro ao criar perfil:', profileError);
            return;
        }

        console.log('✅ Perfil criado com sucesso!');
        console.log('📊 Dados do cliente:', profileData[0]);
        console.log('');
        console.log('🎉 CLIENTE TESTE CRIADO COM SUCESSO!');
        console.log('📧 Email:', testClientData.email);
        console.log('🔑 Senha:', testClientData.password);
        console.log('👤 ID:', authData.user.id);

        return profileData[0];

    } catch (err) {
        console.error('❌ Erro geral:', err);
    }
}

// Executar
console.log('='.repeat(50));
console.log('🚀 CRIAR CLIENTE DE TESTE');
console.log('='.repeat(50));
console.log('Execute: createTestClient()');
console.log('='.repeat(50));

// Auto-executar (opcional - remova o comentário para executar automaticamente)
// createTestClient();
