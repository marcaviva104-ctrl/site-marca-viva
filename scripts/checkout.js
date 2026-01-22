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
                checkout.setupCEPListener(); // 🆕 Setup shipping calculation

                // 4. Auto-initialize Payment Brick
                checkout.initCardBrick();
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

        // 3. Stock Validation & Order Saving
        try {
            Swal.fire('Processando...', 'Validando estoque e gerando pedido.', 'info');
            Swal.showLoading();

            // Stock Validation ENABLED
            // Check Stock for all items first
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
        } catch (err) {
            console.error("Stock Error:", err);
            Swal.fire('Erro de Estoque', err.message, 'error');
            return; // Stop checkout if stock is invalid
        }


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

    } catch(err) {
        console.error("Order Error:", err);
        Swal.fire('Erro', 'Não foi possível salvar o pedido. Tente novamente.', 'error');
    }
}
};

checkout.init();
