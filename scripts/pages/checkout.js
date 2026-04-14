/**
 * Checkout Logic
 * Handles Cart Loading, Address Prefill, and Order Creation.
 */

const checkout = {
    cart: [],



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

    // ð Separated Flow for Cart Rendering
    proceedToCart: (user) => {
        checkout.cart = window.cartService.getCart();

        if (!checkout.cart || checkout.cart.length === 0) {
            console.warn("Checkout: Cart is empty.");
            const container = document.getElementById('order-items');
            if (container) container.innerHTML = '<div style="text-align:center; padding:30px;">Seu carrinho está vazio.</div>';

            Swal.fire('Orçamento Vazio', 'Adicione produtos antes de finalizar.', 'info')
                .then(() => window.location.href = 'index.html');
            return;
        }

        checkout.safeFillUserData(user);
        checkout.renderCart();
        checkout.setupCEPListener();
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
                const price = (function(val) {
                    if (typeof val === 'number') return val;
                    if (!val) return 0;
                    const cleanStr = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
                    return parseFloat(cleanStr) || 0;
                })(item.price);
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


            // --- Lógica de Checkout B2B Exclusivo ---
            const b2bSec = document.getElementById('b2b-checkout-section');
            const b2bBtns = document.getElementById('b2b-buttons');

            if (b2bSec) b2bSec.style.display = 'block';
            if (b2bBtns) b2bBtns.style.display = 'block';

        } catch (err) {
            console.error("Checkout: Erro crítico ao renderizar carrinho:", err);
            const container = document.getElementById('order-items');
            if (container) container.innerHTML = '<div style="color:red; text-align:center;">Erro ao carregar itens. Tente recarregar a página.</div>';
        }
    },

    // ð Setup CEP listener for address autofill and shipping calculation
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
                    console.log('â Endereço encontrado:', addr.city);
                    console.log('✅ Endereço encontrado:', addr.city);
                }

            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        });
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
        const total = window.cartService.getTotal() || 0;
        const finalTotal = total;

        // Protocol Data Structure
        const protocolData = {
            client_id: user.id, // Auth User ID is critical
            client_name: user.name || null, // Nome do cliente
            client_email: user.email, // Added for Fallback Search
            total_amount: finalTotal,
            notes: `Pedido via Site. Frete: À Combinar (B2B).`,
            items: checkout.cart, // Pass cart items directly
            status: 'inquiry',
            column_id: 1
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

            // 📧 Trigger E-mail Automatico via Edge Function
            try {
                if (window.supabaseClient) {
                    window.supabaseClient.functions.invoke('send-order-email', {
                        body: {
                            orderId: request.id,
                            customerName: user.name || 'Cliente',
                            customerEmail: user.email,
                            items: checkout.cart,
                            total: `R$ ${finalTotal.toFixed(2)}`
                        }
                    }).then(res => console.log('Email Resend Request:', res.data))
                        .catch(e => console.error('Email Resend Error:', e));
                } else if (window.supabase) {
                    window.supabase.functions.invoke('send-order-email', {
                        body: {
                            orderId: request.id,
                            customerName: user.name || 'Cliente',
                            customerEmail: user.email,
                            items: checkout.cart,
                            total: `R$ ${finalTotal.toFixed(2)}`
                        }
                    }).then(res => console.log('Email Resend Request:', res.data))
                        .catch(e => console.error('Email Resend Error:', e));
                } else {
                    console.warn("Supabase client not found globally, email not sent.");
                }
            } catch (emailErr) {
                console.error("Error invoking edge function:", emailErr);
            }

            // Fluxo B2B (Orçamento / WhatsApp)
            window.cartService.clearCart();

            let successMsg = `Recebemos seu pedido de orçamento: <b>${request.id}</b>`;
            let successTitle = 'Pedido em Análise! 📋';

            successMsg += '<br><br>Sua solicitação foi enviada para nossa <b>Caixa de Entrada</b>. Fale conosco no WhatsApp para aprovar os detalhes e iniciar a produção.';

            // Construct WhatsApp Message (Premium B2B)
            const clientName = user.name.split(' ')[0];
            const city = document.getElementById('chk-city').value || 'Minha Cidade';
            const waNumber = (window.WhatsAppConfig && window.WhatsAppConfig.phone)
                ? window.WhatsAppConfig.phone
                : "5531987398136";

            let itemsSummary = checkout.cart.map(item => {
                return `▪️ ${item.qty}x ${item.name}`;
            }).join('\n');

            const waText =
                `Olá, equipe *Marca Viva*! 👋
Meu nome é *${clientName}* (Cidade: ${city}).

Acabei de enviar a solicitação de B2B *${request.id}* pelo site corporativo.

🛒 *Resumo do Pedido:*
${itemsSummary}

📦 *Frete Solicitado:* À Combinar

Gostaria de falar com um consultor para **enviar a minha arte para personalização** e aprovar o orçamento.
Aguardo o retorno de vocês!`;

            const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waText)}`;

            await Swal.fire({
                icon: 'success',
                title: successTitle,
                html: successMsg,
                showDenyButton: true,
                showCancelButton: false,
                confirmButtonText: '<i class="ph-bold ph-whatsapp-logo"></i> Chamar no WhatsApp',
                denyButtonText: '<i class="ph-bold ph-file-pdf"></i> Baixar Comprovante',
                confirmButtonColor: '#25d366',
                denyButtonColor: '#64748b',
                allowOutsideClick: false,
            }).then((result) => {
                if (result.isConfirmed) {
                    // Cliente escolheu WhatsApp
                    window.location.href = waUrl;
                } else if (result.isDenied) {
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
