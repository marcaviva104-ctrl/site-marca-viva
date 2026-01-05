/**
 * Marca Viva - High Performance App Logic
 */

const app = {
    currentProduct: null,

    init() {
        this.renderProducts(productService.getAll());
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
        document.getElementById('modal-min').innerText = `${product.min} unidades`;

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

    renderProducts(list) {
        const container = document.getElementById('products-grid');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #94a3b8;">Nenhum produto encontrado.</div>`;
            return;
        }

        container.innerHTML = list.map(product => {
            const isPromo = Math.random() > 0.7;
            const isBest = !isPromo && Math.random() > 0.7;
            const badge = isPromo ? `<span class="badge-discount">-15% OFF</span>` :
                isBest ? `<span class="badge-best">Mais Vendido</span>` : '';

            const lowStock = Math.random() > 0.8;
            const scarcityMsg = lowStock ? `<div class="scarcity-text"><i class="ph-fill ph-fire"></i> Restam poucas unidades</div>` : '';

            // Using app.openModal instead of cartService.add
            // Need to pass product object safely. 
            // Storing in a window map or finding by ID is cleaner, but inline object works for small apps.
            // Let's use ID lookup to be safe against quoting issues.
            return `
                <div class="product-card">
                    <div class="product-img" style="background-image: url('${product.image}')">
                        ${badge}
                    </div>
                    <div class="product-content">
                        <span class="category-label">${product.category}</span>
                        <h3 style="font-size: 1.1rem; margin-bottom: 4px; color: #1e293b;">${product.name}</h3>
                        
                        <!-- Value Tags -->
                        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;">
                            ${product.tags ? product.tags.map(t => `<span style="font-size: 0.7rem; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600;">${t}</span>`).join('') : ''}
                        </div>

                        ${scarcityMsg}
                        <p style="font-size: 0.85rem; color: #64748b; line-height: 1.4; margin-top: 8px;">${product.description}</p>
                        
                        <div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
                        
                        <div style="display: flex; gap: 10px; margin-top: 15px;">
                            <button onclick="app.findAndOpen('${product.id}')" class="btn btn-primary" style="flex: 1; font-size: 0.85rem;">
                                Fazer Pedido
                            </button>
                            <button class="btn btn-outline" style="color: #64748b; border-color: #e2e8f0; padding: 0 12px; font-size: 1.2rem;">
                                <i class="ph-heart"></i>
                            </button>
                        </div>
                        <div style="text-align: center; margin-top: 10px;">
                            <span style="font-size: 0.75rem; color: #94a3b8;">Mínimo: ${product.min} unidades</span>
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
