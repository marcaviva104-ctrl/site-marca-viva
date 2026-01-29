/**
 * ADMIN V2 - CLEAN & ROBUST
 * Created: 2026-01-28
 * Description: Rebuilt to fix caching/bloat issues.
 */

const adminApp = {
    // --- State ---
    currentView: 'financial', // Default view requested by user
    isOffline: false,
    financialData: [], // Store for filtering

    // --- Core Methods ---

    async init() {
        console.log("AdminApp V2: Starting...");
        window.adminApp = this; // Double ensure global access

        this.bindNav();
        this.loadTheme();

        // Check Auth using existing service
        try {
            if (window.authService) await window.authService.init();
        } catch (e) { console.warn("Auth Init Warning:", e); }

        // Determine View
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view') || 'financial'; // Default to financial

        // Initial Render
        this.switchView(view);
    },

    bindNav() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const vid = link.getAttribute('data-view');
                if (!vid) return;
                e.preventDefault();
                this.switchView(vid, link);
            });
        });
        console.log("AdminApp V2: Nav Bound");
    },

    switchView(vid, link) {
        console.log("Switching to:", vid);

        // 1. UI Updates (Sidebar)
        if (link) {
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        } else {
            const l = document.querySelector(`.nav-item[data-view="${vid}"]`);
            if (l) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                l.classList.add('active');
            }
        }

        // 2. View Visibility
        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.classList.remove('active'));

        const target = document.getElementById(vid) || document.getElementById(`${vid}-view`);
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
        } else {
            console.warn(`View ${vid} not found.`);
        }

        // 3. Logic Dispatch
        try {
            if (vid === 'financial') this.renderFinancial();
            if (vid === 'inventory') this.renderInventoryView();
            if (vid === 'dashboard') this.renderDashboard();
            if (vid === 'products') this.renderProductsTable();
            if (vid === 'orders') this.renderOrdersTable();
        } catch (e) {
            console.error("Module Load Error:", e);
        }
    },

    // --- Safe Storage & Theme ---

    loadTheme() {
        try {
            const t = localStorage.getItem('mv_theme');
            if (t === 'dark') document.body.classList.add('dark-mode');
        } catch (e) { }
    },

    // --- FINANCIAL MODULE (Restored) ---

    async renderFinancial() {
        console.log("AdminV2: Rendering Financial...");
        const container = document.getElementById('financial-view');
        if (!container) return;

        // 1. Fetch Data
        let transactions = [];
        try {
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('financial_records')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn("Finanicial fetch error (using mock):", error);
                    transactions = this.getMockFinancialData();
                } else {
                    transactions = data || [];
                }
            } else {
                console.warn("Offline Mode: using local mock");
                transactions = this.getMockFinancialData();
            }

            // If empty even after fetch, use mock for demo purposes if strictly empty
            if (transactions.length === 0) transactions = this.getMockFinancialData();

            this.financialData = transactions;
            this.renderFinancialTable(transactions);
            this.calculateFinancialKPIs(transactions);

        } catch (e) {
            console.error("Financial Render Fatal:", e);
            // Fallback
            this.financialData = this.getMockFinancialData();
            this.renderFinancialTable(this.financialData);
            this.calculateFinancialKPIs(this.financialData);
        }
    },

    getMockFinancialData() {
        return [
            { id: 'MCK-001', customer_name: 'Cliente Exemplo VIP', total: 1500.00, paid_amount: 1500.00, status: 'paid', status_production: 'done', created_at: new Date().toISOString(), type: 'income' },
            { id: 'MCK-002', customer_name: 'Cliente Pendente', total: 450.50, paid_amount: 100.00, status: 'pending', status_production: 'pending', created_at: new Date(Date.now() - 86400000).toISOString(), type: 'income' },
            { id: 'MCK-003', customer_name: 'Despesa Fornecedor', total: 200.00, paid_amount: 200.00, status: 'paid', status_production: 'none', created_at: new Date(Date.now() - 172800000).toISOString(), type: 'expense', description: 'Papelaria' },
            { id: 'MCK-004', customer_name: 'Cliente Novo', total: 120.00, paid_amount: 0.00, status: 'pending', status_production: 'pending', created_at: new Date().toISOString(), type: 'income' }
        ];
    },

    renderFinancialTable(data) {
        const tbody = document.getElementById('financial-table-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:#94a3b8;">Nenhum registro encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => {
            const id = (item.id || '').substring(0, 8);
            const client = item.customer_name || 'Cliente Sem Nome';
            const prodStatus = item.status_production || 'Pendente';
            const total = Number(item.total) || 0;
            const paid = Number(item.paid_amount) || Number(item.total_paid) || 0;
            const debt = total - paid;

            // Customize Badges
            let statusHtml = '<span class="status-badge" style="background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Pendente</span>';
            if (prodStatus === 'done' || prodStatus === 'concluido') statusHtml = '<span class="status-badge" style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:4px; font-size:0.75rem;">Pronto</span>';

            const debtColor = debt > 0.01 ? '#ef4444' : '#10b981'; // Red if owes moneyf

            return `
            <tr>
                <td><span style="font-weight:600; color:#64748b;">#${id}</span></td>
                <td>${client}</td>
                <td>${statusHtml}</td>
                <td>R$ ${total.toFixed(2)}</td>
                <td style="color:#10b981;">R$ ${paid.toFixed(2)}</td>
                <td style="color:${debtColor}; font-weight:bold;">R$ ${debt.toFixed(2)}</td>
                <td>
                        <button onclick="adminApp.deleteFinancialRecord('${item.id}')" style="color:#ef4444; border:none; background:none; cursor:pointer;" title="Excluir">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    },

    calculateFinancialKPIs(data) {
        let totalReceivable = 0;
        let totalPaid = 0;
        let totalAccount = 0;
        let totalCash = 0;

        data.forEach(d => {
            const total = Number(d.total) || 0;
            const paid = Number(d.paid_amount) || Number(d.total_paid) || 0;
            const debt = total - paid;

            if (debt > 0.01) totalReceivable += debt;
            totalPaid += paid;

            const method = (d.payment_method || '').toLowerCase();
            if (method.includes('dinheiro') || method.includes('espécie')) {
                totalCash += paid;
            } else {
                totalAccount += paid;
            }
        });

        // HTML IDs from admin.html
        const elReceivable = document.getElementById('fin-total-receivable');
        const elPaid = document.getElementById('fin-total-paid');
        const elAccount = document.getElementById('fin-total-account');
        const elCash = document.getElementById('fin-total-cash');

        if (elReceivable) elReceivable.innerText = `R$ ${totalReceivable.toFixed(2)}`;
        if (elPaid) elPaid.innerText = `R$ ${totalPaid.toFixed(2)}`;
        if (elAccount) elAccount.innerText = `R$ ${totalAccount.toFixed(2)}`;
        if (elCash) elCash.innerText = `R$ ${totalCash.toFixed(2)}`;
    },

    async deleteFinancialRecord(id) {
        if (!confirm("Excluir registro?")) return;
        if (window.supabase) {
            await window.supabase.from('financial_records').delete().eq('id', id);
            this.renderFinancial(); // Refresh
        }
    },

    printFinancialReportPreview() {
        if (!this.financialData || this.financialData.length === 0) {
            alert("Sem dados para imprimir");
            return;
        }
        window.print();
    },

    // --- FINANCIAL INTERACTIONS ---

    toggleDebtorWallet() {
        const wallet = document.getElementById('debtor-wallet-widget');
        const chevron = document.getElementById('wallet-chevron');
        if (wallet.style.display === 'none') {
            wallet.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
            this.renderDebtorWallet();
        } else {
            wallet.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        }
    },

    async renderDebtorWallet() {
        const container = document.getElementById('debtor-wallet-widget');
        if (!this.financialData) return;

        const debtors = this.financialData.filter(d => {
            const t = Number(d.total) || 0;
            const p = Number(d.paid_amount) || Number(d.total_paid) || 0;
            return (t - p) > 0.01;
        });

        if (debtors.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#10b981;">Nenhum cliente devendo! ??</div>';
            return;
        }

        container.innerHTML = `
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead style="background:#fef2f2; color:#b91c1c;">
                <tr><th style="padding:10px;">Cliente</th><th style="padding:10px;">Dívida</th><th style="padding:10px;">Ação</th></tr>
            </thead>
            <tbody>
                ${debtors.map(d => {
            const debt = (Number(d.total) - (Number(d.paid_amount) || 0));
            return `
                    <tr style="border-bottom:1px solid #fee2e2;">
                        <td style="padding:10px;">${d.customer_name}</td>
                        <td style="padding:10px; font-weight:bold; color:#ef4444;">R$ ${debt.toFixed(2)}</td>
                        <td style="padding:10px;">
                            <button onclick="adminApp.remindDebtor('${d.id}')" style="font-size:0.8rem; background:#fff; border:1px solid #ef4444; color:#ef4444; padding:2px 8px; border-radius:4px; cursor:pointer;">
                                Cobrar
                            </button>
                        </td>
                    </tr>`;
        }).join('')}
            </tbody>
        </table>
    `;
    },

    remindDebtor(id) {
        alert("Função de cobrança via WhatsApp será ativada em breve!");
    },

    filterFinancial(range) {
        console.log("Filtering:", range);
        if (!this.financialData) return;

        let filtered = this.financialData;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        if (range === 'this-month') {
            filtered = this.financialData.filter(d => new Date(d.created_at) >= startOfMonth);
        }

        this.renderFinancialTable(filtered);
        this.calculateFinancialKPIs(filtered);
    },

    // --- INVENTORY MODULE ---

    renderInventoryView() {
        console.log("AdminV2: Rendering Inventory...");
        this.updateInventoryStats();
        this.renderInventoryOverview();
        this.renderInventoryHistory('all');
    },

    updateInventoryStats() {
        if (!window.dataManager) return;
        const inputs = window.dataManager.getInputs();
        const lowStock = window.dataManager.getLowStockInputs();
        const history = window.dataManager.getInventoryHistory();

        // Count movements today
        const today = new Date().toDateString();
        const movementsToday = history.filter(h => new Date(h.date).toDateString() === today).length;

        const elCrit = document.getElementById('critical-stock-count');
        const elTotal = document.getElementById('total-inputs-count');
        const elMov = document.getElementById('movements-today-count');

        if (elCrit) elCrit.innerText = lowStock.length;
        if (elTotal) elTotal.innerText = inputs.length;
        if (elMov) elMov.innerText = movementsToday;
    },

    renderInventoryOverview(inputsOverride = null) {
        if (!window.dataManager) return;
        const inputs = inputsOverride || window.dataManager.getInputs();
        const tbody = document.getElementById('inventory-overview-body');
        if (!tbody) return;

        if (inputs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum insumo cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = inputs.map(input => {
            const stock = input.stock || 0;
            const minStock = input.minStock || 0;
            const status = window.dataManager.getStockStatus(input);
            const totalValue = stock * (Number(input.cost) || 0);

            let statusConfig = { icon: '??', label: 'Normal', color: '#10b981' };
            if (status === 'low') statusConfig = { icon: '??', label: 'Baixo', color: '#f59e0b' };
            if (status === 'critical') statusConfig = { icon: '??', label: 'Crítico', color: '#ef4444' };
            if (status === 'out') statusConfig = { icon: '?', label: 'Esgotado', color: '#64748b' };

            return `
            <tr style="${status === 'critical' ? 'background:#fef2f2' : ''}">
                <td>
                    <strong>${input.name}</strong>
                    <div style="font-size:0.75rem;color:#94a3b8;">${input.supplier || 'Sem fornecedor'}</div>
                </td>
                <td><span style="font-weight:600;font-size:1.1rem;">${stock} ${input.unit || 'un'}</span></td>
                <td><span style="color:#64748b;">${minStock} ${input.unit || 'un'}</span></td>
                <td>
                    <span style="color:${statusConfig.color};font-weight:600;">
                        ${statusConfig.icon} ${statusConfig.label}
                    </span>
                </td>
                <td>R$ ${totalValue.toFixed(2)}</td>
                <td>
                    <button onclick="adminApp.openStockEntry('${input.id}')" 
                        style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;" title="Entrada">
                        <i class="ph-bold ph-plus-circle"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');
    },

    renderInventoryHistory(filterType) {
        if (!window.dataManager) return;
        const tbody = document.getElementById('inventory-history-body');
        if (!tbody) return;

        let history = window.dataManager.getInventoryHistory();
        if (filterType && filterType !== 'all') {
            history = history.filter(h => h.type === filterType);
        }

        // Sort DESC
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        history = history.slice(0, 50); // Limit

        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">Nenhum histórico.</td></tr>';
            return;
        }

        tbody.innerHTML = history.map(h => {
            const date = new Date(h.date);
            const isEntry = h.type === 'entrada';

            let typeColor = isEntry ? '#10b981' : '#ef4444'; // Green vs Red
            let typeIcon = isEntry ? '<i class="ph-bold ph-arrow-down"></i>' : '<i class="ph-bold ph-arrow-up"></i>';
            let label = h.type.toUpperCase();

            return `
            <tr>
                <td>
                    <div style="font-weight:600;font-size:0.85rem;">${date.toLocaleDateString('pt-BR')}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${date.toLocaleTimeString('pt-BR')}</div>
                </td>
                <td><span style="color:${typeColor}; font-weight:600;">${typeIcon} ${label}</span></td>
                <td>${h.inputName || 'Insumo'}</td>
                <td style="font-weight:bold;">${h.quantity}</td>
                <td style="font-size:0.85rem;">${h.reason || '-'}</td>
                <td style="color:#64748b;font-size:0.85rem;">${h.user || 'Admin'}</td>
            </tr>
        `;
        }).join('');
    },

    // --- PRODUCTS MODULE ---

    async renderProductsTable() {
        console.log("AdminV2: Rendering Products...");
        const tbody = document.getElementById('products-table-body');
        if (!tbody) return;

        if (!window.dataManager) {
            tbody.innerHTML = '<tr><td colspan="6">Carregando dados...</td></tr>';
            return;
        }

        // Fetch fresh data
        await window.dataManager.fetchProducts();
        const products = window.dataManager.getProducts() || [];

        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum produto cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = products.map(p => {
            const hasGallery = (p.gallery && p.gallery.length > 0) || (p.image && p.image.startsWith('http'));
            const availableStock = window.dataManager.calculateAvailableStock ? window.dataManager.calculateAvailableStock(p) : (p.stock || 0);

            return `
            <tr>
                <td>
                    <div style="font-weight:600;">${p.name}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${p.category || '-'}</div>
                </td>
                <td><span style="font-size:0.85rem; color:#475569;">${p.subcategory || '-'}</span></td>
                <td>${hasGallery ? '<span style="color:#10b981;"><i class="ph-bold ph-check"></i> Sim</span>' : '-'}</td>
                <td><span style="color:#64748b; font-size:0.8rem;">Ver Detalhes</span></td>
                <td><span style="font-weight:700;">${availableStock} un</span></td>
                <td>
                    <button onclick="adminApp.editProd('${p.id}')" style="color:#0ea5e9;border:none;background:none;cursor:pointer;margin-right:8px;"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="adminApp.deleteProd('${p.id}')" style="color:#ef4444;border:none;background:none;cursor:pointer;"><i class="ph-bold ph-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    },

    openProductModal() {
        document.getElementById('modal-product').classList.add('open');
        this.resetModal();
    },

    resetModal() {
        // Clear inputs
        document.querySelectorAll('#modal-product input, #modal-product textarea').forEach(i => i.value = '');
        if (document.getElementById('img-preview-container')) document.getElementById('img-preview-container').style.display = 'none';
        this.galleryFiles = [];
        this.galleryUrls = [];
        this.renderGalleryPreview();
    },

    async editProd(id) {
        if (!window.dataManager) return;
        const products = window.dataManager.getProducts();
        const prod = products.find(p => p.id === id);
        if (!prod) return;

        this.openProductModal();

        // Fill basic fields (Partial)
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-category').value = prod.category;

        // Gallery
        this.galleryUrls = prod.gallery || (prod.image ? [prod.image] : []);
        this.renderGalleryPreview();
    },

    async deleteProd(id) {
        if (!confirm("Excluir produto?")) return;
        if (window.supabase) {
            await window.supabase.from('products').delete().eq('id', id);
            this.renderProductsTable();
        }
    },

    // Gallery Stub
    galleryFiles: [],
    galleryUrls: [],
    renderGalleryPreview() {
        const container = document.getElementById('gallery-preview-grid');
        if (!container) return;
        container.innerHTML = this.galleryUrls.map((url, i) =>
            `<div style="height:60px; width:60px; background:url(${url}) center/cover;"></div>`
        ).join('');
    },

    // --- Modals (Inventory Stub) ---
    openStockEntry(id) { alert("Entrada: " + id); },
    openStockAdjust(id) { alert("Saída: " + id); },

    // --- Helpers ---
    renderOrdersTable() { console.log("Rendering Orders"); },
    renderDashboard() { console.log("Rendering Dashboard"); },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    }
};

// EXPORT
window.adminApp = adminApp;

// AUTO-START
document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
