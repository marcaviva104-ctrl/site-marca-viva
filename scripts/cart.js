/**
 * Marca Viva - Shopping Cart Logic
 */

const CART_CONFIG = {
    WHATSAPP_NUMBER: '5511999999999' // TODO: Update with real number
};

class CartService {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('mv_cart')) || [];
        this.init();
    }

    init() {
        // Create Sidebar HTML if not exists
        if (!document.getElementById('cart-sidebar')) {
            const sidebar = document.createElement('div');
            sidebar.id = 'cart-sidebar';
            sidebar.className = 'cart-sidebar';
            sidebar.innerHTML = `
                <div class="cart-header">
                    <h3>Seu Carrinho</h3>
                    <button class="cart-close" onclick="cartService.toggle()"><i class="ph-bold ph-x"></i></button>
                </div>
                <div class="cart-items" id="cart-items-container">
                    <!-- Items go here -->
                </div>
                <div class="cart-footer">
                    <div class="cart-total">
                        <span>Total:</span>
                        <span id="cart-total-price">R$ 0,00</span>
                    </div>
                    <button class="btn btn-primary btn-full" onclick="cartService.checkout()">Finalizar Compra</button>
                </div>
            `;
            document.body.appendChild(sidebar);

            // Overlay
            const overlay = document.createElement('div');
            overlay.id = 'cart-overlay';
            overlay.className = 'cart-overlay';
            overlay.onclick = () => this.toggle();
            document.body.appendChild(overlay);
        }
        this.render();
        this.updateCount();
    }

    toggle() {
        document.getElementById('cart-sidebar').classList.toggle('open');
        document.getElementById('cart-overlay').classList.toggle('open');
    }

    add(product, quantity = 1) {
        const existing = this.cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.cart.push({ ...product, quantity });
        }
        this.save();
        this.render();
        this.toggle(); // Open cart when adding
    }

    remove(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.save();
        this.render();
    }

    updateQuantity(productId, delta) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) this.remove(productId);
            else this.save();
        }
        this.render();
    }

    save() {
        localStorage.setItem('mv_cart', JSON.stringify(this.cart));
        this.updateCount();
    }

    updateCount() {
        const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const badges = document.querySelectorAll('.cart-count-badge');
        badges.forEach(b => {
            b.innerText = count;
            b.style.display = count > 0 ? 'flex' : 'none';
        });
    }

    render() {
        const container = document.getElementById('cart-items-container');
        const totalEl = document.getElementById('cart-total-price');

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 40px 0;">
                    <i class="ph-duotone ph-shopping-cart" style="font-size: 3rem; margin-bottom: 10px;"></i>
                    <p>Seu carrinho está vazio</p>
                    <button class="btn btn-ghost" onclick="cartService.toggle()">Continuar comprando</button>
                </div>
            `;
            totalEl.innerText = 'R$ 0,00';
            return;
        }

        let total = 0;
        container.innerHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            return `
                <div class="cart-item">
                    <div class="cart-item-img" style="background-image: url('${item.image}')"></div>
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <div class="cart-item-price">R$ ${item.price.toFixed(2)}</div>
                        <div class="cart-item-controls">
                            <button onclick="cartService.updateQuantity('${item.id}', -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="cartService.updateQuantity('${item.id}', 1)">+</button>
                            <button onclick="cartService.remove('${item.id}')" style="margin-left: auto; color: #ef4444; border:none; background:none;"><i class="ph-bold ph-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        totalEl.innerText = `R$ ${total.toFixed(2)}`;
    }

    checkout() {
        // Check login
        if (typeof authService !== 'undefined' && authService.isAuthenticated && !authService.isAuthenticated()) {
            alert('Por favor, faça login para finalizar a compra.');
            window.location.href = 'login.html';
            return;
        }

        // Simple WhatsApp Checkout
        let message = `*Novo Pedido - Marca Viva* \n\n`;
        this.cart.forEach(item => {
            message += `${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        });
        message += `\n*Total: R$ ${this.cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}*`;

        // Create Order in System
        if (typeof dataManager !== 'undefined') {
            const user = typeof authService !== 'undefined' && authService.getCurrentUser ? authService.getCurrentUser() : null;
            const customerObj = user ? { name: user.name, email: user.email } : { name: 'Cliente', email: 'guest' };

            const total = this.cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            // Calling async method but not awaiting it to prevent blocking UI (fire and forget for now, or could show spinner)
            dataManager.createOrder(customerObj, this.cart, total).then(order => {
                console.log("Order created:", order);
            });
        }

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${CART_CONFIG.WHATSAPP_NUMBER}?text=${encoded}`, '_blank');

        // Clear cart
        this.cart = [];
        this.save();
        this.render();
        this.toggle();
    }
}

const cartService = new CartService();
