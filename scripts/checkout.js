/**
 * Checkout Logic
 * Handles Cart Loading, Address Prefill, and Order Creation.
 */

const checkout = {
    cart: [],
    currentMethod: 'pix',

    init: async () => {
        // 1. Check Auth (Must be logged in)
        // We wait a bit for authService to init
        const check = setInterval(async () => {
            if (window.authService && window.cartService) {
                clearInterval(check);

                const user = window.authService.getCurrentUser();
                if (!user) {
                    window.location.href = 'login.html';
                    return;
                }

                // 2. Load Cart
                checkout.cart = window.cartService.getCart();
                if (checkout.cart.length === 0) {
                    Swal.fire('Carrinho Vazio', 'Adicione produtos antes de finalizar.', 'warning')
                        .then(() => window.location.href = 'index.html');
                    return;
                }

                // 3. Render
                checkout.fillUserData(user);
                checkout.renderCart();
            }
        }, 200);
    },

    fillUserData: (user) => {
        document.getElementById('chk-name').value = user.name || '';
        document.getElementById('chk-email').value = user.email || '';
        document.getElementById('chk-doc').value = user.cpf || ''; // Assuming 'cpf' field exists

        // If address exists in user object (Profile)
        const addr = user.address || {};
        if (addr.cep) document.getElementById('chk-cep').value = addr.cep;
        if (addr.street) document.getElementById('chk-street').value = addr.street;
        if (addr.number) document.getElementById('chk-number').value = addr.number;
        if (addr.neighborhood) document.getElementById('chk-neighborhood').value = addr.neighborhood;
        if (addr.city) document.getElementById('chk-city').value = addr.city;
    },

    renderCart: () => {
        const container = document.getElementById('order-items');
        const subtotalEl = document.getElementById('summary-subtotal');
        const totalEl = document.getElementById('summary-total');

        container.innerHTML = checkout.cart.map(item => `
            <div class="cart-item">
                <img src="${item.image || 'assets/placeholder.png'}" alt="${item.name}">
                <div class="cart-item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-meta">Qtd: ${item.qty} | ${item.customization}</span>
                </div>
                <div class="item-price">R$ ${(item.price * item.qty).toFixed(2)}</div>
            </div>
        `).join('');

        const total = window.cartService.getTotal();
        subtotalEl.innerText = `R$ ${total.toFixed(2)}`;
        totalEl.innerText = `R$ ${total.toFixed(2)}`;
    },

    setMethod: (method) => {
        checkout.currentMethod = method;

        // UI Tabs
        document.querySelectorAll('.payment-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.payment-content').forEach(c => c.classList.remove('active'));

        // Activate Content
        const content = document.getElementById(`pay-${method}`);
        if (content) content.classList.add('active');

        // Activate Tab
        const map = { 'pix': 0, 'card': 1, 'boleto': 2 };
        const tabs = document.querySelectorAll('.payment-tab');
        if (tabs[map[method]]) tabs[map[method]].classList.add('active');

        // Logic for Card Brick
        if (method === 'card') {
            checkout.initCardBrick();
        }
    },

    initCardBrick: async () => {
        // Check if config exists
        if (typeof MP_PUBLIC_KEY === 'undefined' || !MP_PUBLIC_KEY) {
            const alert = document.getElementById('mp-key-missing-alert');
            if (alert) alert.style.display = 'block';
            return;
        }

        // Avoid re-rendering
        if (window.cardBrickController) return;

        try {
            const mp = new MercadoPago(MP_PUBLIC_KEY);
            const bricksBuilder = mp.bricks();
            const total = window.cartService.getTotal();

            const settings = {
                initialization: {
                    amount: total, // Total amount
                    preferenceId: "<PREFERENCE_ID>", // Required for some flows, but for generic payment brick we can sometimes omit or need backend.
                    // For Payment Brick strict mode, we need preference or just amount depending on config.
                    // We will use the 'payment' brick which creates the form.
                },
                customization: {
                    paymentMethods: {
                        creditCard: "all",
                        debitCard: "all",
                        ticket: "all",
                        bankTransfer: "all",
                        maxInstallments: 12
                    },
                    visual: {
                        style: {
                            theme: 'default', // 'default' | 'dark' | 'bootstrap' | 'flat'
                        }
                    },
                },
                callbacks: {
                    onReady: () => {
                        // Brick rendered
                        const alert = document.getElementById('mp-key-missing-alert');
                        if (alert) alert.style.display = 'none';
                    },
                    onSubmit: ({ selectedPaymentMethod, formData }) => {
                        // CRITICAL: This is where we get the secure data
                        return new Promise((resolve, reject) => {
                            // Here we would send formData to Backend
                            console.log("Secure Data Received:", formData);

                            // Mock Success for User Feedback
                            checkout.currentMethod = 'card';
                            checkout.finishOrder(formData); // Pass data to save logic
                            resolve();
                        });
                    },
                    onError: (error) => {
                        console.error(error);
                    },
                },
            };

            window.cardBrickController = await bricksBuilder.create("payment", "cardPaymentBrick_container", settings);

        } catch (e) {
            console.error("Brick Error:", e);
        }
    },

    finishOrder: async (paymentData = null) => {
        const user = window.authService.getCurrentUser();
        if (!user) return;

        // 1. Validate Address
        const street = document.getElementById('chk-street').value;
        if (!street) {
            Swal.fire('Endereço', 'Por favor, preencha o endereço de entrega.', 'warning');
            return;
        }

        // 2. Prepare Order Payload
        const total = window.cartService.getTotal();
        const address = {
            street: street,
            number: document.getElementById('chk-number').value,
            neighborhood: document.getElementById('chk-neighborhood').value,
            city: document.getElementById('chk-city').value,
            cep: document.getElementById('chk-cep').value
        };

        const newOrder = {
            customer_name: user.name, // or user_id if relational
            // user_id: user.id, // Better for RLS
            items: checkout.cart,
            total: total,
            status: 'pending',
            type: 'sale',
            payment_method: checkout.currentMethod,
            address: address,
            date: new Date().toISOString()
        };

        // 3. Save to Supabase
        // We use 'orders' table.
        try {
            Swal.fire('Processando...', 'Gerando seu pedido.', 'info');
            Swal.showLoading();

            const { data, error } = await window.supabase
                .from('orders') // Ensure this table exists and is writable
                .insert(newOrder)
                .select();

            if (error) throw error;

            // 4. Success
            window.cartService.clearCart();

            let successMsg = 'Seu pedido foi recebido!';
            if (checkout.currentMethod === 'pix') successMsg = 'Use a chave Pix exibida para pagar.';
            if (checkout.currentMethod === 'card') successMsg = 'Redirecionando para pagamento... (Simulação)';

            await Swal.fire({
                icon: 'success',
                title: 'Pedido Realizado! 🎉',
                text: successMsg,
                confirmButtonText: 'Ver Meus Pedidos'
            });

            // Redirect to Profile or Orders page
            window.location.href = 'profile.html'; // Assuming profile has orders list

        } catch (err) {
            console.error("Order Error:", err);
            Swal.fire('Erro', 'Não foi possível salvar o pedido. Tente novamente.', 'error');
        }
    }
};

checkout.init();
