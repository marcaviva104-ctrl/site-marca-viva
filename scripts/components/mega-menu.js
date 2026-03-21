/**
 * MegaMenu - Marca Viva
 * 
 * Carrega as categorias do SettingsService (Supabase)
 * e renderiza a barra de mega menu dinamicamente.
 * 
 * Dados esperados em site_settings (key: global_settings):
 * {
 *   megaMenu: {
 *     categories: [
 *       { label: "Kits Onboarding", icon: "ph-gift", filter: "Kits Boas-vindas" },
 *       ...
 *     ]
 *   }
 * }
 */

const MegaMenu = {
    // Categorias padrão (fallback se não houver config no Supabase)
    defaultCategories: [
        { label: "Apostilas & Impressão", icon: "ph-file-pdf",   filter: "Apostilas" },
        { label: "Kits Onboarding",       icon: "ph-gift",        filter: "Kits Boas-vindas" },
        { label: "Tech & Gadgets",         icon: "ph-laptop",      filter: "Eletrônicos" },
        { label: "Eco Sustentável",        icon: "ph-tote",        filter: "Ecobags" },
        { label: "Papelaria",              icon: "ph-notebook",    filter: "Cadernos" },
        { label: "Drinkware",              icon: "ph-drop",        filter: "Garrafas" },
    ],

    categories: [],

    async init() {
        console.log('[MegaMenu] Loading categories...');
        try {
            if (window.supabase) {
                const { data: dbCats, error } = await window.supabase.from('categories').select('*').order('name');
                if (!error && dbCats && dbCats.length > 0) {
                    this.categories = dbCats;
                    console.log('[MegaMenu] Categories loaded from real Supabase DB:', this.categories.length);
                } else {
                    console.warn('[MegaMenu] Supabase query returned empty, falling back...');
                    this.loadSettingsFallback();
                }
            } else {
                this.loadSettingsFallback();
            }
        } catch (e) {
            console.error('[MegaMenu] DB Load Error:', e);
            this.loadSettingsFallback();
        }

        this.render();
        this.bindEvents();
    },

    async loadSettingsFallback() {
        let localCats = localStorage.getItem('mv_categories');
        if (localCats) {
            try {
                const parsed = JSON.parse(localCats);
                if (parsed && parsed.length > 0) {
                    this.categories = parsed;
                    return;
                }
            } catch(e) {}
        }

        try {
            if (window.SettingsService) {
                const settings = await SettingsService.getGlobalSettings();
                if (settings && settings.megaMenu && Array.isArray(settings.megaMenu.categories) && settings.megaMenu.categories.length > 0) {
                    this.categories = settings.megaMenu.categories;
                    return;
                }
            }
        } catch (e) {}
        this.categories = this.defaultCategories || [];
    },

    /**
     * Renderiza desktop e mobile
     */
    render() {
        this.renderDesktop();
        this.renderMobile();
    },

    /**
     * Monta a barra desktop com botão "Todas as categorias" + itens inline
     */
    renderDesktop() {
        const bar = document.getElementById('mega-menu-bar');
        if (!bar) return;

        bar.style.position = 'relative';

        const roots = this.categories.filter(c => !c.parent_id);
        const children = this.categories.filter(c => c.parent_id);

        const tree = roots.map(root => ({
            ...root,
            subs: children.filter(c => c.parent_id === root.id)
        }));

        let itemsHTML = '';

        // Menu Horizontal: Mostra SOMENTE as Mães marcadas como "featured" (Destaques)
        const featuredRoots = tree.filter(t => t.featured);
        
        // Exibir até 8 categorias em destaque na barra
        featuredRoots.slice(0, 8).forEach(root => {
            const hasSubs = root.subs && root.subs.length > 0;
            
            itemsHTML += `
                <div class="mega-cat-item">
                    <button class="mega-cat-btn" ${!hasSubs ? `onclick="MegaMenu.selectCategory('${root.filter || root.name}', '${root.label || root.name}')"` : ''}>
                        ${root.label || root.name}
                        ${hasSubs ? '<i class="ph-bold ph-caret-down" style="margin-left:4px; font-size:0.75rem;"></i>' : ''}
                    </button>
                    ${hasSubs ? `
                    <div class="mega-sub-panel">
                        <div class="mega-sub-inner">
                            ${root.subs.map(sub => `
                                <a class="mega-sub-link" onclick="MegaMenu.selectCategory('${sub.filter || sub.name}', '${sub.label || sub.name}', '${root.name}')">
                                    ${sub.label || sub.name}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        });

        // Dropdown Vertical (Todas as Categorias): Mostra TODAS as Mães
        let dropdownHTML = '<ul class="mega-vertical-menu">';
        tree.forEach(root => {
            const hasSubs = root.subs && root.subs.length > 0;
            dropdownHTML += `
                <li class="mega-vertical-item ${hasSubs ? 'has-flyout' : ''}">
                    <a class="mega-vertical-link" ${!hasSubs ? `onclick="MegaMenu.selectCategory('${root.filter || root.name}', '${root.label || root.name}')"` : ''}>
                        ${root.label || root.name}
                        ${hasSubs ? '<i class="ph-bold ph-caret-right"></i>' : ''}
                    </a>
                    ${hasSubs ? `
                    <ul class="mega-flyout-menu">
                        ${root.subs.map(sub => `
                        <li>
                            <a class="mega-vertical-link sub-link" onclick="MegaMenu.selectCategory('${sub.filter || sub.name}', '${sub.label || sub.name}', '${root.name}')">
                                ${sub.label || sub.name}
                            </a>
                        </li>
                        `).join('')}
                    </ul>
                    ` : ''}
                </li>
            `;
        });
        dropdownHTML += '</ul>';

        bar.innerHTML = `
            <div class="mega-menu-inner">
                <div style="position: relative;">
                    <button class="mega-all-btn" id="mega-all-btn" onclick="MegaMenu.toggleDropdown()">
                        <i class="ph-bold ph-list"></i>
                        TODAS AS CATEGORIAS
                        <i class="ph-bold ph-caret-down" style="margin-left:4px; font-size:0.75rem;"></i>
                    </button>
                    <div class="mega-dropdown" id="mega-dropdown">
                        ${dropdownHTML}
                    </div>
                </div>
                <div class="mega-categories-list">
                    ${itemsHTML}
                </div>
            </div>
            <div class="mega-overlay" id="mega-overlay" onclick="MegaMenu.closeDropdown()"></div>
        `;
    },

    /**
     * Monta o painel mobile hambúrguer
     */
    renderMobile() {
        const mobileBar = document.getElementById('mega-menu-mobile');
        if (!mobileBar) return;

        const itemsHTML = this.categories.map(cat => `
            <a class="mega-mobile-item" onclick="MegaMenu.selectCategory('${cat.filter}', '${cat.label}'); MegaMenu.closeMobile();">
                ${cat.label}
            </a>
        `).join('');

        mobileBar.innerHTML = `
            <button class="mega-mobile-toggle" id="mega-mobile-toggle" onclick="MegaMenu.toggleMobile()">
                <span style="display:flex; align-items:center; gap:8px;">
                    <i class="ph-bold ph-list"></i>
                    Categorias
                </span>
                <i class="ph-bold ph-caret-down toggle-arrow"></i>
            </button>
            <div class="mega-mobile-panel" id="mega-mobile-panel">
                ${itemsHTML}
            </div>
        `;
    },

    /**
     * Abre/fecha o dropdown desktop
     */
    toggleDropdown() {
        const dropdown = document.getElementById('mega-dropdown');
        const overlay  = document.getElementById('mega-overlay');
        if (!dropdown) return;

        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
            this.closeDropdown();
        } else {
            dropdown.classList.add('active');
            overlay && overlay.classList.add('active');
        }
    },

    closeDropdown() {
        const dropdown = document.getElementById('mega-dropdown');
        const overlay  = document.getElementById('mega-overlay');
        dropdown && dropdown.classList.remove('active');
        overlay  && overlay.classList.remove('active');
    },

    /**
     * Abre/fecha painel mobile
     */
    toggleMobile() {
        const panel  = document.getElementById('mega-mobile-panel');
        const toggle = document.getElementById('mega-mobile-toggle');
        if (!panel) return;

        panel.classList.toggle('open');
        toggle && toggle.classList.toggle('open');
    },

    closeMobile() {
        const panel  = document.getElementById('mega-mobile-panel');
        const toggle = document.getElementById('mega-mobile-toggle');
        panel  && panel.classList.remove('open');
        toggle && toggle.classList.remove('open');
    },

    /**
     * Seleciona uma categoria e rola até o catálogo
     */
    selectCategory(filter, label, parentName = null) {
        // Chama o filtro do app principal se disponível
        if (window.app && typeof window.app.filterByCategory === 'function') {
            window.app.filterByCategory(filter, label, parentName);
        }

        // Destaca item ativo no menu
        document.querySelectorAll('.mega-cat-btn, .mega-sub-link, .mega-mobile-item').forEach(btn => {
            btn.classList.remove('mm-active');
        });
        // Marca o botão correto como ativo
        document.querySelectorAll(`.mega-cat-btn, .mega-sub-link, .mega-mobile-item`).forEach(btn => {
            if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(`'${filter}'`)) {
                btn.classList.add('mm-active');
            }
        });

        // Comentado para não forçar a rolagem indesejada (como se "ele só desce")
        // const catalog = document.getElementById('catalogo');
        // if (catalog) {
        //     setTimeout(() => catalog.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        // }

        this.closeDropdown();
    },

    /**
     * Fecha o dropdown ao pressionar Escape ou clicar fora
     */
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
                this.closeMobile();
            }
        });
        
        // Clicar fora zera os menus
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('mega-dropdown');
            const btn = document.getElementById('mega-all-btn');
            if (dropdown && dropdown.classList.contains('active')) {
                if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                    this.closeDropdown();
                }
            }
        });
    }
};

window.MegaMenu = MegaMenu;

// Auto-inicializa quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MegaMenu.init());
} else {
    MegaMenu.init();
}
