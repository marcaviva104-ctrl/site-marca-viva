/**
 * Marca Viva - High Performance App Logic
 */

const app = {
    currentProduct: null,

    activeCategory: 'Todos',
    categoryTree: [],

    async init() {
        // Initialize products (fetch from Supabase)
        // Wait for service to be ready
        console.log('App Init...');
        let attempts = 0;
        while ((!window.productService || !window.productService.init) && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (window.productService && window.productService.init) {
            await productService.init();

            // Render Products First
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
        document.getElementById('modal-id').innerText = product.id;
        document.getElementById('modal-cat').innerText = product.category;
        document.getElementById('modal-title').innerText = product.name;
        document.getElementById('modal-desc').innerText = product.description;

        // Conditional price display in modal
        const priceElement = document.getElementById('modal-price');
        if (isLoggedIn) {
            priceElement.innerHTML = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
            priceElement.style.background = 'transparent';
            priceElement.style.color = '#1e293b';
            priceElement.style.padding = '0';
        } else {
            priceElement.innerHTML = `<i class="ph-fill ph-lock" style="margin-right: 6px;"></i> Login necessário`;
            priceElement.style.background = 'linear-gradient(135deg, #f59e0b, #ea580c)';
            priceElement.style.color = 'white';
            priceElement.style.padding = '8px 16px';
            priceElement.style.borderRadius = '8px';
            priceElement.style.fontSize = '0.9rem';
            priceElement.style.fontWeight = '600';
            priceElement.style.display = 'inline-flex';
            priceElement.style.alignItems = 'center';
        }

        document.getElementById('modal-min').innerText = `${product.min || 20} unidades`;

        // Min Qty Input
        const qtyInput = document.getElementById('modal-qty-input');
        qtyInput.value = product.min || 1;
        // removed min restriction in JS to allow free typing, will validate on submit

        document.getElementById('product-modal-overlay').classList.add('open');

        // Prevent body scroll (except overlay)
        document.body.style.overflow = 'hidden';
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
        if (!this.currentProduct) return;

        const qtyInput = document.getElementById('modal-qty-input');
        const qty = parseInt(qtyInput.value) || 20;

        // 1. Prepare Customer Data
        // Try to get logged in user, otherwise use form data
        const currentUser = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;

        // If guest, grab from inputs (we need to ensure these exist in the modal HTML or logic)
        // For now, let's assume we use the inputs if available or fallbacks
        const nameInput = document.querySelector('.modal-input[placeholder="Seu nome"]');
        const emailInput = document.querySelector('.modal-input[placeholder="seu@email.com"]');

        const customerData = {
            name: currentUser ? currentUser.name : (nameInput ? nameInput.value : 'Cliente Recorrente'),
            email: currentUser ? currentUser.email : (emailInput ? emailInput.value : 'guest@marcaviva.com'),
            phone: phoneInput ? phoneInput.value : '5511999999999' // Placeholder or fetch from input
        };

        // 1. Upload Attachment if exists
        let attachmentUrl = null;
        const fileInput = document.getElementById('client-file-upload');
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            Swal.fire({ title: 'Enviando arquivo...', text: 'Aguarde um momento.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `client-upload-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { data, error } = await window.supabase.storage
                    .from('products') // Reusing products bucket for now
                    .upload(fileName, file);

                if (error) throw error;

                const { data: publicData } = window.supabase.storage
                    .from('products')
                    .getPublicUrl(fileName);

                attachmentUrl = publicData.publicUrl;
                Swal.close(); // Close loading
            } catch (err) {
                console.error("Upload Error:", err);
                Swal.fire('Erro no Upload', 'Falha ao enviar arquivo. O pedido será enviado sem o anexo.', 'warning');
            }
        }

        const order = {
            id: `ORD-${Date.now()}`,
            clientName: customerData.name,
            clientEmail: customerData.email,
            clientPhone: customerData.phone || '',
            clientType: this.currentType, // 'pf' or 'pj'
            product: {
                id: this.currentProduct.id,
                name: this.currentProduct.name,
                price: this.currentProduct.price,
                image: this.currentProduct.image
            },
            quantity: qty,
            total: this.currentProduct.price * qty,
            notes: document.getElementById('modal-obs') ? document.getElementById('modal-obs').value : '', // Use specific ID
            attachment: attachmentUrl, // Save URL
            company: this.currentType === 'pj' && document.querySelector('#pj-fields input') ?
                document.querySelector('#pj-fields input').value : '',
            status: 'pendente',
            date: new Date().toISOString()
        };

        // 2. Create Order in Supabase Strategy
        try {
            if (typeof dataManager !== 'undefined') {
                // Assuming dataManager.createOrder can now accept a more structured order object
                await dataManager.createOrder(order);
                console.log("Lead/Order created in system.");
            }
        } catch (err) {
            console.error("Error creating system order:", err);
            // Don't block the user flow
        }

        // 3. Open WhatsApp
        const message = `Olá! Gostaria de um orçamento para:\n\n` +
            `📦 *${this.currentProduct.name}*\n` +
            `🔢 Quantidade: ${qty}\n` +
            `💰 Preço Unitário: R$ ${this.currentProduct.price.toFixed(2)}\n` +
            `--------------------------------\n` +
            `📝 *Meus Dados:*\n` +
            `Nome: ${customerData.name}\n` +
            `Email: ${customerData.email}`;

        const encoded = encodeURIComponent(message);
        const PHONE = "5511999999999"; // TODO: Config

        window.open(`https://wa.me/${PHONE}?text=${encoded}`, '_blank');

        // 4. UI Feedback
        // alert(`Pedido de Orçamento enviado!`);
        this.closeModal();
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
            // Simulated Swatches (Mock data if not in product)
            const swatches = product.colors || [
                { color: '#1e293b', img: product.image },
                { color: '#3b82f6', img: product.image }, // Use same img for demo if no variants
                { color: '#ef4444', img: product.image }
            ];

            // Conditional price display
            const priceHTML = isLoggedIn
                ? `<div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>`
                : `<div class="product-price-locked" style="background: linear-gradient(135deg, #f59e0b, #ea580c); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <i class="ph-fill ph-lock" style="font-size: 1rem;"></i>
                    <span>Faça login para ver preços</span>
                   </div>`;

            return `
                <div class="product-card">
                    <button id="fav-${product.id}" class="wishlist-btn ${isFav ? 'active' : ''}" onclick="app.toggleWishlist('${product.id}')">
                        <i class="ph-fill ph-heart"></i>
                    </button>
                    
                    <div class="product-image" id="img-${product.id}" style="background-image: url('${product.image || 'https://via.placeholder.com/300'}');"></div>
                    
                    <div class="product-info">
                        <span class="product-cat">${product.category}</span>
                        <h3 class="product-title">${product.name}</h3>
                        ${priceHTML}
                        
                        <div style="margin-top: auto; display: flex; gap: 10px;">
                             <button onclick="app.findAndOpen('${product.id}')" class="btn btn-primary" style="flex: 1; border-radius: 8px;">
                                Ver Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    findAndOpen(id) {
        const product = productService.getAll().find(p => p.id === id);
        if (product) this.openModal(product);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
