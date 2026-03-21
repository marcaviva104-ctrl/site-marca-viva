/**
 * Marca Viva - High Performance App Logic
 */

const app = {
    currentProduct: null,

    activeCategory: 'Todos',
    categoryTree: [],

    async init() {
        console.log('App Init...');

        try {
            // --- DYNAMIC SETTINGS INJECTION ---
            if (typeof SettingsService !== 'undefined') {
                const settings = await SettingsService.getGlobalSettings();
                if (settings) this.applyGlobalSettings(settings);
            } else {
                // Fallback to localStorage if Service isn't loaded
                const stored = localStorage.getItem('mv_store_settings');
                if (stored) this.applyGlobalSettings(JSON.parse(stored));
            }

            // 1. Instant Render from Cache (Optimistic)
            const cachedProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
            if (cachedProducts.length > 0) {
                console.log("App: Rendering from cache...");
                this.renderProducts(cachedProducts);
            } else {
                // Show Loading Skeleton if no cache
                const container = document.getElementById('products-grid');
                if (container) container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;"><i class="ph-duotone ph-spinner ph-spin" style="font-size:2rem;"></i><p>Carregando produtos...</p></div>';
            }

            // 2. Wait for Service & Fetch Fresh Data
            let attempts = 0;
            const maxAttempts = 30; // 3 seconds max
            while ((!window.productService || !window.productService.init) && attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }

            if (window.productService && window.productService.init) {
                // RACE CONDITION FIX: Timeout after 5s
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

                try {
                    await Promise.race([productService.init(), timeout]);

                    // 3. Re-Render with Fresh Data
                    this.renderProducts(productService.getAll());
                    this.renderCategoryFilters(); // Garante filtro inicial visível

                    // 4. Load Categories AFTER products are ready
                    console.log('🔄 Loading categories AFTER products are ready...');
                    await this.loadCategories();

                    // 5. Render Recommended
                    this.renderRecommended(productService.getAll());

                } catch (err) {
                    console.warn("ProductService Init timed out or failed:", err);
                    // If cache was empty and fetch failed, show error
                    const currentProducts = productService.getAll();
                    if (currentProducts.length === 0) {
                        const container = document.getElementById('products-grid');
                        if (container) container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#ef4444;"><i class="ph-bold ph-warning" style="font-size:2rem;"></i><p>Erro de conexão. Verifique sua internet.</p></div>';
                    }
                }
            } else {
                console.warn("ProductService script not loaded.");
            }

        } catch (fatalError) {
            console.error("App Init Fatal Error:", fatalError);
        } finally {
            this.bindEvents();
        }
    },

    applyGlobalSettings(settings) {
        console.log("Applying Global Settings to UI:", settings);

        // 1. Theme Configuration
        if (settings.primaryColor) {
            document.documentElement.style.setProperty('--primary-hero', settings.primaryColor);
        }

        // 2. Identity (Store Name & Logo)
        if (settings.storeName) {
            document.title = settings.seoTitle || `${settings.storeName} | Brindes Personalizados`;
            const logos = document.querySelectorAll('.logo');
            logos.forEach(logo => {
                if (settings.logoUrl) {
                    logo.innerHTML = `<img src="${settings.logoUrl}" alt="${settings.storeName}" style="max-height: 40px;">`;
                } else {
                    logo.innerHTML = `<div class="logo-icon"><i class="ph-bold ph-cube"></i></div>${settings.storeName}`;
                }
            });
        }

        // 3. Promos / Top Bar
        const topBar = document.getElementById('promo-top-bar'); // Assuming this exists or will exist
        if (topBar) {
            if (settings.topBarActive && settings.topBarText) {
                topBar.innerText = settings.topBarText;
                topBar.style.display = 'flex';
            } else {
                topBar.style.display = 'none';
            }
        }

        // 4. WhatsApp Floating Button & Footer
        if (settings.whatsapp) {
            const cleanWa = settings.whatsapp.replace(/\D/g, '');
            const floatBtn = document.querySelector('.whatsapp-float');
            if (floatBtn) {
                floatBtn.href = `https://wa.me/55${cleanWa}?text=${encodeURIComponent(settings.whatsappMsg || 'Olá! Vim do site e gostaria de saber mais sobre os produtos.')}`;
            }
        }

        // 5. Hero Banner (Dynamic Slides from Admin)
        if (settings.heroSlides && Array.isArray(settings.heroSlides)) {
            settings.heroSlides.forEach((slideData, idx) => {
                const slideEl = document.querySelector(`.hero-slide.slide-bg-${idx + 1}`);
                if (!slideEl) return;

                // Update texts
                const badgeEl = slideEl.querySelector('.hero-badge');
                if (badgeEl && slideData.badge) badgeEl.innerHTML = `<i class="ph-fill ph-star" style="color:#fbbf24; margin-right:5px;"></i> ${slideData.badge}`;

                const titleEl = slideEl.querySelector('.slide-title');
                if (titleEl && slideData.title) {
                    titleEl.innerHTML = `${slideData.title} <span style="color:var(--accent-orange);">${slideData.titleHighlight || ''}</span>`;
                }

                const subEl = slideEl.querySelector('.slide-text');
                if (subEl && slideData.text) subEl.innerText = slideData.text;

                const btns = slideEl.querySelectorAll('.slide-btn');
                if (btns.length > 0 && slideData.btn1Text) {
                    btns[0].innerText = slideData.btn1Text;
                    if (slideData.btn1Link === 'whatsapp') {
                         btns[0].setAttribute('onclick', 'openWhatsApp()');
                         btns[0].removeAttribute('href');
                    } else if (slideData.btn1Link) {
                         btns[0].href = slideData.btn1Link;
                         btns[0].removeAttribute('onclick');
                    }
                }
                if (btns.length > 1 && slideData.btn2Text) {
                    btns[1].innerText = slideData.btn2Text;
                    btns[1].style.display = 'inline-block';
                    if (slideData.btn2Link === 'whatsapp') {
                         btns[1].setAttribute('onclick', 'openWhatsApp()');
                         btns[1].removeAttribute('href');
                    } else if (slideData.btn2Link) {
                         btns[1].href = slideData.btn2Link;
                         btns[1].removeAttribute('onclick');
                    }
                } else if (btns.length > 1) {
                    btns[1].style.display = 'none'; // Hide if no text
                }

                // Handle Video Background
                if (slideData.videoUrl && slideData.videoUrl.trim() !== '') {
                    // Check if video already exists
                    let videoEl = slideEl.querySelector('.hero-bg-video');
                    if (!videoEl) {
                        videoEl = document.createElement('video');
                        videoEl.className = 'hero-bg-video';
                        videoEl.autoplay = true;
                        videoEl.loop = true;
                        videoEl.muted = true;
                        videoEl.playsInline = true;
                        videoEl.style.position = 'absolute';
                        videoEl.style.top = '0';
                        videoEl.style.left = '0';
                        videoEl.style.width = '100%';
                        videoEl.style.height = '100%';
                        videoEl.style.objectFit = 'cover';
                        videoEl.style.zIndex = '0'; // Behind the ::before linear-gradient overlayer
                        slideEl.insertBefore(videoEl, slideEl.firstChild);
                    }
                    if (videoEl.src !== slideData.videoUrl) {
                        videoEl.src = slideData.videoUrl;
                    }
                } else {
                    const videoEl = slideEl.querySelector('.hero-bg-video');
                    if (videoEl) videoEl.remove();
                }
            });
        }

        // 6. Stats Section
        const statYears = document.getElementById('stat-years');
        const statProducts = document.getElementById('stat-products');
        const statClients = document.getElementById('stat-clients');

        if (statYears && settings.statYears) statYears.innerText = settings.statYears;
        if (statProducts && settings.statProducts) statProducts.innerText = settings.statProducts;
        if (statClients && settings.statClients) statClients.innerText = settings.statClients;

        // 7. Portfolio (Nossos Trabalhos)
        const portCard1 = document.getElementById('port-card-1');
        const portCard2 = document.getElementById('port-card-2');
        if (portCard1) {
            if (settings.portBg1) portCard1.style.background = settings.portBg1;
            if (document.getElementById('port-tag-1') && settings.portTag1) document.getElementById('port-tag-1').innerText = settings.portTag1;
            if (document.getElementById('port-title-1') && settings.portTitle1) document.getElementById('port-title-1').innerText = settings.portTitle1;
            if (document.getElementById('port-desc-1') && settings.portDesc1) document.getElementById('port-desc-1').innerText = settings.portDesc1;
        }
        if (portCard2) {
            if (settings.portBg2) portCard2.style.background = settings.portBg2;
            if (document.getElementById('port-tag-2') && settings.portTag2) document.getElementById('port-tag-2').innerText = settings.portTag2;
            if (document.getElementById('port-title-2') && settings.portTitle2) document.getElementById('port-title-2').innerText = settings.portTitle2;
            if (document.getElementById('port-desc-2') && settings.portDesc2) document.getElementById('port-desc-2').innerText = settings.portDesc2;
        }

        // 8. FAQ Section
        if (document.getElementById('faq-q1') && settings.faqQ1) document.getElementById('faq-q1').innerText = settings.faqQ1;
        if (document.getElementById('faq-a1') && settings.faqA1) document.getElementById('faq-a1').innerText = settings.faqA1;
        if (document.getElementById('faq-q2') && settings.faqQ2) document.getElementById('faq-q2').innerText = settings.faqQ2;
        if (document.getElementById('faq-a2') && settings.faqA2) document.getElementById('faq-a2').innerText = settings.faqA2;
        if (document.getElementById('faq-q3') && settings.faqQ3) document.getElementById('faq-q3').innerText = settings.faqQ3;
        if (document.getElementById('faq-a3') && settings.faqA3) document.getElementById('faq-a3').innerText = settings.faqA3;

        // 9. Footer Text Injection
        if (document.getElementById('footer-store-name') && settings.storeName) document.getElementById('footer-store-name').innerText = settings.storeName;
        if (document.getElementById('footer-about-text') && settings.seoTitle) document.getElementById('footer-about-text').innerText = settings.seoTitle;
        if (document.getElementById('footer-whatsapp') && settings.whatsapp) document.getElementById('footer-whatsapp').innerText = settings.whatsapp;

        const f = settings.footer || {};
        if (document.getElementById('footer-email') && f.email) document.getElementById('footer-email').innerText = f.email;
        
        const insta = document.getElementById('footer-social-instagram');
        if (insta && f.instagram) {
            insta.href = f.instagram;
            insta.style.display = 'inline-flex';
        }

        const linkedin = document.getElementById('footer-social-linkedin');
        if (linkedin && f.linkedin) {
            linkedin.href = f.linkedin;
            linkedin.style.display = 'inline-flex';
        }


        // 10. Store Open/Close Overlay
        if (settings.storeOpen === false) {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0';
            overlay.style.width = '100vw'; overlay.style.height = '100vh';
            overlay.style.background = 'rgba(0,0,0,0.9)';
            overlay.style.color = '#fff';
            overlay.style.zIndex = '999999';
            overlay.style.display = 'flex';
            overlay.style.flexDirection = 'column';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.textAlign = 'center';
            overlay.innerHTML = `
                <i class="ph-duotone ph-storefront" style="font-size: 5rem; margin-bottom: 20px; color: var(--accent-orange);"></i>
                <h1 style="font-size: 2.5rem; margin-bottom: 15px;">Loja Fechada</h1>
                <p style="font-size: 1.2rem; color: #cbd5e1; max-width: 600px;">${settings.closedMsg || 'Voltaremos em breve!'}</p>
            `;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        }
    },

    async loadCategories() {
        console.log('📁 Loading categories from Database...');

        try {
            const { data: cats } = await window.supabase.from('categories').select('*').order('name');

            if (cats && cats.length > 0) {
                // Filter out corrupt data (apenas nomes nulos)
                const validCats = cats.filter(c => c.name && c.name.trim().length > 0);

                if (validCats.length > 0) {
                    const roots = validCats.filter(c => !c.parent_id);
                    const children = validCats.filter(c => c.parent_id);

                    this.categoryTree = roots.map(root => ({
                        ...root,
                        subs: children.filter(c => c.parent_id === root.id)
                    }));

                    console.log('✅ Categories from database loaded successfully:', this.categoryTree.map(c => c.name));
                    this.renderCategoryFilters();
                    return; // Successfully loaded hierarchical data from DB!
                }
            }
        } catch (err) {
            console.error('Error loading from database:', err);
        }

        console.log('⚠️ Failed to load from Database or empty. Falling back to Product extraction...');
        // Fallback: extract categories from products 
        const products = productService.getAll();

        if (products && products.length > 0) {
            const categoryNames = [...new Set(products.map(p => p.category).filter(c => c))];

            const validCategories = categoryNames.filter(name => {
                return name.length > 2 && !['fs', 's', 'test'].includes(name.toLowerCase());
            });

            if (validCategories.length > 0) {
                this.categoryTree = validCategories.map(catName => ({
                    id: catName.toLowerCase().replace(/\s+/g, '-'),
                    name: catName,
                    slug: catName.toLowerCase().replace(/\s+/g, '-'),
                    subs: []
                }));

                console.log('✅ Categories extracted from products:', this.categoryTree.map(c => c.name));
                this.renderCategoryFilters();
            }
        }
    },

    renderCategoryFilters() {
        const container = document.getElementById('category-filters');
        if (!container) return;

        const minQtyEl = document.getElementById('min-qty-filter');

        if (this.activeCategory === 'Todos') {
            // Modo "Todos" → Deixa a barra limpa apenas com os filtros à direita
            if (minQtyEl) { minQtyEl.style.display = 'none'; minQtyEl.value = ''; }
            this.updateResultCount(null);

            // Não renderiza mais os pills redundantes, mantém o visual minimalista
            container.innerHTML = `<span style="display:flex; align-items:center; gap:6px; font-size:0.9rem; font-weight:700; color:#64748b; padding: 0 8px;"><i class="ph-fill ph-circles-four" style="color:#64748b;"></i> Catálogo Completo</span>`;
        } else {
            // Modo categoria ativa → mostra botão voltar + label da categoria
            if (minQtyEl) minQtyEl.style.display = '';
            const label = this.activeCategoryLabel || this.activeCategory;
            
            let displayHTML = `
                <button onclick="app.setCategoryFilter('Todos')" style="background:#f1f5f9; color:#64748b; border:none; border-radius:30px; padding:6px 12px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:4px; transition:all 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                    <i class="ph-bold ph-arrow-left" style="font-size:0.8rem;"></i> Voltar
                </button>
            `;

            let relatedPills = '';
            let mainLabel = label;

            if (this.categoryTree) {
                let parentNode = null;
                
                // Procurar nó pai
                let rootNode = this.categoryTree.find(r => r.name === this.activeCategory);
                if (rootNode) {
                    parentNode = rootNode;
                    mainLabel = rootNode.name;
                } else if (this.activeParentName) {
                    rootNode = this.categoryTree.find(r => r.name === this.activeParentName);
                    if (rootNode) {
                        parentNode = rootNode;
                        mainLabel = rootNode.name;
                    }
                } else {
                    rootNode = this.categoryTree.find(r => r.subs && r.subs.some(s => s.name === this.activeCategory));
                    if (rootNode) {
                        parentNode = rootNode;
                        mainLabel = rootNode.name;
                    }
                }

                if (parentNode && parentNode.subs && parentNode.subs.length > 0) {
                    const isAllSelected = this.activeCategory === parentNode.name;
                    const styleAll = isAllSelected 
                        ? 'background:var(--accent-orange, #ea580c); color:white; border-color:var(--accent-orange, #ea580c);'
                        : 'background:white; color:#64748b; border-color:#cbd5e1;';

                    relatedPills += `
                    <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; margin-left:12px; border-left: 2px solid #e2e8f0; padding-left:15px; scrollbar-width: none;">
                        <button onclick="app.filterByCategory('${parentNode.name}', '${parentNode.name}')" 
                                style="border:1px solid; border-radius:30px; padding:6px 16px; cursor:pointer; font-weight:600; white-space:nowrap; transition:all 0.2s; ${styleAll}">
                            Todos
                        </button>
                    `;

                    parentNode.subs.forEach(s => {
                        const isSelected = this.activeCategory === s.name;
                        const stylePill = isSelected 
                            ? 'background:var(--primary-hero, #1e293b); color:white; border-color:var(--primary-hero, #1e293b);'
                            : 'background:white; color:#64748b; border-color:#cbd5e1;';

                        relatedPills += `
                        <button onclick="app.filterByCategory('${s.name}', '${s.name}', '${parentNode.name}')" 
                                style="border:1px solid; border-radius:30px; padding:6px 16px; cursor:pointer; font-weight:600; white-space:nowrap; transition:all 0.2s; ${stylePill}">
                            ${s.name}
                        </button>`;
                    });

                    relatedPills += `</div>`;
                }
            }

            container.innerHTML = `
                <div style="display:flex; align-items:center; width:100%;">
                    ${displayHTML}
                    <span style="display:flex; align-items:center; font-size:1.05rem; font-weight:800; color:#1e293b; margin: 0 5px 0 15px; white-space:nowrap;">
                        ${mainLabel}
                    </span>
                    ${relatedPills}
                </div>
            `;
        }
    },

    setCategoryFilter(name, label) {
        this.activeCategory = name;
        this.activeCategoryLabel = label || name;
        // Reset sub-filtros ao mudar de categoria
        const sq = document.getElementById('min-qty-filter');
        if (sq) sq.value = '';
        const s = document.getElementById('product-search-sticky');
        if (s) s.value = '';
        const sort = document.getElementById('sort-select');
        if (sort) sort.value = 'relevance';
        this.applySubFilters();
        this.renderCategoryFilters();
        // Destaca no mega menu
        document.querySelectorAll('.mega-cat-btn, .mega-dropdown-item, .mega-mobile-item').forEach(btn => {
            btn.classList.remove('mm-active');
        });
    },

    applySubFilters() {
        const searchVal = (document.getElementById('product-search-sticky')?.value || '').toLowerCase();
        const sortVal   = document.getElementById('sort-select')?.value || 'relevance';
        const minQty    = parseInt(document.getElementById('min-qty-filter')?.value || '0') || 0;
        this.currentSort = sortVal;

        // ---- MAGIC AI CATEGORY DETECTOR ----
        if (searchVal && searchVal.length >= 3 && this.categoryTree) {
            let foundSub = null;
            let foundParent = null;

            const simplify = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const sVal = simplify(searchVal);
            const sValWords = sVal.split(' ').filter(w => w.length > 3);

            for (const root of this.categoryTree) {
                if (root.subs) {
                    for (const sub of root.subs) {
                        const subWords = simplify(sub.name).split(/[^a-z0-9]/).filter(w => w.length > 3);
                        let isMatch = false;
                        
                        if (simplify(sub.name).includes(sVal) || sVal.includes(simplify(sub.name).replace(/\s/g, ''))) {
                            isMatch = true;
                        }

                        if (!isMatch) {
                            for (const sw of subWords) {
                                const radical = sw.length >= 5 ? sw.substring(0, 5) : sw;
                                for (const vw of sValWords) {
                                    if (vw.startsWith(radical) || sw.startsWith(vw.length >= 5 ? vw.substring(0,5) : vw)) {
                                        isMatch = true;
                                        break;
                                    }
                                }
                                if (isMatch) break;
                            }
                        }

                        if (isMatch) {
                            foundSub = sub;
                            foundParent = root;
                            break;
                        }
                    }
                }
                if (foundSub) break;
            }

            if (foundSub && this.activeCategory !== foundSub.name) {
                // Ao invés de loop contínuo, seta a categoria e chama o render com setTimeout leve
                setTimeout(() => {
                    this.filterByCategory(foundSub.name, foundSub.name, foundParent.name);
                }, 10);
                return; 
            }
        }
        // ------------------------------------

        let list = productService.getAll();

        // 1. Filtro de categoria
        if (this.activeCategory && this.activeCategory !== 'Todos') {
            const targets = [this.activeCategory];
            const root = this.categoryTree.find(r => r.name === this.activeCategory);
            if (root && root.subs) targets.push(...root.subs.map(s => s.name));
            
            list = list.filter(p => {
                const pCat = p.category || '';
                const pSubCat = p.subcategory || '';
                // Busca ampla novamente para encontrar categorias como "Apostilas & Impressão" através do filtro curto "Apostilas"
                return targets.some(t => {
                    return pCat === t || (typeof pCat === 'string' && pCat.includes(t)) ||
                           pSubCat === t || (typeof pSubCat === 'string' && pSubCat.includes(t));
                });
            });
        }

        // 2. Filtro de busca
        if (searchVal) {
            list = list.filter(p =>
                p.name.toLowerCase().includes(searchVal) ||
                (p.category && p.category.toLowerCase().includes(searchVal)) ||
                (p.subcategory && p.subcategory.toLowerCase().includes(searchVal)) ||
                (p.description && p.description.toLowerCase().includes(searchVal))
            );
        }

        // 3. Filtro de qtd mínima
        if (minQty > 0) {
            list = list.filter(p => !p.min_qty || Number(p.min_qty) <= minQty);
        }

        // 4. Ordenação
        if (sortVal === 'price_asc')  list.sort((a, b) => a.price - b.price);
        if (sortVal === 'price_desc') list.sort((a, b) => b.price - a.price);
        if (sortVal === 'name_asc')   list.sort((a, b) => a.name.localeCompare(b.name));

        this.renderProducts(list);
        this.updateResultCount(list.length);
    },

    updateResultCount(count) {
        const el = document.getElementById('catalog-result-count');
        if (!el) return;
        if (count === null || this.activeCategory === 'Todos') {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        el.textContent = count === 0
            ? 'Nenhum produto encontrado para esta seleção.'
            : `${count} produto${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''} em "${this.activeCategoryLabel || this.activeCategory}"`;
    },


    bindEvents() {
        // A busca agora é tratada via oninput="app.applySubFilters()" no HTML
        // Mantendo apenas sincronização entre campos de busca se existirem dois
        const searchInput = document.getElementById('product-search-sticky');
        const mainSearch  = document.getElementById('product-search');
        if (searchInput && mainSearch) {
            searchInput.addEventListener('input', () => { mainSearch.value = searchInput.value; });
            mainSearch.addEventListener('input', () => {
                searchInput.value = mainSearch.value;
                this.applySubFilters();
            });
        }
    },

    filterByCategory(category, label, parentName = null) {
        // Alerta de depuração provisório para o usuário ver:
        if (window.Swal) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'Buscando: ' + (label || category),
                text: 'Procurando produtos com essa Categoria/Subcategoria no banco de dados...',
                showConfirmButton: false,
                timer: 4000
            });
        }
        
        this.activeCategory = category;
        this.activeCategoryLabel = label || category;
        this.activeParentName = parentName;
        this.applySubFilters();
        this.renderCategoryFilters();
    },


    // Modal Logic
    openModal(product) {
        this.currentProduct = product;

        // Check if user is logged in
        const isLoggedIn = authService && authService.isAuthenticated();

        // Populate Common Data
        document.getElementById('modal-image').style.backgroundImage = `url('${product.image}')`;
        const sku = `KIT-${product.id.substring(0, 4).toUpperCase()}`;
        if (document.getElementById('modal-sku')) document.getElementById('modal-sku').innerText = sku;
        document.getElementById('modal-title').innerText = product.name;

        // Handle Description
        document.getElementById('modal-desc').innerText = product.description;

        // Elements to Toggle
        const detailsContainer = document.querySelector('.modal-details');

        // Remove ANY existing Guest Message
        const existingMsg = document.getElementById('guest-lock-msg');
        if (existingMsg) existingMsg.remove();

        // Reveal/Hide elements
        const priceRow = document.querySelector('.price-display-row');
        const controlsRow = document.querySelector('.controls-row');
        const stockWarn = document.querySelector('.stock-warning');
        const btnBuy = document.querySelector('.btn-buy-now');

        if (isLoggedIn) {
            // SHOW EVERYTHING
            if (priceRow) priceRow.style.display = 'flex';
            if (controlsRow) controlsRow.style.display = 'grid';
            if (stockWarn) stockWarn.style.display = 'block';
            if (btnBuy) btnBuy.style.display = 'flex';

            // Populate Price
            const priceElement = document.getElementById('modal-price');
            priceElement.innerText = `R$ ${product.price.toFixed(2)}`;
            priceElement.style.color = '#64748b';
            priceElement.style.fontSize = '1.5rem';

            // Qty Input
            const qtyInput = document.getElementById('modal-qty-input');
            qtyInput.value = 1; // Default to 1 to avoid confusion
            this.updateTotal();

        } else {
            // HIDE EVERYTHING & SHOW LOCK MESSAGE
            if (priceRow) priceRow.style.display = 'none';
            if (controlsRow) controlsRow.style.display = 'none';
            if (stockWarn) stockWarn.style.display = 'none';
            if (btnBuy) btnBuy.style.display = 'none';

            // Inject Lock Message
            const lockMsg = document.createElement('div');
            lockMsg.id = 'guest-lock-msg';
            lockMsg.style.textAlign = 'center';
            lockMsg.style.padding = '40px 20px';
            lockMsg.style.background = '#f8fafc';
            lockMsg.style.borderRadius = '12px';
            lockMsg.style.marginTop = '20px';
            lockMsg.innerHTML = `
                <i class="ph-duotone ph-lock-key" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                <h3 style="color: #334155; font-size: 1.2rem; margin-bottom: 8px;">Acesso Exclusivo</h3>
                <p style="color: #64748b; margin-bottom: 20px;">Cadastre-se ou faça login para visualizar preços e realizar pedidos.</p>
                <button onclick="toggleMainLoginModal(true)" class="btn-buy-now" style="width: auto; margin: 0 auto; display: inline-flex; font-size: 1rem; padding: 12px 24px;">
                    Criar Conta / Entrar
                </button>
            `;

            // Insert after SKU
            const skuEl = document.getElementById('modal-sku');
            skuEl.parentNode.insertBefore(lockMsg, skuEl.nextSibling);
        }

        // Populate Related Products (Random 3)
        const relatedContainer = document.getElementById('modal-related-grid');
        if (relatedContainer) {
            const allProducts = typeof productService !== 'undefined' ? productService.getAll() : [];
            const related = allProducts
                .filter(p => p.id !== product.id)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);

            relatedContainer.innerHTML = related.map(p => {
                const isOffer = p.name.includes('Boas Vindas') || Math.random() > 0.7; // Mock offer logic
                const priceDisplay = isLoggedIn ? `R$ ${p.price.toFixed(2)}` : 'Login p/ ver preço';

                return `
                    <div class="mini-product-card" onclick="app.findAndOpen('${p.id}')">
                        ${isOffer ? '<div class="mini-tag"><i class="ph-bold ph-lightning"></i> Oferta!!</div>' : ''}
                        <div class="mini-img" style="background-image: url('${p.image}');"></div>
                        <h4 class="mini-title">${p.name}</h4>
                        <div class="mini-sku">COD-${p.id.substring(0, 4).toUpperCase()}</div>
                        <div class="mini-price">${priceDisplay}</div>
                    </div>
                 `;
            }).join('');
        }

        document.getElementById('product-modal-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    adjustQty(change) {
        const input = document.getElementById('modal-qty-input');
        let val = parseInt(input.value) || 0;
        val += change;
        if (val < 1) val = 1;
        input.value = val;
        this.updateTotal();
    },

    updateTotal() {
        if (!this.currentProduct) return;

        const totalEl = document.getElementById('modal-total-price');
        const isLoggedIn = authService && authService.isAuthenticated();

        if (!isLoggedIn) {
            if (totalEl) totalEl.innerHTML = '<span style="font-size:1rem; color:#ccc;">---</span>';
            return;
        }

        const input = document.getElementById('modal-qty-input');
        const qty = parseInt(input.value) || 0;
        const total = qty * this.currentProduct.price;

        if (totalEl) {
            // Format currency nicely
            totalEl.innerHTML = `R$ <span style="color:#10b981;">${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
        }
    },

    closeModal() {
        document.getElementById('product-modal-overlay').classList.remove('open');
        document.body.style.overflow = '';
    },

    toggleModalType(type, btn) {
        document.querySelectorAll('.toggle-opt').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const pjFields = document.getElementById('pj-fields');
        if (type === 'pj') {
            pjFields.style.display = 'block';
        } else {
            pjFields.style.display = 'none';
        }
    },

    async submitRequest() {
        console.log("🛒 submitRequest called. Product:", this.currentProduct);

        try {
            // Enforce Login for Buying
            // Check if authService exists
            if (!window.authService) {
                console.warn("AuthService missing, loading...");
                // Fallback or wait? For now, alert.
            }

            // Removed forced login check to allow guests to add to cart
            // if (!isLoggedIn) { ... } logic removed


            if (!this.currentProduct) {
                Swal.fire('Erro', 'Nenhum produto selecionado.', 'error');
                return;
            }

            const qtyInput = document.getElementById('modal-qty-input');
            const qty = parseInt(qtyInput.value) || 100;

            // Get Customization (Default always)
            const customization = 'Sem gravação';

            // NEW: Add to Cart
            if (window.cartService) {
                console.log("➕ Adding to cart logic triggered");
                window.cartService.addToCart(this.currentProduct, qty, customization);
                this.closeModal();

                // Drawer opens automatically via cartService.addToCart()
                // Removed SweetAlert logic using setTimeout


            } else {
                console.error("CartService not found!");
                Swal.fire('Erro Sistema', 'Erro ao carregar módulo de carrinho. Tente recarregar a página (F5).', 'error');
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Erro Inesperado',
                text: err.message,
                confirmButtonColor: '#ef4444'
            });
        }
    },

    // === PERSONALIZATION FUNCTIONS (Elo7 Style) ===

    handleLogoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            Swal.fire('Arquivo muito grande', 'O tamanho máximo é 5MB. Por favor, envie um arquivo menor.', 'error');
            event.target.value = '';
            return;
        }

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            Swal.fire('Formato inválido', 'Envie apenas arquivos PNG, JPG, PDF ou AI.', 'error');
            event.target.value = '';
            return;
        }

        // Show preview
        const preview = document.getElementById('logo-preview');
        const filename = document.getElementById('logo-filename');
        if (preview && filename) {
            filename.textContent = file.name;
            preview.style.display = 'flex';
        }

        // Store file reference for later upload
        this.uploadedLogo = file;

        Swal.fire({
            icon: 'success',
            title: 'Logo anexada!',
            text: `Arquivo "${file.name}" será enviado com seu pedido.`,
            timer: 2000,
            showConfirmButton: false
        });
    },

    openWhatsAppCustomization() {
        const product = this.currentProduct;
        if (!product) return;

        const qty = document.getElementById('modal-qty-input')?.value || 1;
        const notes = document.getElementById('modal-custom-notes')?.value || '';
        const hasLogo = this.uploadedLogo ? '✅ Logo anexada' : '❌ Preciso enviar logo';

        const msg = `Olá! Gostaria de personalizar:\n\n📦 *Produto:* ${product.name}\n🔢 *Quantidade:* ${qty} unidades\n🎨 *Logo:* ${hasLogo}\n\n📝 *Observações:*\n${notes || 'Nenhuma observação'}\n\nPode me ajudar?`;

        window.open(`https://wa.me/5531987398136?text=${encodeURIComponent(msg)}`);
    },

    // --- New Catalog Logic ---

    currentSort: 'relevance',
    currentView: 'grid',

    sortProducts(criteria) {
        this.currentSort = criteria;
        const sortEl = document.getElementById('sort-select');
        if (sortEl) sortEl.value = criteria;
        this.applySubFilters();
    },


    toggleView(view) {
        this.currentView = view;
        const grid = document.getElementById('products-grid');
        const btns = document.querySelectorAll('.view-btn');

        if (view === 'list') {
            grid.classList.add('list-view');
            btns[1].classList.add('active');
            btns[0].classList.remove('active');
        } else {
            grid.classList.remove('list-view');
            btns[0].classList.add('active');
            btns[1].classList.remove('active');
        }
    },

    async toggleWishlist(id) {
        // Use favorites service if available
        if (window.favoritesService) {
            await window.favoritesService.toggle(id);

            // Update UI button class
            const btn = document.getElementById(`fav-${id}`);
            if (btn) {
                const isFav = window.favoritesService.isFavorite(id);
                btn.classList.toggle('active', isFav);
            }
        } else {
            // Fallback to localStorage
            const wishlist = JSON.parse(localStorage.getItem('mv_wishlist')) || [];
            const index = wishlist.indexOf(id);

            if (index >= 0) {
                wishlist.splice(index, 1);
            } else {
                wishlist.push(id);
            }

            localStorage.setItem('mv_wishlist', JSON.stringify(wishlist));

            // Update UI button class
            const btn = document.getElementById(`fav-${id}`);
            if (btn) btn.classList.toggle('active');
        }
    },

    changeSwatch(prodId, color, imgUrl) {
        const imgEl = document.getElementById(`img-${prodId}`);
        if (imgEl) {
            imgEl.style.backgroundImage = `url('${imgUrl}')`;
        }
    },

    renderProducts(list) {
        const container = document.getElementById('products-grid');
        if (!container) return;

        // Check if user is logged in
        const isLoggedIn = authService && authService.isAuthenticated();

        // Apply Sort
        let sortedList = [...list];
        if (this.currentSort === 'price_asc') sortedList.sort((a, b) => a.price - b.price);
        else if (this.currentSort === 'price_desc') sortedList.sort((a, b) => b.price - a.price);
        else if (this.currentSort === 'name_asc') sortedList.sort((a, b) => a.name.localeCompare(b.name));

        if (sortedList.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Nenhum produto encontrado.</div>`;
            return;
        }

        const wishlist = JSON.parse(localStorage.getItem('mv_wishlist')) || [];

        container.innerHTML = sortedList.map(product => {
            const isFav = wishlist.includes(product.id);
            // Show badge if it's the specific kit from image (just for demo) or add a logic
            const isOffer = product.name.includes('Boas Vindas 3 Peça') || product.name.includes('Kit-0181');

            // Conditional price display
            let priceHTML;
            if (isLoggedIn) {
                priceHTML = `<div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>`;
            } else {
                priceHTML = `<div class="product-price-locked" style="font-size: 0.9rem; color: #94a3b8; font-weight: 500;">Login para ver preço</div>`;
            }

            // ===== ELO7 STYLE: RATINGS ON CARDS =====
            // Mock rating data (will be replaced with real data from reviews table later)
            const mockRating = product.rating || (3.5 + Math.random() * 1.5); // Random 3.5-5.0
            const mockReviewCount = product.reviewCount || Math.floor(Math.random() * 50) + 5;
            const fullStars = Math.floor(mockRating);
            const hasHalfStar = (mockRating % 1) >= 0.5;

            let starsHTML = '';
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    starsHTML += '<i class="ph-fill ph-star" style="color: #f59e0b;"></i>';
                } else if (i === fullStars && hasHalfStar) {
                    starsHTML += '<i class="ph-fill ph-star-half" style="color: #f59e0b;"></i>';
                } else {
                    starsHTML += '<i class="ph ph-star" style="color: #cbd5e1;"></i>';
                }
            }

            const reviewHTML = `
                <div class="product-rating" style="display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.85rem;">
                    <div class="stars" style="display: flex; gap: 2px; font-size: 0.9rem;">${starsHTML}</div>
                    <span style="color: #64748b; font-size: 0.8rem;">${mockRating.toFixed(1)}</span>
                    <span style="color: #94a3b8; font-size: 0.75rem;">(${mockReviewCount})</span>
                </div>
            `;

            return `
                <div class="product-card" onclick="window.location.href='produto.html?id=${product.id}'">
                    ${isOffer ? '<span class="badge-offer"><i class="ph-bold ph-fire"></i> Oferta!!</span>' : ''}
                    
                    <button id="fav-${product.id}" class="wishlist-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist('${product.id}')">
                        <i class="ph-fill ph-heart"></i>
                    </button>
                    
                    <div class="product-img-wrapper">
                        <div class="product-image" style="background-image: url('${product.image || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop&q=80'}');"></div>
                    </div>
                    
                    <div class="product-info-center">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-sku">${product.id.substring(0, 8).toUpperCase()}</div>
                        
                        ${priceHTML}
                    </div>
                </div>
            `;
        }).join('');
    },

    renderRecommended(list) {
        const container = document.getElementById('recommended-grid');
        if (!container) return;

        // Custom Logic: Pick 4 specific or random high-rated products
        // For now, let's pick 4 randoms or items with 'Kit' in name
        let featured = list.filter(p => p.rating && p.rating >= 4.5);

        // Fallback if no high rated
        if (featured.length < 4) {
            featured = [...list].sort(() => 0.5 - Math.random());
        }

        const top4 = featured.slice(0, 4);

        // Helper to render card (duplicated from renderProducts for now, could be refactored)
        const renderCard = (product) => {
            const isLoggedIn = authService && authService.isAuthenticated();
            const wishlist = JSON.parse(localStorage.getItem('mv_wishlist')) || [];
            const isFav = wishlist.includes(product.id);
            const isOffer = product.name.includes('Boas Vindas') || product.name.includes('Kit');

            let priceHTML;
            if (isLoggedIn) {
                priceHTML = `<div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>`;
            } else {
                priceHTML = `<div class="product-price-locked" style="font-size: 0.9rem; color: #94a3b8; font-weight: 500;">Login</div>`;
            }

            // Mock Rating
            const mockRating = product.rating || (4.0 + Math.random());
            const mockReviewCount = product.reviewCount || 12;

            return `
                <div class="product-card" onclick="window.location.href='produto.html?id=${product.id}'">
                    ${isOffer ? '<span class="badge-offer" style="background:var(--accent-orange);"><i class="ph-bold ph-star"></i> Destaque</span>' : ''}
                    
                    <button id="fav-rec-${product.id}" class="wishlist-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist('${product.id}')">
                        <i class="ph-fill ph-heart"></i>
                    </button>
                    
                    <div class="product-img-wrapper">
                         <div class="product-image" style="background-image: url('${product.image || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=400&fit=crop&q=80'}');"></div>
                    </div>
                    
                    <div class="product-info-center">
                        <h3 class="product-title" style="font-size:1rem;">${product.name}</h3>
                        <div class="product-sku" style="font-size:0.75rem;">${product.id.substring(0, 8).toUpperCase()}</div>

                        ${priceHTML}
                    </div>
                </div>
            `;
        };

        container.innerHTML = top4.map(p => renderCard(p)).join('');
    },

    findAndOpen(id) {
        let product = null;

        // Try getting from Service memory first
        if (typeof productService !== 'undefined' && productService.getAll) {
            product = productService.getAll().find(p => p.id === id);
        }

        // Fallback to Cache if not found (e.g. before Init completes)
        if (!product) {
            const cached = JSON.parse(localStorage.getItem('mv_products') || '[]');
            product = cached.find(p => p.id === id);
        }

        if (product) {
            this.openModal(product);
        } else {
            console.error("Product not found:", id);
        }
    },

    // Search Products
    searchProducts(query) {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear');

        // Show/hide clear button
        if (query.length > 0) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }

        const allProducts = window.productService ? window.productService.getAll() : [];

        // If empty, show all
        if (!query || query.trim().length === 0) {
            this.renderProducts(allProducts);
            return;
        }

        const searchTerm = query.toLowerCase().trim();

        const filtered = allProducts.filter(product => {
            const nameMatch = product.name.toLowerCase().includes(searchTerm);
            const categoryMatch = product.category && product.category.toLowerCase().includes(searchTerm);
            const descMatch = product.description && product.description.toLowerCase().includes(searchTerm);

            return nameMatch || categoryMatch || descMatch;
        });

        this.renderProducts(filtered);

        // Scroll to catalog
        const catalog = document.getElementById('catalogo');
        if (catalog) {
            catalog.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },

    clearSearch() {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear');

        searchInput.value = '';
        clearBtn.style.display = 'none';

        // Reset to all products
        const allProducts = window.productService ? window.productService.getAll() : [];
        this.renderProducts(allProducts);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Exporta app para componentes de terceiros como o MegaMenu acessarem:
window.app = app;

// Re-render products when auth state changes (to show/hide prices)
document.addEventListener('auth:stateChanged', () => {
    console.log("Auth State Changed: Re-rendering products...");
    app.renderProducts(productService.getAll());
});
