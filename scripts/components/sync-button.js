
// sync-button.js
// Componente de Botão de Sincronização Global
// Injeta um botão flutuante que envia os dados da página atual para o Supabase
// Versão Independente (Funciona em login, index e admin)

(function () {
    // Evitar duplicatas
    if (document.getElementById('mv-global-sync-btn')) return;

    // 1. Criar Estilos do Botão
    const style = document.createElement('style');
    style.innerHTML = `
        .global-sync-btn {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: #2563eb; /* Azul */
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
            cursor: pointer;
            z-index: 9999;
            transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
            border: none;
        }

        .global-sync-btn:hover {
            transform: scale(1.1);
            background: #1d4ed8;
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6);
        }

        .global-sync-btn:active {
            transform: scale(0.95);
        }

        .global-sync-btn i {
            font-size: 28px;
            animation: none;
        }

        .global-sync-btn.syncing i {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            100% { transform: rotate(360deg); }
        }
        
        /* Toast Notification */
        .sync-toast {
            position: fixed;
            bottom: 100px;
            right: 30px;
            background: #1e293b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.3s, transform 0.3s;
            z-index: 10000;
            pointer-events: none;
            font-family: 'Inter', sans-serif;
            font-size: 0.9rem;
        }
        .sync-toast.show {
            opacity: 1;
            transform: translateY(0);
        }
        .sync-toast.success { border-left: 4px solid #10b981; }
        .sync-toast.error { border-left: 4px solid #ef4444; }
    `;
    document.head.appendChild(style);

    // 2. Criar Elementos HTML
    const btn = document.createElement('button');
    btn.id = 'mv-global-sync-btn';
    btn.className = 'global-sync-btn';
    btn.title = "Sincronizar com Supabase";
    btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i>';
    document.body.appendChild(btn);

    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    document.body.appendChild(toast);

    // 3. Função de Mostrar Toast
    function showToast(msg, type = 'success') {
        toast.textContent = msg;
        toast.className = `sync-toast show ${type}`;
        setTimeout(() => {
            toast.className = 'sync-toast'; // Hide
        }, 3000);
    }

    // 4. Lógica de Coleta de Dados (Estratégia por Página)
    function getPageData() {
        const path = window.location.pathname;
        const pageData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            title: document.title,
            userAgent: navigator.userAgent
        };

        // Lógica específica para Admin
        if (path.includes('admin.html') || document.title.includes('Admin')) {
            pageData.context = 'admin_dashboard';

            // Tentar coletar estatísticas visíveis
            const pending = document.getElementById('count-pending')?.innerText;
            if (pending) pageData.pending_orders = pending;

            const paid = document.getElementById('count-paid')?.innerText;
            if (paid) pageData.paid_orders = paid;

        } else if (path.includes('login.html')) {
            pageData.context = 'login_page';
        } else {
            pageData.context = 'storefront';
            // Tentar ver carrinho
            const cart = localStorage.getItem('cart');
            if (cart) {
                try {
                    const items = JSON.parse(cart);
                    pageData.cartRange = items.length;
                } catch (e) { }
            }
        }

        return pageData;
    }

    // 5. Função Principal de Sync
    // 5. Função Principal de Sync
    async function performSync() {
        // PRIORIDADE: Se estiver no Admin, usar a lógica poderosa do AdminApp (Produtos, Financeiro, etc)
        if (typeof window.adminApp !== 'undefined' && window.adminApp.syncLocalDataToSupabase) {
            console.log("Global Button: Delegando para AdminApp...");
            window.adminApp.syncLocalDataToSupabase();
            return;
        }

        // LÓGICA LIGHT (Login/Loja): Apenas Log de Acesso + Reload
        if (!window.supabase) {
            showToast('Erro: Supabase não conectado', 'error');
            return;
        }

        btn.classList.add('syncing');

        try {
            const payload = getPageData();
            console.log("Sync Button: Enviando Log...", payload);

            const { data, error } = await window.supabase
                .from('app_sync_logs')
                .insert([{ page_context: payload.context, payload: payload }]);

            if (error) throw error;

            showToast('Dados Sincronizados!', 'success');

            // Reload para garantir dados frescos
            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err) {
            console.error('Erro no Sync:', err);
            if (err.message && err.message.includes('relation "app_sync_logs" does not exist')) {
                showToast('Tabela de logs não existe (ignorado)', 'error');
                // Ainda reload mesmo com erro de log, para atualizar a tela
                setTimeout(() => window.location.reload(), 1000);
            } else {
                showToast('Erro ao salvar log: ' + err.message, 'error');
            }
        } finally {
            setTimeout(() => btn.classList.remove('syncing'), 500);
        }
    }

    // 6. Event Listener
    btn.addEventListener('click', performSync);

})();
