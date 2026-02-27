/**
 * Checkout Logic
 * Handles Cart Loading, Address Prefill, and Order Creation.
 */

const checkout = {
    cart: [],
    currentMethod: 'pix',



    init: async () => {
        console.log("Checkout: Starting Deterministic Init...");

        // 1. Helper to update UI status
        const updateStatus = (msg, isError = false) => {
            const el = document.querySelector('#order-items div');
            if (el) {
                el.innerHTML = isError
                    ? `<div style="color:#ef4444"><i class="ph-bold ph-warning-circle"></i> ${msg}</div>`
                    : `<i class="ph-bold ph-spinner ph-spin"></i> ${msg}`;
            }
            console.log(`Checkout Status: ${msg}`);
        };

        // 2. Reset Potentially Corrupt State
        // Clears any temporary checkout flags that might cause loops
        localStorage.removeItem('mv_checkout_pending');

        try {
            updateStatus("Iniciando segurança...");

            // 3. Wait for User Authentication (Promise-based)
            const waitForUser = async () => {
                // If already ready, return immediately
                if (window.authService && window.authService.user) {
                    return window.authService.user;
                }

                // Otherwise, wait for signal or timeout
                return new Promise((resolve) => {
                    updateStatus("Aguardando autenticação...");

                    const timeout = setTimeout(() => {
                        console.warn("Checkout: Auth Timeout");
                        resolve(null);
                    }, 5000); // 5s timeout matching AuthService

                    const onAuth = () => {
                        if (window.authService.user) {
                            clearTimeout(timeout);
                            document.removeEventListener('auth:stateChanged', onAuth);
                            resolve(window.authService.user);
                        }
                    };
                    document.addEventListener('auth:stateChanged', onAuth);
                });
            };

            const user = await waitForUser();

            // 4. Handle User State
            if (!user) {
                console.warn("Checkout: No user found after wait.");
                updateStatus("Login necessário.", true);

                // Check if we have a cached user as last resort fallback
                const cached = localStorage.getItem('mv_user_cache');
                if (cached) {
                    console.log("Checkout: Using cached user as fallback");
                    const cachedUser = JSON.parse(cached);
                    checkout.safeFillUserData(cachedUser);
                    checkout.proceedToCart(cachedUser);
                    return;
                }

                Swal.fire({
                    title: 'Login Necessário',
                    text: 'Você precisa estar logado para finalizar a compra.',
                    icon: 'warning',
                    confirmButtonText: 'Fazer Login',
                    allowOutsideClick: false
                }).then(() => {
                    window.location.href = 'login.html?redirect=checkout.html';
                });
                return;
            }

            // 5. Success Path
            updateStatus(`Olá, ${user.name.split(' ')[0]}! Carregando carrinho...`);
            checkout.proceedToCart(user);

        } catch (err) {
            console.error("Checkout: Init Fatal Error", err);
            updateStatus("Erro ao inicializar checkout.", true);
        }
    },

    // 🆕 Separated Flow for Cart Rendering
    proceedToCart: (user) => {
        checkout.cart = window.cartService.getCart();

        if (!checkout.cart || checkout.cart.length === 0) {
            console.warn("Checkout: Cart is empty.");
            const container = document.getElementById('order-items');
            if (container) container.innerHTML = '<div style="text-align:center; padding:30px;">Seu carrinho está vazio.</div>';

            Swal.fire('Carrinho Vazio', 'Adicione produtos antes de finalizar.', 'info')
                .then(() => window.location.href = 'index.html');
            return;
        }

        checkout.safeFillUserData(user);
        checkout.renderCart();
        checkout.setupCEPListener();
        checkout.initCardBrick();
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
                        ${item.fileName ? `<span class="item-meta" style="color:#0ea5e9; font-weight:600;"><i class="ph-bold ph-file-pdf"></i> Arquivo: ${item.fileName}</span>` : ''}
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

            // --- Lógica de Checkout Inteligente (Apostila vs B2B) ---
            // A pedido do usuário, AGORA TUDO É B2B (Orçamento -> WhatsApp -> Gestão)
            // Desativando compra direta forçada para apostilas.
            const isDirectBuy = false; // Força fluxo de orçamento para todos

            checkout.isDirectBuy = isDirectBuy;

            const b2bSec = document.getElementById('b2b-checkout-section');
            const dirSec = document.getElementById('direct-checkout-section');
            const b2bBtns = document.getElementById('b2b-buttons');
            const dirBtns = document.getElementById('direct-buttons');

            if (isDirectBuy) {
                if (b2bSec) b2bSec.style.display = 'none';
                if (dirSec) dirSec.style.display = 'block';
                if (b2bBtns) b2bBtns.style.display = 'none';
                if (dirBtns) dirBtns.style.display = 'block';
            } else {
                if (b2bSec) b2bSec.style.display = 'block';
                if (dirSec) dirSec.style.display = 'none';
                if (b2bBtns) b2bBtns.style.display = 'block';
                if (dirBtns) dirBtns.style.display = 'none';
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

        cepInput.addEventListener('input', async () => {
            let cep = cepInput.value.replace(/\D/g, '');
            if (cep.length > 8) cep = cep.substring(0, 8);

            // Mascara visual simples (00000-000)
            if (cep.length > 5) {
                cepInput.value = cep.substring(0, 5) + '-' + cep.substring(5);
            } else {
                cepInput.value = cep;
            }

            // Validate CEP format
            if (cep.length !== 8) {
                return; // Espera ter 8 dígitos para prosseguir
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
                    <a href="https://wa.me/5531987398136" target="_blank" 
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

        // 2. Prepare Data
        const total = window.cartService.getTotal();
        const shippingPrice = checkout.selectedShipping ? checkout.selectedShipping.price : 0;
        const finalTotal = total + shippingPrice;

        // Protocol Data Structure
        const protocolData = {
            client_id: user.id, // Auth User ID is critical
            client_name: user.name || null, // Nome do cliente
            client_email: user.email, // Added for Fallback Search
            total_amount: finalTotal,
            notes: `Pedido via Site. Frete: ${checkout.selectedShipping ? checkout.selectedShipping.name : 'N/A'}`,
            items: checkout.cart, // Pass cart items directly
            status: checkout.isDirectBuy ? 'awaiting_payment' : 'inquiry',
            column_id: checkout.isDirectBuy ? 3 : 1
        };

        try {
            // 3. Create Request (Orçamento)
            const KanbanService = window.KanbanService;

            if (!KanbanService) {
                console.error("KanbanService not loaded globally.");
                throw new Error("Sistema de Protocolos indisponível (Erro JS).");
            }

            // Using createRequest instead of createProtocol
            const result = await KanbanService.createRequest(protocolData);

            if (!result.success) throw result.error;

            const request = result.data;
            console.log("Request Created:", request.id);

            // 4. Update Payment immediately if needed
            if (checkout.currentMethod === 'card') {
                await window.KanbanService.updatePayment(request.id, 'paid_full', finalTotal);
            }

            // 5. Salvar Snapshot Sempre (antes do clear)
            const snapshot = {
                id: request.id,
                date: new Date().toLocaleDateString('pt-BR'),
                client: user,
                items: [...checkout.cart], // Clone array
                total: finalTotal,
                shipping: checkout.selectedShipping,
                notes: `Pedido via Site. Frete: ${checkout.selectedShipping ? checkout.selectedShipping.name : 'N/A'}`
            };
            localStorage.setItem('mv_last_order', JSON.stringify(snapshot));

            // Fluxo de Compra Direta (Apostila)
            if (checkout.isDirectBuy) {
                window.cartService.clearCart();

                if (checkout.currentMethod === 'pix') {
                    // Vai direto para pagar o PIX
                    window.location.href = `pix-payment.html?order=${request.id}&total=${finalTotal}`;
                } else if (checkout.currentMethod === 'card') {
                    // Passou o cartão (Mock), vai para histórico
                    Swal.fire({
                        icon: 'success',
                        title: 'Pagamento Aprovado!',
                        text: `Seu pedido ${request.id} foi recebido e já está em separação/produção.`,
                        confirmButtonText: 'Acompanhar Pedido'
                    }).then(() => {
                        window.location.href = `track.html?id=${request.id}`;
                    });
                }
                return; // Encerra aqui na compra direta
            }

            // Fluxo B2B (Orçamento / WhatsApp)
            window.cartService.clearCart();

            let successMsg = `Recebemos seu pedido de orçamento: <b>${request.id}</b>`;
            let successTitle = 'Pedido em Análise! 📋';

            successMsg += '<br><br>Sua solicitação foi enviada para nossa <b>Caixa de Entrada</b>. Fale conosco no WhatsApp para aprovar os detalhes e iniciar a produção.';

            // Construct WhatsApp Message (Premium B2B)
            const clientName = user.name.split(' ')[0];
            const city = document.getElementById('chk-city').value || 'Minha Cidade';
            const waNumber = "5531987398136";

            let itemsSummary = checkout.cart.map(item => {
                return `▪️ ${item.qty}x ${item.name}`;
            }).join('\n');

            const waText =
                `Olá, equipe *Marca Viva*! 🌟
Meu nome é *${clientName}*, falo de *${city}*.

Acabo de formalizar o pedido de orçamento *${request.id}* através do site.

📋 *Resumo da Solicitação:*
${itemsSummary}

💰 *Valor Previsto:* R$ ${finalTotal.toFixed(2)}

Gostaria de prosseguir com a *aprovação da arte* e verificar as condições de pagamento.
Aguardo o retorno de vocês!`;

            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

            await Swal.fire({
                icon: 'success',
                title: successTitle,
                html: successMsg,
                showDenyButton: true,
                showCancelButton: true,
                confirmButtonText: '<i class="ph-bold ph-qr-code"></i> Pagar com PIX',
                denyButtonText: '<i class="ph-bold ph-whatsapp-logo"></i> Ir para WhatsApp',
                cancelButtonText: '<i class="ph-bold ph-file-pdf"></i> Baixar Comprovante',
                confirmButtonColor: '#667eea',
                denyButtonColor: '#25d366',
                cancelButtonColor: '#64748b',
                allowOutsideClick: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    // Cliente escolheu PIX
                    window.location.href = `pix-payment.html?order=${request.id}&total=${finalTotal}`;
                } else if (result.isDenied) {
                    // Cliente escolheu WhatsApp
                    window.location.href = waUrl;
                } else if (result.isDismissed && result.dismiss === Swal.DismissReason.cancel) {
                    // Cliente quer PDF
                    window.open(`quote.html?id=${request.id}`, '_blank');
                    setTimeout(() => window.location.href = `track.html?id=${request.id}`, 1000);
                } else {
                    // Fechou modal - vai para track
                    window.location.href = `track.html?id=${request.id}`;
                }
            });

        } catch (err) {
            console.error("Order Error:", err);
            let errorDetails = err.message || (typeof err === 'object' ? JSON.stringify(err) : err);
            if (errorDetails === '{}') errorDetails = 'Erro de conexão ou permissão (RLS)';

            Swal.fire({
                title: 'Erro no Pedido',
                text: `Não foi possível enviar a solicitação. Detalhes: ${errorDetails}`,
                icon: 'error'
            });
        }
    }
};

window.checkout = checkout;
checkout.init();
