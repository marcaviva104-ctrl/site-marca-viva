/**
 * Checkout Logic
 * Handles Cart Loading, Address Prefill, and Order Creation.
 */

const checkout = {
    cart: [],
    currentMethod: 'pix',



    init: async () => {
        console.log("Checkout: Iniciando...");

        // Helper para atualizar status na tela
        const updateStatus = (msg) => {
            const el = document.querySelector('#order-items div');
            if (el) el.innerHTML = `<i class="ph-bold ph-spinner ph-spin"></i> ${msg}`;
            console.log(`Checkout Status: ${msg}`);
        };

        const startRendering = async () => {
            try {
                updateStatus("Autenticando usuário...");
                const user = window.authService.getCurrentUser();

                if (!user) {
                    updateStatus("Usuário não logado. Aguardando...");
                    console.log("Checkout: Usuário não detectado no startRendering");
                    return;
                }

                updateStatus(`Bem-vindo, ${user.name.split(' ')[0]}. Buscando itens...`);
                console.log("Checkout: Usuário encontrado:", user);

                // Carrega carrinho
                checkout.cart = window.cartService.getCart();

                // Verifica carrinho vazio
                if (!checkout.cart || checkout.cart.length === 0) {
                    updateStatus("Verificando carrinho novamente...");
                    setTimeout(() => {
                        checkout.cart = window.cartService.getCart();
                        if (checkout.cart.length === 0) {
                            console.warn("Checkout: Carrinho vazio.");
                            updateStatus("Carrinho vazio.");
                            checkout.renderCart();
                            Swal.fire('Carrinho Vazio', 'Adicione produtos antes de finalizar.', 'warning')
                                .then(() => window.location.href = 'index.html');
                        } else {
                            checkout.safeFillUserData(user);
                            checkout.renderCart();
                            checkout.setupCEPListener();
                            checkout.initCardBrick();
                        }
                    }, 1000);
                    return;
                }

                updateStatus("Renderizando itens...");
                checkout.safeFillUserData(user);
                checkout.renderCart();
                checkout.setupCEPListener();
                checkout.initCardBrick();

            } catch (err) {
                console.error("Checkout: Critical Error in startRendering", err);
                const el = document.getElementById('order-items');
                if (el) el.innerHTML = `<div style="color:red; text-align:center; padding: 20px;">
                    <i class="ph-bold ph-warning-circle" style="font-size: 2rem;"></i><br>
                    <strong>Erro ao carregar:</strong><br>${err.message}
                </div>`;
                document.querySelector('.summary-totals').style.display = 'none';
            }
        };

        // 1. Tries to get user from Auth Service or Direct LocalStorage (Failsafe)
        const getDirectUser = () => {
            if (window.authService && window.authService.getCurrentUser()) {
                return window.authService.getCurrentUser();
            }
            // Fallback: Read cache directly to avoid race condition
            try {
                const cached = localStorage.getItem('mv_user_cache');
                if (cached) return JSON.parse(cached);
            } catch (e) { console.error("Cache Error", e); }
            return null;
        };

        const tryStart = () => {
            try {
                const user = getDirectUser();
                if (user) {
                    startRendering(user); // Pass user directly
                    return true;
                }
                return false;
            } catch (e) {
                console.error("Checkout: Error inside tryStart", e);
                return false;
            }
        };

        // Attempt 1: Immediate
        updateStatus("Iniciando verificação...");
        if (tryStart()) return;

        // Attempt 2: Listener
        document.addEventListener('auth:stateChanged', () => {
            updateStatus("Evento de Auth recebido...");
            tryStart();
        });

        // Attempt 3: Polling with Timeout Feedback
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (tryStart()) {
                clearInterval(check);
            } else {
                if (attempts % 5 === 0) updateStatus(`Aguardando login... (${attempts}/50)`);

                if (attempts > 50) { // 10 seconds
                    clearInterval(check);
                    console.warn("Checkout: Timeout login.");
                    updateStatus("Tempo esgotado. Verifique seu login.");

                    // Timeout Action
                    if (!localStorage.getItem('mv_user_cache')) {
                        Swal.fire({
                            title: 'Login Necessário',
                            text: 'Não detectamos seu login. Tente recarregar ou entre novamente.',
                            icon: 'warning',
                            confirmButtonText: 'Ir para Login',
                            showCancelButton: true,
                            cancelButtonText: 'Recarregar'
                        }).then((res) => {
                            if (res.isConfirmed) window.location.href = 'login.html';
                            else window.location.reload();
                        });
                    } else {
                        // Force start if cache exists but somehow failed before
                        console.log("Checkout: Forcing start from cache after timeout");
                        tryStart();
                    }
                }
            }
        }, 200);
    },

    // Safe fill user data
    safeFillUserData: (user) => {
        try {
            // Fallback if not passed
            if (!user && window.authService) user = window.authService.getCurrentUser();
            if (!user) return; // Can't fill without user

            const safeVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            }

            safeVal('chk-name', user.name);
            safeVal('chk-email', user.email);
            safeVal('chk-doc', user.cpf);

            const addr = user.address || {};
            safeVal('chk-cep', addr.cep);
            safeVal('chk-street', addr.street);
            safeVal('chk-number', addr.number);
            safeVal('chk-neighborhood', addr.neighborhood);
            safeVal('chk-city', addr.city);

        } catch (err) {
            console.error("Checkout: Error filling user data", err);
        }
    },

    renderCart: () => {
        try {
            console.log("Checkout: Renderizando carrinho...", checkout.cart);
            const container = document.getElementById('order-items');
            const subtotalEl = document.getElementById('summary-subtotal');
            const totalEl = document.getElementById('summary-total');

            if (!container || !subtotalEl || !totalEl) {
                console.error("Checkout: Elementos DOM não encontrados.");
                return;
            }

            if (!checkout.cart || checkout.cart.length === 0) {
                container.innerHTML = '<div style="text-align:center; padding:20px;">Seu carrinho está vazio.</div>';
                subtotalEl.innerText = 'R$ 0,00';
                totalEl.innerText = 'R$ 0,00';
                return;
            }

            container.innerHTML = checkout.cart.map(item => {
                const price = Number(item.price) || 0;
                const qty = Number(item.qty) || 1;
                const totalItem = price * qty;

                return `
                <div class="cart-item">
                    <img src="${item.image || 'assets/placeholder.png'}" alt="${item.name || 'Produto'}" onerror="this.src='assets/placeholder.png'">
                    <div class="cart-item-info">
                        <span class="item-name">${item.name || 'Produto sem nome'}</span>
                        <span class="item-meta">Qtd: ${qty} | ${item.customization || ''}</span>
                    </div>
                    <div class="item-price">R$ ${totalItem.toFixed(2)}</div>
                </div>
            `;
            }).join('');

            const total = window.cartService.getTotal();
            console.log("Checkout: Total calculado:", total);

            subtotalEl.innerText = `R$ ${total.toFixed(2)}`;
            totalEl.innerText = `R$ ${total.toFixed(2)}`;

            // Força atualização visual se houver frete já selecionado (raro no load inicial, mas possível)
            if (checkout.selectedShipping) {
                checkout.updateTotalWithShipping(checkout.selectedShipping.price);
            }

        } catch (err) {
            console.error("Checkout: Erro crítico ao renderizar carrinho:", err);
            const container = document.getElementById('order-items');
            if (container) container.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar itens. Tente recarregar a página.</div>';
        }
    },

    // 🆕 Setup CEP listener for address autofill and shipping calculation
    setupCEPListener: () => {
        const cepInput = document.getElementById('chk-cep');
        if (!cepInput) return;

        cepInput.addEventListener('blur', async () => {
            const cep = cepInput.value;

            // Validate CEP format
            if (!window.shippingService.isValidCEP(cep)) {
                return; // Invalid format, don't proceed
            }

            try {
                // 1. Search address by CEP
                const result = await window.shippingService.searchCEP(cep);

                if (result.success) {
                    // Autofill address fields
                    const addr = result.address;
                    document.getElementById('chk-street').value = addr.street || '';
                    document.getElementById('chk-neighborhood').value = addr.neighborhood || '';
                    document.getElementById('chk-city').value = addr.city || '';

                    // Show success feedback
                    console.log('✅ Endereço encontrado:', addr.city);
                }

                // 2. Calculate shipping (always try, even if address not found)
                checkout.calculateShipping(cep);

            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        });
    },

    // 🆕 Calculate shipping options
    calculateShipping: async (cep) => {
        const shippingSection = document.getElementById('shipping-section');
        const loadingEl = document.getElementById('shipping-loading');
        const optionsEl = document.getElementById('shipping-options');

        if (!shippingSection || !loadingEl || !optionsEl) {
            console.warn('Shipping elements not found in HTML');
            return;
        }

        try {
            // Show loading state
            shippingSection.style.display = 'block';
            loadingEl.style.display = 'flex';
            optionsEl.style.display = 'none';
            optionsEl.innerHTML = '';

            // Call shipping service
            const result = await window.shippingService.calculateShippingReal(cep, checkout.cart);

            if (result.success && result.options.length > 0) {
                // ✨ ADICIONAR TEMPO DE PRODUÇÃO ao prazo de entrega
                const optionsWithProduction = window.shippingService.addProductionTimeToShipping(
                    checkout.cart,
                    result.options
                );
                checkout.displayShippingOptions(optionsWithProduction);
            } else {
                optionsEl.innerHTML = '<p style="color:#ef4444;padding:16px;">Não foi possível calcular o frete. Tente novamente.</p>';
                optionsEl.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro ao calcular frete:', error);
            optionsEl.innerHTML = '<p style="color:#ef4444;padding:16px;">Erro ao calcular frete. Tente novamente.</p>';
            optionsEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
        }
    },

    // 🆕 Display shipping options
    selectedShipping: null,
    displayShippingOptions: (options) => {
        const optionsEl = document.getElementById('shipping-options');
        if (!optionsEl) return;

        // Verificar se é pedido especial (acima de 300 unidades)
        if (options.length > 0 && options[0].needsContact) {
            optionsEl.innerHTML = `
                <div style="padding: 20px; background: #fff3cd; border-radius: 12px; border: 1px solid #ffc107;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                        <i class="ph-bold ph-warning" style="font-size: 2rem; color: #ff9800;"></i>
                        <div>
                            <h4 style="margin: 0; color: #333;">Pedido Especial</h4>
                            <p style="margin: 4px 0 0 0; color: #666; font-size: 0.9rem;">
                                ${options[0].productionMessage}
                            </p>
                        </div>
                    </div>
                    <a href="https://wa.me/553187398136" target="_blank" 
                       style="display: inline-flex; align-items: center; gap: 8px; background: #25d366; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        <i class="ph-bold ph-whatsapp-logo"></i>
                        Falar no WhatsApp
                    </a>
                </div>
            `;
            optionsEl.style.display = 'block';
            return;
        }

        // Opções normais de frete
        optionsEl.innerHTML = options.map((opt, index) => `
            <label class="shipping-option" data-index="${index}">
                <input type="radio" name="shipping" value="${opt.id}" 
                       data-price="${opt.price}" 
                       data-deadline="${opt.totalDeadline || opt.deadline}"
                       data-name="${opt.name}"
                       ${index === 0 ? 'checked' : ''}>
                <div class="shipping-info">
                    <div class="shipping-name">
                        <i class="ph-bold ph-truck"></i>
                        <strong>${opt.name}</strong>
                    </div>
                    <div class="shipping-details">
                        <span class="shipping-price">R$ ${opt.price.toFixed(2)}</span>
                        ${opt.productionMessage ? `
                            <span class="shipping-deadline" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                                <span style="font-size: 0.8rem; color: #f97316;">
                                    <i class="ph-duotone ph-clock"></i> ${opt.productionMessage}
                                </span>
                                <span style="font-size: 0.85rem;">
                                    + ${opt.shippingDays} dias (frete) = <strong>${opt.totalDeadline} dias úteis total</strong>
                                </span>
                            </span>
                        ` : `
                            <span class="shipping-deadline">${opt.deadline} dias úteis</span>
                        `}
                    </div>
                </div>
            </label>
        `).join('');

        optionsEl.style.display = 'block';

        // Auto-select first option
        if (options.length > 0) {
            checkout.selectShippingOption(options[0]);
        }

        // Add click listeners
        optionsEl.querySelectorAll('.shipping-option').forEach(label => {
            label.addEventListener('click', () => {
                const radio = label.querySelector('input[type="radio"]');
                radio.checked = true;

                const selectedOption = {
                    id: radio.value,
                    name: radio.dataset.name,
                    price: parseFloat(radio.dataset.price),
                    deadline: parseInt(radio.dataset.deadline)
                };

                checkout.selectShippingOption(selectedOption);
            });
        });
    },

    // 🆕 Select shipping option and update total
    selectShippingOption: (option) => {
        checkout.selectedShipping = option;
        checkout.updateTotalWithShipping(option.price);

        // Update visual selection
        document.querySelectorAll('.shipping-option').forEach(label => {
            label.classList.remove('selected');
        });
        const selectedLabel = document.querySelector(`input[value="${option.id}"]`)?.closest('.shipping-option');
        if (selectedLabel) {
            selectedLabel.classList.add('selected');
        }

        console.log('📦 Frete selecionado:', option.name, 'R$', option.price);
    },

    // 🆕 Update total with shipping
    updateTotalWithShipping: (shippingPrice) => {
        const subtotal = window.cartService.getTotal();
        const total = subtotal + shippingPrice;

        // Update summary
        const shippingEl = document.getElementById('summary-shipping');
        const totalEl = document.getElementById('summary-total');

        if (shippingEl) {
            shippingEl.innerText = `R$ ${shippingPrice.toFixed(2)}`;
        }
        if (totalEl) {
            totalEl.innerText = `R$ ${total.toFixed(2)}`;
        }
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

            window.cardBrickController = await bricksBuilder.create("payment", "paymentBrick_container", settings);

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
            user_id: user.id,
            items: checkout.cart,
            subtotal: total, // Assuming no tax/discount logic complexity yet
            total: total + (checkout.selectedShipping ? checkout.selectedShipping.price : 0),

            // Address must match 'shipping_address' (JSONB)
            shipping_address: address,

            // Shipping details
            shipping_method: checkout.selectedShipping ? checkout.selectedShipping.name : 'Standard',
            shipping_cost: checkout.selectedShipping ? checkout.selectedShipping.price : 0,
            shipping_deadline: checkout.selectedShipping ? (checkout.selectedShipping.totalDeadline || checkout.selectedShipping.deadline) : 0,

            status: 'pending',
            payment_method: checkout.currentMethod,
            payment_status: 'pending',

            // Optional metadata in notes if needed, or remove if strictly following schema
            customer_notes: `Cliente: ${user.name}`
        };

        try {
            // 3. Stock Validation & Order Saving
            // Stock Check
            for (const item of checkout.cart) {
                const { data: product, error: prodError } = await window.supabase
                    .from('products')
                    .select('stock, name')
                    .eq('id', item.productId || item.id) // Use productId (from cart) or id as fallback
                    .single();


                if (prodError || !product) throw new Error(`Produto não encontrado: ${item.name}`);
                if (product.stock < item.qty) {
                    throw new Error(`Estoque insuficiente para: ${item.name} (Disponível: ${product.stock})`);
                }
            }

            // Create Order
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
            if (err.message.includes('Estoque')) {
                Swal.fire('Erro de Estoque', err.message, 'error');
            } else {
                Swal.fire('Erro', 'Não foi possível salvar o pedido. Tente novamente.', 'error');
            }
        }
    }
};

window.checkout = checkout;
checkout.init();
