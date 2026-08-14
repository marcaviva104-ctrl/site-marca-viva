/**
 * Cria (ou atualiza senha de) um usuário no Supabase Auth e define role admin em profiles.
 *
 * Uso (na raiz do projeto):
 *   1. Crie um arquivo .env na raiz (já está no .gitignore) com:
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Settings → API → service_role — NUNCA commitar)
 *   2. Rode:
 *        node scripts/devops/create-admin-user.js seu@email.com "suaSenha"
 *
 * A service_role só existe no servidor/painel — não vai no site público.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const email = process.argv[2];
const password = process.argv[3];

async function main() {
    if (!url || !serviceKey) {
        console.error('Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env na raiz do projeto.');
        process.exit(1);
    }
    if (!email || !password) {
        console.error('Uso: node scripts/devops/create-admin-user.js <email> "<senha>"');
        process.exit(1);
    }

    const supabase = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = listData?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    let userId;

    if (found) {
        const { data, error } = await supabase.auth.admin.updateUserById(found.id, {
            password,
            email_confirm: true,
        });
        if (error) throw error;
        userId = data.user.id;
        console.log('Usuário já existia: senha atualizada e email confirmado.');
    } else {
        const { data, error } = await supabase.auth.admin.createUser({
            email: email.trim(),
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Admin' },
        });
        if (error) throw error;
        userId = data.user.id;
        console.log('Usuário criado no Auth.');
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
        {
            id: userId,
            email: email.trim(),
            full_name: 'Admin',
            role: 'admin',
            approved: true,
        },
        { onConflict: 'id' }
    );

    if (profileError) {
        console.warn('Auth OK, mas profiles:', profileError.message);
        console.warn('Ajuste manualmente role=admin no Supabase se necessário.');
    } else {
        console.log('Perfil em profiles: role=admin, approved=true.');
    }

    console.log('Pronto. Faça login no site com esse email e senha.');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
