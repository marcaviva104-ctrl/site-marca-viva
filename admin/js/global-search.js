/**
 * GlobalSearch — busca rápida (Ctrl+K) entre pedido, cliente, produto e cupom,
 * sem precisar saber em qual aba cada coisa mora.
 *
 * Fontes: reaproveita cache já carregado quando existe (dataManager.getProducts(),
 * adminApp._couponsCache, CRMManager.allClients) e só consulta o banco quando
 * ainda não tem nada em memória — pedidos sempre vêm do banco (a tabela é grande
 * demais pra manter em cache local).
 */
const GlobalSearch = {
    _debounceHandle: null,
    _lastQuery: '',
    _bound: false,

    escapeHtml(value) {
        return (value ?? '').toString()
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    },

    normalize(s) {
        if (window.adminApp && typeof adminApp.normalizeChatSearchText === 'function') {
            return adminApp.normalizeChatSearchText(s);
        }
        return (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    },

    open() {
        const modal = document.getElementById('modal-global-search');
        if (!modal) return;
        this.bindResultsClick();
        modal.classList.add('open');
        const input = document.getElementById('global-search-input');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 30);
        }
        this.renderEmpty();
    },

    close() {
        const modal = document.getElementById('modal-global-search');
        if (modal) modal.classList.remove('open');
    },

    toggle() {
        const modal = document.getElementById('modal-global-search');
        if (modal && modal.classList.contains('open')) this.close();
        else this.open();
    },

    renderEmpty() {
        const results = document.getElementById('global-search-results');
        if (results) {
            results.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:30px; font-size:0.85rem;">Digite pelo menos 2 letras pra buscar.</div>';
        }
    },

    handleKeydown(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    },

    debouncedRun(query) {
        clearTimeout(this._debounceHandle);
        this._debounceHandle = setTimeout(() => this.run(query), 250);
    },

    bindResultsClick() {
        if (this._bound) return;
        this._bound = true;
        const results = document.getElementById('global-search-results');
        if (!results) return;
        results.addEventListener('click', (e) => {
            const row = e.target.closest('.gs-result');
            if (!row) return;
            this.select(row.dataset.type, row.dataset.id, row.dataset.label);
        });
    },

    async searchProducts(q) {
        const products = (window.dataManager && dataManager.getProducts && dataManager.getProducts()) || [];
        const norm = this.normalize(q);
        return products
            .filter((p) => this.normalize(p.name || '').includes(norm))
            .slice(0, 6)
            .map((p) => ({
                type: 'product', id: p.id, label: p.name,
                title: p.name || 'Produto sem nome',
                subtitle: `R$ ${(Number(p.price) || 0).toFixed(2)}`
            }));
    },

    async searchCoupons(q) {
        let source = window.adminApp && adminApp._couponsCache;
        if (!source || source.length === 0) {
            if (!window.supabase) return [];
            const { data } = await window.supabase.from('coupons')
                .select('id, code, description').ilike('code', `%${q}%`).limit(6);
            source = data || [];
        }
        const norm = this.normalize(q);
        return source
            .filter((c) => this.normalize(c.code || '').includes(norm) || this.normalize(c.description || '').includes(norm))
            .slice(0, 6)
            .map((c) => ({
                type: 'coupon', id: c.id, label: c.code,
                title: c.code, subtitle: c.description || 'Cupom de desconto'
            }));
    },

    async searchCustomers(q) {
        let source = window.CRMManager && CRMManager.allClients;
        if (!source || source.length === 0) {
            if (!window.supabase) return [];
            const { data } = await window.supabase.from('customer_stats')
                .select('id, name, email')
                .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
                .limit(6);
            source = data || [];
        }
        const norm = this.normalize(q);
        return source
            .filter((c) => this.normalize(c.name || '').includes(norm) || this.normalize(c.email || '').includes(norm))
            .slice(0, 6)
            .map((c) => ({
                type: 'customer', id: c.id, label: c.name || c.email,
                title: c.name || 'Cliente sem nome', subtitle: c.email || ''
            }));
    },

    async searchOrders(q) {
        if (!window.supabase) return [];
        const safe = q.replace(/[%,]/g, '');
        const { data, error } = await window.supabase
            .from('protocols')
            .select('id, client_name, client_email, total_amount, status')
            .or(`id.ilike.%${safe}%,client_name.ilike.%${safe}%,client_email.ilike.%${safe}%`)
            .order('created_at', { ascending: false })
            .limit(6);

        if (error) {
            console.warn('GlobalSearch: falha ao buscar pedidos.', error);
            return [];
        }
        return (data || []).map((o) => ({
            type: 'order', id: o.id, label: `${o.id} ${o.client_name || ''}`,
            title: `${o.id} — ${o.client_name || 'Cliente'}`,
            subtitle: `R$ ${(Number(o.total_amount) || 0).toFixed(2)} · ${o.status || ''}`
        }));
    },

    async run(query) {
        const q = (query || '').trim();
        this._lastQuery = q;
        const results = document.getElementById('global-search-results');
        if (!results) return;

        if (q.length < 2) {
            this.renderEmpty();
            return;
        }

        results.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px; font-size:0.85rem;">Buscando...</div>';

        const [orders, customers, products, coupons] = await Promise.all([
            this.searchOrders(q),
            this.searchCustomers(q),
            this.searchProducts(q),
            this.searchCoupons(q)
        ]);

        // Se o usuário já digitou outra coisa enquanto isso rodava, descarta —
        // evita resultado velho pisando no resultado da query mais nova.
        if (this._lastQuery !== q) return;

        const groups = [
            { label: 'Pedidos', icon: 'ph-list-checks', items: orders },
            { label: 'Clientes', icon: 'ph-users-three', items: customers },
            { label: 'Produtos', icon: 'ph-package', items: products },
            { label: 'Cupons', icon: 'ph-ticket', items: coupons }
        ].filter((g) => g.items.length > 0);

        if (groups.length === 0) {
            results.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:30px; font-size:0.85rem;">Nada encontrado para "${this.escapeHtml(q)}".</div>`;
            return;
        }

        results.innerHTML = groups.map((g) => `
            <div style="padding: 10px 10px 4px; font-size:0.7rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em;">${g.label}</div>
            ${g.items.map((item) => `
                <div class="gs-result" data-type="${item.type}" data-id="${this.escapeHtml(item.id)}" data-label="${this.escapeHtml(item.label || '')}"
                    style="padding:10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:10px;"
                    onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                    <i class="ph-bold ${g.icon}" style="color:#6366f1; font-size:1.1rem; flex-shrink:0;"></i>
                    <div style="min-width:0; flex:1;">
                        <div style="font-weight:600; color:#1e293b; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(item.title)}</div>
                        <div style="font-size:0.78rem; color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(item.subtitle)}</div>
                    </div>
                </div>
            `).join('')}
        `).join('');
    },

    async select(type, id, label) {
        this.close();
        if (!window.adminApp) return;

        if (type === 'order') {
            adminApp.switchView('orders');
            setTimeout(() => { if (adminApp.openDossier) adminApp.openDossier(id); }, 150);
            return;
        }

        if (type === 'customer') {
            adminApp.switchView('customers');
            // switchView já dispara CRMManager.loadCustomers() sem esperar
            // (fire-and-forget); chamar de novo aqui e aguardar garante que
            // allClients está preenchido antes de filtrar — senão o filtro
            // roda numa lista vazia e o loadCustomers() original, ao terminar
            // depois, sobrescreve com a lista inteira sem filtro nenhum.
            if (window.CRMManager && CRMManager.loadCustomers) {
                await CRMManager.loadCustomers();
            }
            const input = document.getElementById('customer-search');
            if (input) input.value = label || '';
            if (window.CRMManager && CRMManager.filterCustomers) CRMManager.filterCustomers();
            return;
        }

        if (type === 'product') {
            adminApp.switchView('products');
            setTimeout(() => { if (adminApp.editProd) adminApp.editProd(id); }, 150);
            return;
        }

        if (type === 'coupon') {
            adminApp.switchView('coupons');
            if (adminApp.renderCouponsTable) await adminApp.renderCouponsTable();
            if (adminApp.openCouponModalForEdit) adminApp.openCouponModalForEdit(id);
        }
    }
};

window.GlobalSearch = GlobalSearch;

// Atalho global: Ctrl+K (ou Cmd+K no Mac) abre/fecha de qualquer lugar do painel.
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        GlobalSearch.toggle();
    }
});
