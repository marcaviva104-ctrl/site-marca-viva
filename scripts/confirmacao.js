/**
 * Página de Confirmação - Script
 */

const confirmacaoApp = {
    order: null,

    async init() {
        console.log('📋 Confirmação Page Init...');

        // Aguardar serviços
        await this.waitForServices();

        // Carregar dados do pedido
        this.loadOrder();

        // Renderizar
        this.render();
    },

    async waitForServices() {
        let attempts = 0;
        while ((!window.checkoutService) && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
    },

    loadOrder() {
        if (window.checkoutService) {
            const state = window.checkoutService.getState();
            this.order = state.order;
        }

        // Se não tiver pedido, redirecionar
        if (!this.order) {
            console.warn('Nenhum pedido encontrado. Redirecionando...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    },

    render() {
        if (!this.order) return;

        // Order Number
        const orderNumberEl = document.getElementById('order-number');
        if (orderNumberEl) {
            orderNumberEl.textContent = this.order.order_number || 'N/A';
        }

        // Products
        this.renderProducts();

        // Address
        this.renderAddress();

        // Shipping
        this.renderShipping();

        // Payment
        this.renderPayment();

        // Totals
        this.renderTotals();
    },

    renderProducts() {
        const container = document.getElementById('order-products');
        if (!container || !this.order.items) return;

        container.innerHTML = this.order.items.map(item => `
            <div class="product-item">
                <img src="${item.image || 'placeholder.jpg'}" alt="${item.name}">
                <div class="product-info">
                    <strong>${item.name}</strong>
                    <span>Qtd: ${item.quantity}</span>
                </div>
                <div class="product-price">
                    R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}
                </div>
            </div>
        `).join('');
    },

    renderAddress() {
        const container = document.getElementById('order-address');
        if (!container || !this.order.shipping_address) return;

        const addr = this.order.shipping_address;
        container.innerHTML = `
            <p>
                ${addr.street}, ${addr.number}<br>
                ${addr.neighborhood}<br>
                ${addr.city} - ${addr.state}<br>
                CEP: ${addr.cep}
            </p>
        `;
    },

    renderShipping() {
        const container = document.getElementById('order-shipping');
        if (!container) return;

        container.innerHTML = `
            <p>
                <strong>${this.order.shipping_method}</strong><br>
                Prazo: ${this.order.shipping_deadline || 'N/A'} dias úteis<br>
                Valor: R$ ${(this.order.shipping_cost || 0).toFixed(2).replace('.', ',')}
            </p>
        `;
    },

    renderPayment() {
        const container = document.getElementById('order-payment');
        if (!container) return;

        const methodNames = {
            pix: 'PIX',
            credit_card: 'Cartão de Crédito',
            boleto: 'Boleto Bancário'
        };

        const methodName = methodNames[this.order.payment_method] || this.order.payment_method;
        const status = this.order.payment_status === 'pending' ? 'Aguardando Pagamento' : 'Pago';

        container.innerHTML = `
            <p>
                <strong>${methodName}</strong><br>
                Status: <span class="payment-status">${status}</span>
            </p>
        `;
    },

    renderTotals() {
        const subtotalEl = document.getElementById('total-subtotal');
        const shippingEl = document.getElementById('total-shipping');
        const totalEl = document.getElementById('total-amount');

        if (subtotalEl) {
            subtotalEl.textContent = `R$ ${(this.order.subtotal || 0).toFixed(2).replace('.', ',')}`;
        }

        if (shippingEl) {
            shippingEl.textContent = `R$ ${(this.order.shipping_cost || 0).toFixed(2).replace('.', ',')}`;
        }

        if (totalEl) {
            totalEl.textContent = `R$ ${(this.order.total || 0).toFixed(2).replace('.', ',')}`;
        }
    }
};

// Init quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    confirmacaoApp.init();
});
