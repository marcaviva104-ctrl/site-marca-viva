/**
 * Marca Viva - High Performance App Logic
 */

const app = {
    currentProduct: null,

    async init() {
        // Initialize products (fetch from Supabase)
        // Wait for service to be ready
        let attempts = 0;
        while ((!window.productService || !window.productService.init) && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (window.productService && window.productService.init) {
            await productService.init();
            this.renderProducts(productService.getAll());
        }
        this.bindEvents();
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
        document.querySelectorAll('.filter-pill').forEach(btn => {
            if (btn.innerText === category || (category === 'Todos' && btn.innerText === 'Todos')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const all = productService.getAll();
        if (category === 'Todos') {
            this.renderProducts(all);
        } else {
            const filtered = all.filter(p => {
                if (category === 'Kits') return p.category.includes('Boas-vindas');
                return p.category.includes(category);
            });
            this.renderProducts(filtered);
        }
    },

    // Modal Logic
    openModal(product) {
        this.currentProduct = product;

        // Populate Data
        document.getElementById('modal-image').style.backgroundImage = `url('${product.image}')`;
        document.getElementById('modal-id').innerText = product.id;
        document.getElementById('modal-cat').innerText = product.category;
        document.getElementById('modal-title').innerText = product.name;
        document.getElementById('modal-desc').innerText = product.description;
        document.getElementById('modal-price').innerText = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
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

    submitRequest() {
        if (!this.currentProduct) return;

        const qty = document.getElementById('modal-qty-input').value;
        alert(`Pedido de Orçamento enviado com sucesso para ${this.currentProduct.name} (${qty} unidades)! Entraremos em contato.`);
        this.closeModal();

        // Optional: Add to cart as well if needed
        // cartService.add(this.currentProduct, parseInt(qty));
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

            return `
                <div class="product-card">
                    <button id="fav-${product.id}" class="wishlist-btn ${isFav ? 'active' : ''}" onclick="app.toggleWishlist('${product.id}')">
                        <i class="ph-fill ph-heart"></i>
                    </button>

                    <div class="product-img" id="img-${product.id}" style="background-image: url('${product.image}')">
                        ${product.isPromo ? `<span class="badge-discount">-15%</span>` : ''}
                        
                        <button class="quick-add-btn" onclick="app.openModal(productService.getAll().find(p=>p.id==='${product.id}'))">
                            <i class="ph-bold ph-plus"></i> Espiar
                        </button>
                    </div>

                    <div class="product-content">
                        <span class="category-label">${product.category}</span>
                        <a href="product.html?id=${product.id}" style="text-decoration: none;">
                            <h3 class="product-title-link" style="font-size: 1.1rem; margin-bottom: 4px; color: #1e293b;">${product.name}</h3>
                        </a>

                        <!-- Swatches -->
                        <div class="color-swatches">
                            ${swatches.map(s => `
                                <div class="swatch" style="background: ${s.color}" 
                                     onmouseover="app.changeSwatch('${product.id}', '${s.color}', '${s.img}')"></div>
                            `).join('')}
                        </div>
                        
                        <div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>

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
