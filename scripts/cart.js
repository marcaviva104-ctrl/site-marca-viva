/**
 * Marca Viva - Shopping Cart Logic
 * Handles adding/removing items and persistence to LocalStorage.
 */

const cartService = {
    KEY: 'mv_cart',

    getCart: () => {
        try {
            return JSON.parse(localStorage.getItem(cartService.KEY)) || [];
        } catch (e) {
            return [];
        }
    },

    // Toggle Sidebar
    toggle: () => {
        const sidebar = document.getElementById('cart-sidebar');
        const overlay = document.getElementById('cart-overlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');

            // Render when opening
            if (sidebar.classList.contains('open')) {
                cartService.renderSidebar();
            }
        }
    },

    addToCart: (product, qty, customization = 'Sem gravação') => {
        const cart = cartService.getCart();

        // 1. Safe Price Parsing (Fix NaN)
        let safePrice = 0;
        if (typeof product.price === 'number') {
            safePrice = product.price;
        } else if (typeof product.price === 'string') {
            // Remove "R$", dots (thousands), and spaces. Replace comma with dot.
            // Example: "R$ 1.250,00" -> "1250.00"
            const cleanStr = product.price.replace(/[R$\s.]/g, '').replace(',', '.');
            safePrice = parseFloat(cleanStr) || 0;
        }

        // 2. Default Customization (Fix undefined)
        const safeCustomization = (customization && customization !== 'undefined') ? customization : 'Sem gravação';
        const safeQty = Number(qty) || 1;

        // Check if item exists
        const lineId = `${product.id}-${safeCustomization}`;
        const existingItem = cart.find(i => i.lineId === lineId);

        // Remove old buggy items if any
        const buggyIndex = cart.findIndex(i => isNaN(i.price));
        if (buggyIndex > -1) cart.splice(buggyIndex, 1);

        if (existingItem) {
            existingItem.qty += safeQty;
        } else {
            const item = {
                lineId: lineId,
                productId: product.id,
                name: product.name,
                image: product.image,
                price: safePrice,
                qty: safeQty,
                customization: safeCustomization,
                addedAt: new Date().toISOString()
            };
            cart.push(item);
        }

        cartService.saveCart(cart);
        cartService.toggle(); // Open sidebar
        return cart;
    },

    removeFromCart: (lineId) => {
        let cart = cartService.getCart();
        cart = cart.filter(item => item.lineId !== lineId);
        cartService.saveCart(cart);
        cartService.renderSidebar(); // Re-render
        return cart;
    },

    updateQty: (lineId, change) => {
        let cart = cartService.getCart();
        const item = cart.find(i => i.lineId === lineId);
        if (item) {
            item.qty += change;
            if (item.qty < 1) item.qty = 1;
            cartService.saveCart(cart);
            cartService.renderSidebar();
        }
        return cart;
    },

    clearCart: () => {
        localStorage.removeItem(cartService.KEY);
        cartService.notifyChange();
        cartService.renderSidebar();
    },

    saveCart: (cart) => {
        localStorage.setItem(cartService.KEY, JSON.stringify(cart));
        cartService.notifyChange();
    },

    getTotal: () => {
        const cart = cartService.getCart();
        return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    },

    getCount: () => {
        const cart = cartService.getCart();
        return cart.reduce((acc, item) => acc + item.qty, 0);
    },

    notifyChange: () => {
        const event = new CustomEvent('cart:updated', {
            detail: {
                cart: cartService.getCart(),
                count: cartService.getCount(),
                total: cartService.getTotal()
            }
        });
        document.dispatchEvent(event);

        // Update Drawer Total if Open
        const totalEl = document.getElementById('cart-drawer-total');
        if (totalEl) {
            totalEl.innerText = `R$ ${cartService.getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
    },

    // Render the Sidebar HTML
    renderSidebar: () => {
        const container = document.getElementById('cart-items-container');
        if (!container) return;

        const cart = cartService.getCart();

        if (cart.length === 0) {
            container.innerHTML = `
                <div class="cart-empty-state">
                    <i class="ph-bold ph-shopping-cart"></i>
                    <p>Seu carrinho está vazio</p>
                    <button onclick="cartService.toggle()" class="btn-checkout-ml" style="background:#00a650">Ver Ofertas</button>
                </div>`;
            return;
        }

        container.innerHTML = cart.map(item => {
            const displayPrice = isNaN(item.price) ? 0 : item.price;
            const displayTotal = displayPrice * (item.qty || 1);
            return `
            <div class="cart-item">
                <div class="cart-item-img" style="background-image: url('${item.image || 'assets/placeholder.jpg'}')"></div>
                <div class="cart-item-info">
                    <div>
                        <div class="cart-item-title">${item.name || 'Produto sem nome'}</div>
                        <div class="cart-item-meta">${(item.customization && item.customization !== 'undefined') ? item.customization : ''}</div>
                    </div>
                    
                    <div class="cart-price-row">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="cartService.updateQty('${item.lineId}', -1)">−</button>
                            <span class="qty-val">${item.qty || 1}</span>
                            <button class="qty-btn" onclick="cartService.updateQty('${item.lineId}', 1)">+</button>
                        </div>
                        <div class="cart-item-price">
                            R$ ${displayTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
                <button class="btn-remove-item" onclick="cartService.removeFromCart('${item.lineId}')" title="Remover">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>
        `}).join('');

        // Update Total
        const totalEl = document.getElementById('cart-drawer-total');
        if (totalEl) {
            totalEl.innerText = `R$ ${cartService.getTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
    },

    checkout: () => {
        // Enforce validations or just go
        if (cartService.getCount() === 0) {
            Swal.fire('Carrinho Vazio', 'Adicione produtos antes de finalizar.', 'warning');
            return;
        }
        window.location.href = 'checkout.html';
    }
};

// Global Expose
window.cartService = cartService;

// Initialize Badge on Load
document.addEventListener('DOMContentLoaded', () => {
    cartService.notifyChange();
});
