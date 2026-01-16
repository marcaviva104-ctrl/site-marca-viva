/**
 * Marca Viva - High Performance App Logic
 */

const app = {
    currentProduct: null,

    activeCategory: 'Todos',
    categoryTree: [],

    async init() {
        console.log('App Init...');

        // 1. Instant Render from Cache (Optimistic)
        const cachedProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
        if (cachedProducts.length > 0) {
            console.log("App: Rendering from cache...");
            // We need to shim the 'productService' being ready or just pass the array
            // Since getAll returns the internal array, we can just pass cached directly
            this.renderProducts(cachedProducts);
        } else {
            // Show Loading Skeleton if no cache
            const container = document.getElementById('products-grid');
            if (container) container.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;"><i class="ph-duotone ph-spinner ph-spin" style="font-size:2rem;"></i><p>Carregando produtos...</p></div>';
        }

        // 2. Wait for Service & Fetch Fresh Data
        let attempts = 0;
        while ((!window.productService || !window.productService.init) && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (window.productService && window.productService.init) {
            await productService.init(); // Fetches from Supabase and updates DataManager.products

            // 3. Re-Render with Fresh Data
            this.renderProducts(productService.getAll());

            // Load Categories Dynamic
            await this.loadCategories();
        }
        this.bindEvents();
    },

    async loadCategories() {
        try {
            const { data: cats } = await window.supabase.from('categories').select('*').order('name');
            if (cats) {
                const roots = cats.filter(c => !c.parent_id);
                const children = cats.filter(c => c.parent_id);

                this.categoryTree = roots.map(root => ({
                    ...root,
                    subs: children.filter(c => c.parent_id === root.id)
                }));

                this.renderCategoryFilters();
            } else {
                // Fallback if empty or table missing (SQL not run)
                console.warn('No dynamic categories or SQL missing.');
            }
        } catch (err) { console.error(err); }
    },

    renderCategoryFilters(activeParent = null) {
        const container = document.getElementById('category-filters');
        if (!container) return;

        // Level 1: Roots
        let html = `<button class="filter-pill ${this.activeCategory === 'Todos' ? 'active' : ''}" onclick="app.setCategoryFilter('Todos', null)">Todos</button>`;

        // Add Dynamic Roots
        this.categoryTree.forEach(root => {
            const isActive = this.activeCategory === root.name || (activeParent === root.name);
            const style = isActive ? "background:var(--primary-hero); color:white;" : "";
            html += `<button class="filter-pill ${isActive ? 'active' : ''}" style="${style}" onclick="app.setCategoryFilter('${root.name}', 'root')">${root.name}</button>`;
        });

        // Level 2: Subcategories (New Line)
        if (activeParent) {
            const root = this.categoryTree.find(r => r.name === activeParent);
            if (root && root.subs && root.subs.length > 0) {
                html += `<div style="width:100%; margin-top:15px; padding-top:10px; border-top:1px dashed #e2e8f0; display:flex; gap:10px; flex-wrap:wrap; animation: fadeIn 0.3s ease;">`;

                // "All in Parent" option?
                // html += `<span style="font-size:0.8rem; color:#94a3b8; padding-top:6px;">Em ${root.name}:</span>`;

                root.subs.forEach(sub => {
                    const isSubActive = this.activeCategory === sub.name;
                    html += `<button class="filter-pill small ${isSubActive ? 'active' : ''}" 
                               style="font-size:0.85rem; padding:6px 15px; background:${isSubActive ? '#cbd5e1' : '#f1f5f9'}; color:${isSubActive ? '#0f172a' : '#64748b'};" 
                               onclick="app.setCategoryFilter('${sub.name}', 'sub')">${sub.name}</button>`;
                });
                html += `</div>`;

                // Force container to wrap to allow new line
                container.style.flexWrap = 'wrap';
            } else {
                container.style.flexWrap = 'nowrap';
            }
        } else {
            container.style.flexWrap = 'nowrap';
        }

        container.innerHTML = html;
    },

    setCategoryFilter(name, type) {
        this.activeCategory = name;

        // If clicking a Root, set it as active Parent to show subs
        if (type === 'root') {
            this.menuParent = name;
        } else if (name === 'Todos') {
            this.menuParent = null;
        }
        // If clicking sub, keep parent open?
        // Logic: find parent of sub
        if (type === 'sub') {
            // Keep current menuParent
        }

        this.filterByCategory(name);
        this.renderCategoryFilters(this.menuParent);
    },

    bindEvents() {
        // Search
        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const all = productService.getAll();
                const filtered = all.filter(p =>
                    p.name.toLowerCase().includes(term) ||
                    p.category.toLowerCase().includes(term)
                );
                this.renderProducts(filtered);
            });
        }
    },

    filterByCategory(category) {
        // Find children if it's a parent
        let targetCategories = [category];

        const root = this.categoryTree.find(r => r.name === category);
        if (root && root.subs) {
            // Add all subs to filter list
            targetCategories = targetCategories.concat(root.subs.map(s => s.name));
        }

        const all = productService.getAll();
        if (category === 'Todos') {
            this.renderProducts(all);
        } else {
            const filtered = all.filter(p => {
                // Check if product category matches target or any sub
                // Simple string match
                return targetCategories.some(tc => p.category === tc || p.category.includes(tc));
            });
            this.renderProducts(filtered);
        }
    },

    // Modal Logic
    openModal(product) {
        this.currentProduct = product;

        // Check if user is logged in
        const isLoggedIn = authService && authService.isAuthenticated();

        // Populate Data
        document.getElementById('modal-image').style.backgroundImage = `url('${product.image}')`;
        const sku = `KIT-${product.id.substring(0, 4).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;
        if (document.getElementById('modal-sku')) document.getElementById('modal-sku').innerText = sku;

        // document.getElementById('modal-cat').innerText = product.category; // Removed in new design
        document.getElementById('modal-title').innerText = product.name;
        document.getElementById('modal-desc').innerText = product.description;

        // Conditional price display in modal
        const priceElement = document.getElementById('modal-price');
        const totalElement = document.getElementById('modal-total-price');

        // Always show price
        priceElement.innerText = `R$ ${product.price.toFixed(2)}`;
        priceElement.style.color = '#1e293b';
        priceElement.style.fontSize = '2.5rem';


        // Qty Input
        const qtyInput = document.getElementById('modal-qty-input');
        qtyInput.value = 100; // Default 100 as requested

        this.updateTotal();

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
                const priceDisplay = isLoggedIn ? `R$ ${p.price.toFixed(2)}` : 'Sob Consulta';

                return `
                    <div class="mini-product-card" onclick="app.findAndOpen('${p.id}')">
                        ${isOffer ? '<div class="mini-tag"><i class="ph-bold ph-lightning"></i> Oferta!!</div>' : ''}
                        <div class="mini-img" style="background-image: url('${p.image}');"></div>
                        <h4 class="mini-title">${p.name}</h4>
                        <div class="mini-sku">COD-${p.id.substring(0, 4).toUpperCase()}</div>
                        ${isLoggedIn ? '<div class="mini-label">A partir de</div>' : ''}
                        <div class="mini-price">${priceDisplay}</div>
                    </div>
                 `;
            }).join('');

            // Ensure section title is dynamic based on category if needed
            // document.querySelector('.modal-related h3').innerText = `Mais ${product.category}`; 
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

        const isLoggedIn = authService && authService.isAuthenticated();
        if (!isLoggedIn) return;

        const input = document.getElementById('modal-qty-input');
        const qty = parseInt(input.value) || 0;
        const total = qty * this.currentProduct.price;

        const totalEl = document.getElementById('modal-total-price');
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

            // Get Customization
            const customSelect = document.getElementById('modal-custom-select');
            const customization = customSelect ? customSelect.value : 'Sem gravação';

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
            console.error("Submit Error:", err);
            alert("Erro inesperado: " + err.message);
        }
    },

    // --- New Catalog Logic ---

    currentSort: 'relevance',
    currentView: 'grid',

    sortProducts(criteria) {
        this.currentSort = criteria;
        // Re-apply filters which will trigger render with sort
        // For simplicity, we just re-render current list if we had stored it, 
        // but here we might need to re-fetch to be safe or store current filtered list.
        // Let's re-run the category filter which is the main state.
        const activeCat = document.querySelector('.filter-pill.active').innerText;
        this.filterByCategory(activeCat);
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

    toggleWishlist(id) {
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
            // Always show price
            const priceHTML = `<div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>`;


            return `
                <div class="product-card" onclick="app.findAndOpen('${product.id}')">
                    ${isOffer ? '<span class="badge-offer"><i class="ph-bold ph-fire"></i> Oferta!!</span>' : ''}
                    
                    <button id="fav-${product.id}" class="wishlist-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleWishlist('${product.id}')">
                        <i class="ph-fill ph-heart"></i>
                    </button>
                    
                    <div class="product-img-wrapper">
                        <div class="product-image" style="background-image: url('${product.image || 'https://via.placeholder.com/300'}');"></div>
                    </div>
                    
                    <div class="product-info-center">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-sku">${product.id.substring(0, 8).toUpperCase()}</div> <!-- Mock SKU using ID -->
                        
                        ${isLoggedIn ? '<div class="price-label">A partir de (100 un)</div>' : ''}
                        ${priceHTML}
                    </div>
                </div>
            `;
        }).join('');
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Re-render products when auth state changes (to show/hide prices)
document.addEventListener('auth:stateChanged', () => {
    console.log("Auth State Changed: Re-rendering products...");
    app.renderProducts(productService.getAll());
});
