/**
 * SettingsManager (Elite Version)
 * Handles Store Configuration, Marketing, Logistics, and Operations.
 * Uses localStorage for persistence.
 */

const SettingsManager = {
    defaults: {
        storeName: 'Marca Viva',
        primaryColor: '#4f46e5',
        logoUrl: '',
        bannerUrl: '',
        whatsapp: '',
        storeOpen: true,
        closedMsg: 'Estamos em pausa operacional. Voltamos em breve!',
        shippingCost: 0,
        freeShippingThreshold: 0,
        pixKey: '',
        cnpj: '63.751.909/0001-00',
        // NEW FIELDS
        seoTitle: '',
        pickupActive: true, // shipping-service.js trata "nao configurado" como ligado; o default aqui precisa bater
        topBarText: '',
        topBarActive: false,
        whatsappMsg: '',
        // CRM FIELDS
        crmVipThreshold: 1000,
        crmGhostDays: 45,
        // Números/Portfólio da home agora vêm do Site Content (settings.stats/portfolio),
        // não daqui — evita dois sistemas escrevendo nos mesmos elementos da vitrine.
        // FAQ FIELDS
        faqQ1: 'Qual é o pedido mínimo?',
        faqA1: 'A maioria dos nossos produtos corporativos requer um pedido mínimo de 50 unidades, mas varia por categoria. Consulte cada produto!',
        faqQ2: 'Posso ver uma amostra antes de fechar tudo?',
        faqA2: 'Sim! Nós geramos mockup digital (Layout Virtual) gratuito com sua logo antes da aprovação final para produção.',
        faqQ3: 'Quais os prazos de entrega?',
        faqA3: 'O frete é calculado no carrinho, mas a produção leva em média de 7 a 15 dias úteis, dependendo da customização.'
    },

    async init() {
        const settings = await this.loadSettings();
        this.applyTheme(settings);
    },

    async loadSettings() {
        // First try to load from DB
        let settings = null;
        if (typeof SettingsService !== 'undefined') {
            settings = await SettingsService.getGlobalSettings();
        }

        // Fallback to local storage or defaults if DB fails or is empty
        if (!settings) {
            const stored = localStorage.getItem('mv_store_settings');
            settings = stored ? { ...this.defaults, ...JSON.parse(stored) } : this.defaults;
        } else {
            // Apply defaults to any missing fields from DB
            settings = { ...this.defaults, ...settings };
            // Update local cache
            localStorage.setItem('mv_store_settings', JSON.stringify(settings));
        }

        // Populate Inputs if on Admin Page (wait for DOM)
        const checkExist = setInterval(() => {
            const nameInput = document.getElementById('set-store-name');
            if (nameInput) {
                clearInterval(checkExist);

                // Identity
                if (document.getElementById('set-store-name')) document.getElementById('set-store-name').value = settings.storeName;
                if (document.getElementById('set-primary-color')) document.getElementById('set-primary-color').value = settings.primaryColor;
                if (document.getElementById('set-banner-url')) document.getElementById('set-banner-url').value = settings.bannerUrl || '';
                if (document.getElementById('set-logo-url')) document.getElementById('set-logo-url').value = settings.logoUrl || '';

                // NEW: SEO
                if (document.getElementById('set-seo-title')) document.getElementById('set-seo-title').value = settings.seoTitle || '';

                // Operations
                if (document.getElementById('set-store-open')) document.getElementById('set-store-open').checked = settings.storeOpen;
                if (document.getElementById('set-closed-msg')) document.getElementById('set-closed-msg').value = settings.closedMsg;

                // Logistics
                if (document.getElementById('set-shipping-cost')) document.getElementById('set-shipping-cost').value = settings.shippingCost;
                if (document.getElementById('set-free-shipping')) document.getElementById('set-free-shipping').value = settings.freeShippingThreshold;
                // NEW: Pickup
                if (document.getElementById('set-pickup-store')) document.getElementById('set-pickup-store').checked = settings.pickupActive !== false;

                // NEW: Top Bar
                if (document.getElementById('set-top-bar-text')) document.getElementById('set-top-bar-text').value = settings.topBarText || '';
                if (document.getElementById('set-top-bar-active')) document.getElementById('set-top-bar-active').checked = settings.topBarActive || false;
                if (document.getElementById('set-whatsapp-msg')) document.getElementById('set-whatsapp-msg').value = settings.whatsappMsg || '';

                // Legal/Contact
                if (document.getElementById('set-whatsapp')) document.getElementById('set-whatsapp').value = settings.whatsapp;
                if (document.getElementById('set-pix-key')) document.getElementById('set-pix-key').value = settings.pixKey || '';
                if (document.getElementById('set-cnpj')) document.getElementById('set-cnpj').value = settings.cnpj || '';

                // CRM Thresholds
                if (document.getElementById('set-crm-vip-threshold')) document.getElementById('set-crm-vip-threshold').value = settings.crmVipThreshold || 1000;
                if (document.getElementById('set-crm-ghost-days')) document.getElementById('set-crm-ghost-days').value = settings.crmGhostDays || 45;

                // FAQ
                if (document.getElementById('set-faq-q1')) document.getElementById('set-faq-q1').value = settings.faqQ1 || '';
                if (document.getElementById('set-faq-a1')) document.getElementById('set-faq-a1').value = settings.faqA1 || '';
                if (document.getElementById('set-faq-q2')) document.getElementById('set-faq-q2').value = settings.faqQ2 || '';
                if (document.getElementById('set-faq-a2')) document.getElementById('set-faq-a2').value = settings.faqA2 || '';
                if (document.getElementById('set-faq-q3')) document.getElementById('set-faq-q3').value = settings.faqQ3 || '';
                if (document.getElementById('set-faq-a3')) document.getElementById('set-faq-a3').value = settings.faqA3 || '';
            }
        }, 500); // Check every 500ms in case view is hidden

        return settings;
    },

    async saveSettings() {
        const settings = {
            storeName: document.getElementById('set-store-name').value,
            primaryColor: document.getElementById('set-primary-color').value,
            logoUrl: document.getElementById('set-logo-url').value,
            bannerUrl: document.getElementById('set-banner-url').value,

            // NEW
            seoTitle: document.getElementById('set-seo-title').value,

            storeOpen: document.getElementById('set-store-open').checked,
            closedMsg: document.getElementById('set-closed-msg').value,

            shippingCost: parseFloat(document.getElementById('set-shipping-cost').value) || 0,
            freeShippingThreshold: parseFloat(document.getElementById('set-free-shipping').value) || 0,
            // NEW
            pickupActive: document.getElementById('set-pickup-store').checked,

            // NEW
            topBarText: document.getElementById('set-top-bar-text').value,
            topBarActive: document.getElementById('set-top-bar-active').checked,
            whatsappMsg: document.getElementById('set-whatsapp-msg').value,

            // CRM
            crmVipThreshold: parseFloat(document.getElementById('set-crm-vip-threshold')?.value) || 1000,
            crmGhostDays: parseInt(document.getElementById('set-crm-ghost-days')?.value) || 45,

            // FAQ
            faqQ1: document.getElementById('set-faq-q1')?.value,
            faqA1: document.getElementById('set-faq-a1')?.value,
            faqQ2: document.getElementById('set-faq-q2')?.value,
            faqA2: document.getElementById('set-faq-a2')?.value,
            faqQ3: document.getElementById('set-faq-q3')?.value,
            faqA3: document.getElementById('set-faq-a3')?.value,

            whatsapp: document.getElementById('set-whatsapp').value,
            pixKey: document.getElementById('set-pix-key').value,
            cnpj: document.getElementById('set-cnpj').value
        };

        // Save to Local Storage as Backup/Cache
        localStorage.setItem('mv_store_settings', JSON.stringify(settings));

        // Save to Database
        //
        // ATENCAO: a chave 'global_settings' e compartilhada com o editor de
        // conteudo do site (Mega Menu, slides da home, rodape, portfolio...).
        // Gravar direto aqui APAGAVA tudo aquilo. Por isso lemos o que ja
        // existe e mesclamos, igual faz o editor de conteudo.
        if (typeof SettingsService !== 'undefined') {
            try {
                const existente = (await SettingsService.getGlobalSettings()) || {};
                await SettingsService.saveGlobalSettings({ ...existente, ...settings });
            } catch (e) {
                console.error("Failed to sync settings to DB:", e);
                Swal.fire('Aviso', 'Configurações salvas localmente, mas erro ao sincronizar nuvem.', 'warning');
            }
        }

        // Instant Apply
        this.applyTheme(settings);

        Swal.fire({
            title: 'Configurações Elite Salvas!',
            text: 'Sua loja foi atualizada com sucesso.',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    },

    applyTheme(specificSettings = null) {
        const settings = specificSettings || this.loadSettings();
        // 1. Apply CSS Variables
        document.documentElement.style.setProperty('--primary-hero', settings.primaryColor);
        // Additional applies...
    },

    openTab(evt, tabName) {
        // 1. Hide all tab content
        const tabContents = document.getElementsByClassName("settings-tab-content");
        for (let i = 0; i < tabContents.length; i++) {
            tabContents[i].style.display = "none";
        }

        // 2. Remove 'active' from all buttons
        const tabLinks = document.getElementsByClassName("tab-btn");
        for (let i = 0; i < tabLinks.length; i++) {
            tabLinks[i].classList.remove("active");
        }

        // 3. Show current tab content
        const target = document.getElementById(tabName);
        if (target) {
            target.style.display = "block";
        }

        // 4. Add active class to button
        if (evt && evt.currentTarget) {
            evt.currentTarget.classList.add("active");
        }

        // 5. Force Render if Categories
        if (tabName === 'tab-categories-pro' && typeof CategoryManager !== 'undefined') {
            CategoryManager.render();
        }
    }
};

/**
 * CategoryManager
 * Handles Categories CRUD
 */
const CategoryManager = {
    categories: [],
    counts: {},

    init() {
        // init is called on DOMContentLoaded, but we render on tab click
    },

    async render() {
        const tbody = document.getElementById('categories-table-body');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px; color:#94a3b8;">Carregando categorias...</td></tr>';

        try {
            // 1. Fetch Categories
            let categories = [];
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('categories')
                    .select('*')
                    .order('name');
                if (!error) categories = data;
            }

            // Fallback to localStorage if online fetch fails or returns null
            if (!categories || categories.length === 0) {
                const stored = localStorage.getItem('mv_categories');
                if (stored) categories = JSON.parse(stored);
            }

            if (!categories || categories.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px; color:#94a3b8;">Nenhuma categoria encontrada.</td></tr>';
                return;
            }

            // Cacheia a lista buscada (banco, ou localStorage no fallback) para
            // openModal()/deleteCategory() usarem em vez de reler localStorage
            // (que fica vazio/desatualizado quando a fonte real e o banco).
            this.categories = categories;

            // 2. Fetch/Calc Counts (Mocked or Real)
            let counts = {};
            if (window.supabase) {
                const { data: products } = await window.supabase.from('products').select('category');
                if (products) {
                    products.forEach(p => {
                        if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
                    });
                }
            }
            this.counts = counts;

            // 3. Build Tree (Roots & Children)
            const roots = categories.filter(c => !c.parent_id);
            const children = categories.filter(c => c.parent_id);

            const tree = roots.map(root => ({
                ...root,
                subs: children.filter(c => c.parent_id === root.id)
            }));

            // 4. Render HTML
            let html = '';
            tree.forEach(root => {
                const rootCount = counts[root.name] || 0;
                // Icons
                const starIcon = root.featured ? '<span title="Destaque na Home">⭐</span>' : '';
                const imgIcon = root.image_url ? '<span title="Tem Imagem de Capa" style="cursor:help;">📷</span>' : '<span style="opacity:0.2">📷</span>';

                // Root Row
                html += `
                <tr style="background:#f8fafc;">
                    <td style="font-weight:700; color:var(--primary-hero);">
                        ${starIcon} <i class="ph-bold ph-folder" style="color:#64748b;"></i> ${root.name}
                    </td>
                    <td style="color:#64748b; font-size:0.8rem;">
                        ${imgIcon} /${root.slug || ''}
                    </td>
                    <td><span style="background:${rootCount > 0 ? '#10b981' : '#cbd5e1'}; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem;">${rootCount} prod.</span></td>
                    <td>
                        <button onclick="CategoryManager.openModal('${root.id}')" style="color:#ca8a04; background:none; border:none; cursor:pointer; margin-right:5px;" title="Editar">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button onclick="CategoryManager.deleteCategory('${root.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;" title="Excluir">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                        <button onclick="CategoryManager.openModal(null, '${root.id}')" style="color:#3b82f6; background:none; border:none; cursor:pointer; margin-left:5px;" title="Adicionar Subcategoria">
                            <i class="ph-bold ph-git-merge"></i>
                        </button>
                    </td>
                </tr>
                `;

                // Sub Rows
                root.subs.forEach(sub => {
                    const subCount = counts[sub.name] || 0;
                    const subStar = sub.featured ? '⭐' : '';
                    const subImg = sub.image_url ? '📷' : '';

                    html += `
                    <tr>
                        <td style="padding-left:40px; color:#475569; position:relative;">
                            ${subStar} <i class="ph-bold ph-arrow-elbow-down-right" style="color:#cbd5e1; margin-right:5px;"></i> ${sub.name}
                        </td>
                        <td style="color:#94a3b8; font-size:0.8rem;">
                            ${subImg} /${sub.slug || ''}
                        </td>
                        <td><span style="background:${subCount > 0 ? '#10b981' : '#cbd5e1'}; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem;">${subCount}</span></td>
                        <td>
                            <button onclick="CategoryManager.openModal('${sub.id}')" style="color:#ca8a04; background:none; border:none; cursor:pointer; margin-right:5px;" title="Editar">
                                <i class="ph-bold ph-pencil-simple"></i>
                            </button>
                             <button onclick="CategoryManager.deleteCategory('${sub.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;">
                                <i class="ph-bold ph-trash"></i>
                            </button>
                        </td>
                    </tr>
                    `;
                });
            });

            tbody.innerHTML = html;

        } catch (err) {
            console.error("CatManager Render Error:", err);
            tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:red;">Erro ao carregar: ${err.message}</td></tr>`;
        }
    },

    async openModal(catId = null, preSelectParentId = null) {
        let cat = { name: '', slug: '', parent_id: preSelectParentId || '', image_url: '', featured: false };
        let isEdit = false;

        // If Edit Mode, find category — usa a lista que render() ja buscou
        // (banco ou fallback local), nao o localStorage direto: se a fonte
        // real e o banco, o localStorage fica vazio/desatualizado e o modal
        // abria em branco.
        if (catId) {
            isEdit = true;
            const found = (this.categories || []).find(c => c.id === catId);
            if (found) cat = found;
        }

        // Parent Options
        const categories = this.categories || [];
        // Filter out self if editing to avoid loops
        const parents = categories.filter(c => c.id !== catId).map(c => `<option value="${c.id}" ${c.id === cat.parent_id ? 'selected' : ''}>${c.name}</option>`).join('');

        const { value: formValues } = await Swal.fire({
            title: isEdit ? '✏️ Editar Categoria' : '✨ Nova Categoria',
            html: `
                <div style="text-align:left;">
                    <label class="modal-label">Nome da Categoria</label>
                    <input id="swal-cat-name" class="swal2-input" placeholder="Ex: Camisetas" value="${cat.name}" style="margin:5px 0 15px 0; width:100%;">
                    
                    <label class="modal-label">URL (Slug) - Opcional</label>
                    <input id="swal-cat-slug" class="swal2-input" placeholder="ex: camisetas-verao" value="${cat.slug || ''}" style="margin:5px 0 15px 0; width:100%;">

                    <label class="modal-label">Categoria Mãe (Opcional)</label>
                    <select id="swal-cat-parent" class="swal2-input" style="margin:5px 0 15px 0; width:100%;">
                        <option value="">-- Nenhuma (Raiz) --</option>
                        ${parents}
                    </select>

                    <label class="modal-label">URL da Imagem de Capa 📸</label>
                    <input id="swal-cat-image" class="swal2-input" placeholder="https://..." value="${cat.image_url || ''}" style="margin:5px 0 15px 0; width:100%;">

                    <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                        <input type="checkbox" id="swal-cat-featured" ${cat.featured ? 'checked' : ''} style="width:20px; height:20px;">
                        <label for="swal-cat-featured" style="cursor:pointer; font-weight:600; color:#4f46e5;">Exibir na Barra Superior do Menu? ⭐</label>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    id: catId || (Date.now() + Math.random().toString(36).substr(2, 9)),
                    name: document.getElementById('swal-cat-name').value,
                    slug: document.getElementById('swal-cat-slug').value,
                    parent_id: document.getElementById('swal-cat-parent').value || null,
                    image_url: document.getElementById('swal-cat-image').value,
                    featured: document.getElementById('swal-cat-featured').checked
                }
            }
        });

        if (formValues) {
            if (!formValues.name) {
                Swal.fire('Erro', 'Nome é obrigatório!', 'error');
                return;
            }
            // Auto Slug if empty
            if (!formValues.slug) {
                formValues.slug = formValues.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
            }

            await this.saveCategory(formValues, isEdit);
            this.render(); // Refresh Table
        }
    },

    async saveCategory(category, isEdit) {
        let cats = JSON.parse(localStorage.getItem('mv_categories') || '[]');

        if (isEdit) {
            // Update existing
            const index = cats.findIndex(c => c.id === category.id);
            if (index !== -1) cats[index] = category;
        } else {
            // Add new
            cats.push(category);
        }

        // Sync to LocalStorage (Always)
        localStorage.setItem('mv_categories', JSON.stringify(cats));

        // Sync to Supabase (If available)
        if (window.supabase) {
            if (isEdit) {
                await window.supabase.from('categories').update(category).eq('id', category.id);
            } else {
                await window.supabase.from('categories').insert(category);
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'Salvo!',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 1500
        });

        this.render();
    },

    async deleteCategory(id) {
        const category = (this.categories || []).find(c => c.id === id);
        const count = category ? (this.counts[category.name] || 0) : 0;

        if (count > 0) {
            Swal.fire({
                title: 'Não é possível excluir',
                text: `Existem ${count} produto(s) usando a categoria "${category.name}". Mova ou edite esses produtos antes de excluir a categoria.`,
                icon: 'error',
                confirmButtonText: 'Entendi'
            });
            return;
        }

        Swal.fire({
            title: 'Tem certeza?',
            text: "Remover esta categoria?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim, excluir'
        }).then(async (result) => {
            if (result.isConfirmed) {
                if (window.supabase) {
                    await window.supabase.from('categories').delete().eq('id', id);
                } else {
                    let cats = JSON.parse(localStorage.getItem('mv_categories') || '[]');
                    cats = cats.filter(c => c.id !== id);
                    localStorage.setItem('mv_categories', JSON.stringify(cats));
                }
                Swal.fire('Deletado!', '', 'success');
                this.render();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    SettingsManager.init();
    CategoryManager.init();
});

window.SettingsManager = SettingsManager;
window.CategoryManager = CategoryManager;
