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
                    
                    <div class="product-image" id="img-${product.id}" style="background-image: url('${product.image || 'https://via.placeholder.com/300'}');"></div>
                    
                    <div class="product-info">
                        <span class="product-cat">${product.category}</span>
                        <h3 class="product-title">${product.name}</h3>
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
