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
                    if (checkout.blockIfPending(cachedUser)) return;
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

            // 5. Cadastro de empresa ainda em análise: não pode fechar pedido.
            if (checkout.blockIfPending(user)) return;

            // 6. Success Path
            updateStatus(`Olá, ${user.name.split(' ')[0]}! Carregando carrinho...`);
            checkout.proceedToCart(user);

        } catch (err) {
            console.error("Checkout: Init Fatal Error", err);
            updateStatus("Erro ao inicializar checkout.", true);
        }
    },

    /**
     * Cadastro PJ entra em análise (profiles.approved = false) e só compra
     * depois da liberação em Admin → Clientes. O carrinho fica intacto:
     * assim que o acesso é liberado, é só voltar e finalizar.
     *
     * Retorna true se o checkout foi bloqueado.
     */
    blockIfPending: (user) => {
        if (!user) return false;

        // Equipe nunca é bloqueada.
        if (user.role === 'admin' || user.role === 'employee') return false;

        // Só bloqueia quem está explicitamente pendente.
        if (user.approved !== false) return false;

        console.warn("Checkout: cadastro pendente de aprovação, bloqueando.");

        const el = document.querySelector('#order-items div');
        if (el) {
            el.innerHTML = `<div style="color:#b45309"><i class="ph-bold ph-clock"></i> Cadastro em análise.</div>`;
        }

        Swal.fire({
            icon: 'info',
            title: 'Cadastro em análise',
            html: `Estamos conferindo os dados da sua empresa. Assim que o acesso for liberado, você recebe um aviso por e-mail e poderá finalizar o pedido.<br><br>
                   <strong>Seu carrinho está guardado.</strong><br><br>
                   Precisa de urgência? Fale com a gente pelo WhatsApp.`,
            confirmButtonText: 'Entendi',
            confirmButtonColor: '#1e293b',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'index.html';
        });

        return true;
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
        checkout.loadSavedAddresses(user);

        // CEP já vem preenchido do cadastro (safeFillUserData) — o listener
        // 'input' não dispara nesse caso, então calcula o frete aqui também.
        const cepEl = document.getElementById('chk-cep');
        const prefilledCep = cepEl ? cepEl.value.replace(/\D/g, '') : '';
        if (prefilledCep.length === 8) {
            checkout.calculateAndRenderShipping(prefilledCep);
        }
    },

    // Se o cliente tiver endereços salvos (aba Minha Conta > Outros
    // Endereços), oferece um seletor em vez de só preencher o padrão.
    loadSavedAddresses: async (user) => {
        if (!window.supabase || !user) return;

        const { data: addresses, error } = await window.supabase
            .from('customer_addresses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error || !addresses || addresses.length === 0) return;

        checkout._savedAddresses = addresses;

        const wrap = document.getElementById('saved-addresses-wrap');
        const select = document.getElementById('saved-addresses-select');
        if (!wrap || !select) return;

        wrap.style.display = 'block';
        select.innerHTML = '<option value="">Preencher manualmente</option>' +
            addresses.map(a => `<option value="${a.id}">${a.label}${a.is_default ? ' (padrão)' : ''}</option>`).join('');
    },

    selectSavedAddress: (addressId) => {
        if (!addressId) return;
        const addr = (checkout._savedAddresses || []).find(a => a.id === addressId);
        if (!addr) return;

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('chk-cep', addr.zip);
        setVal('chk-street', addr.street);
        setVal('chk-number', addr.number);
        setVal('chk-neighborhood', addr.neighborhood);
        setVal('chk-city', addr.city ? `${addr.city}/${addr.state || ''}` : '');

        const cep = String(addr.zip || '').replace(/\D/g, '');
        if (cep.length === 8) checkout.calculateAndRenderShipping(cep);
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
            // Ja vem preenchido do cadastro; o cliente pode corrigir antes de enviar.
            safeVal('chk-phone', user.phone);

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

            const subtotal = window.cartService.getTotal();
            console.log("Checkout: Total calculado:", subtotal);

            // Desconto do cupom aplicado (se houver) — ver applyCoupon/removeCoupon.
            const coupon = window.CouponService ? window.CouponService.getCurrent() : null;
            const discount = coupon ? window.CouponService.calculateDiscount(coupon, subtotal) : 0;

            // Frete calculado a partir do CEP (ver calculateAndRenderShipping/selectShippingOption).
            const shipping = window.shippingService ? window.shippingService.getSelection() : null;
            const shippingCost = shipping ? shipping.price : 0;

            const total = Math.max(subtotal - discount, 0) + shippingCost;

            subtotalEl.innerText = `R$ ${subtotal.toFixed(2)}`;

            const discountRow = document.getElementById('discount-row');
            const discountEl = document.getElementById('summary-discount');
            if (discount > 0) {
                if (discountRow) discountRow.style.display = 'flex';
                if (discountEl) discountEl.innerText = `- R$ ${discount.toFixed(2)}`;
            } else if (discountRow) {
                discountRow.style.display = 'none';
            }

            const shippingSummaryEl = document.getElementById('summary-shipping');
            if (shippingSummaryEl) {
                if (shipping) {
                    shippingSummaryEl.innerText = shippingCost > 0
                        ? `${shipping.name} - R$ ${shippingCost.toFixed(2)}`
                        : `${shipping.name} - Grátis`;
                } else {
                    shippingSummaryEl.innerText = 'Informe o CEP';
                }
            }

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
                }

                // 2. Calculate real shipping (configs do admin em Frete & Entrega)
                await checkout.calculateAndRenderShipping(cep);

            } catch (error) {
                console.error('Erro ao buscar CEP:', error);
            }
        });
    },

    // Busca as opções de frete pro CEP informado (configs do admin em
    // Frete & Entrega) e renderiza no resumo, mesmo padrão do cupom
    // (estado fica em window.shippingService, consumido por renderCart).
    calculateAndRenderShipping: async (cep) => {
        const optionsWrap = document.getElementById('shipping-options');
        const optionsList = document.getElementById('shipping-options-list');
        const summaryShipping = document.getElementById('summary-shipping');

        if (!window.shippingService) return;

        window.shippingService.clearSelection();
        if (summaryShipping) summaryShipping.innerText = 'Calculando...';

        const result = await window.shippingService.calculateShipping(cep, checkout.cart);

        if (!result.success || !result.options.length) {
            if (optionsWrap) optionsWrap.style.display = 'none';
            checkout.renderCart();
            return;
        }

        // Só uma opção (caso comum): seleciona direto, sem exigir clique.
        if (result.options.length === 1) {
            window.shippingService.setSelection(result.options[0]);
            if (optionsWrap) optionsWrap.style.display = 'none';
            checkout.renderCart();
            return;
        }

        // Múltiplas opções: exibe rádio pro cliente escolher.
        if (optionsWrap) optionsWrap.style.display = 'block';
        if (optionsList) {
            optionsList.innerHTML = result.options.map((opt, idx) => `
                <label style="display:flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer;">
                    <input type="radio" name="shipping-option" value="${opt.id}" ${idx === 0 ? 'checked' : ''}
                        onchange='checkout.selectShippingOption(${JSON.stringify(opt).replace(/'/g, "&#39;")})'>
                    <span>${opt.name} - ${opt.price > 0 ? `R$ ${opt.price.toFixed(2)}` : 'Grátis'}</span>
                </label>
            `).join('');
        }

        window.shippingService.setSelection(result.options[0]);
        checkout.renderCart();
    },

    selectShippingOption: (option) => {
        window.shippingService.setSelection(option);
        checkout.renderCart();
    },

    // --- Cupom de desconto ---
    // Usa CouponService (carregado em checkout.html), que fala com as funções
    // validate_coupon/register_coupon_usage do banco. Aqui só cuida da UI e de
    // refletir o desconto no resumo (renderCart) e no total enviado no pedido.
    applyCoupon: async () => {
        const input = document.getElementById('coupon-input');
        const msgEl = document.getElementById('coupon-message');
        const applyBtn = document.getElementById('apply-coupon-btn');
        const code = input ? input.value.trim() : '';

        if (!code) return;
        if (!window.CouponService) {
            console.error('Checkout: CouponService não carregado.');
            return;
        }

        if (applyBtn) applyBtn.disabled = true;

        const orderValue = window.cartService.getTotal() || 0;
        const result = await window.CouponService.validate(code, orderValue);

        if (applyBtn) applyBtn.disabled = false;

        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.style.color = result.valid ? '#15803d' : '#ef4444';
            msgEl.textContent = result.message;
        }

        if (!result.valid) return;

        const appliedBox = document.getElementById('coupon-applied');
        const codeDisplay = document.getElementById('coupon-code-display');
        const descDisplay = document.getElementById('coupon-desc-display');
        if (appliedBox) appliedBox.style.display = 'block';
        if (codeDisplay) codeDisplay.textContent = result.coupon.code;
        if (descDisplay) descDisplay.textContent = window.CouponService.formatDiscount(result.coupon);
        if (msgEl) msgEl.style.display = 'none';

        if (input) { input.value = ''; input.disabled = true; }
        if (applyBtn) applyBtn.style.display = 'none';

        checkout.renderCart();
    },

    removeCoupon: () => {
        if (window.CouponService) window.CouponService.clear();

        const appliedBox = document.getElementById('coupon-applied');
        const msgEl = document.getElementById('coupon-message');
        const input = document.getElementById('coupon-input');
        const applyBtn = document.getElementById('apply-coupon-btn');
        if (appliedBox) appliedBox.style.display = 'none';
        if (msgEl) msgEl.style.display = 'none';
        if (input) { input.disabled = false; input.value = ''; }
        if (applyBtn) applyBtn.style.display = '';

        checkout.renderCart();
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
        const appliedCoupon = window.CouponService ? window.CouponService.getCurrent() : null;
        const couponDiscount = appliedCoupon ? window.CouponService.calculateDiscount(appliedCoupon, total) : 0;
        const shipping = window.shippingService ? window.shippingService.getSelection() : null;
        const shippingCost = shipping ? shipping.price : 0;
        const shippingLabel = shipping ? shipping.name : 'A combinar';
        const finalTotal = Math.max(total - couponDiscount, 0) + shippingCost;

        const campo = (id) => {
            const el = document.getElementById(id);
            return el && el.value ? el.value.trim() : '';
        };

        // Endereco completo: antes era digitado pelo cliente e descartado.
        const enderecoEntrega = [
            street,
            campo('chk-number') ? 'no ' + campo('chk-number') : '',
            campo('chk-neighborhood'),
            campo('chk-city'),
            campo('chk-cep') ? 'CEP ' + campo('chk-cep') : ''
        ].filter(Boolean).join(', ');

        // WhatsApp: o que o cliente digitou tem prioridade sobre o do cadastro.
        const telefoneCliente = campo('chk-phone') || user.phone || '';

        // Protocol Data Structure
        const protocolData = {
            client_id: user.id, // Auth User ID is critical
            client_name: user.name || null, // Nome do cliente
            client_email: user.email, // Added for Fallback Search
            client_phone: telefoneCliente || null, // Para falar no WhatsApp
            delivery_address: enderecoEntrega || null, // Para onde entregar
            total_amount: finalTotal,
            shipping_cost: shippingCost,
            shipping_method: shippingLabel,
            notes: `Pedido via Site. Frete: ${shippingLabel}${shippingCost > 0 ? ` (R$ ${shippingCost.toFixed(2)})` : ''}.` + (appliedCoupon
                ? ` Cupom ${appliedCoupon.code} aplicado (${window.CouponService.formatDiscount(appliedCoupon)}${couponDiscount > 0 ? `, -R$ ${couponDiscount.toFixed(2)}` : ''}).`
                : ''),
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

            // Registra o uso do cupom (incrementa usage_count) e limpa pra não
            // vazar pro próximo pedido. Não bloqueia o fluxo se falhar — o
            // pedido já foi criado, o desconto já está no total_amount e na
            // observação; só o contador de uso do cupom ficaria incorreto.
            if (appliedCoupon && window.CouponService) {
                try {
                    await window.CouponService.registerUsage(appliedCoupon.id, request.id, couponDiscount);
                } catch (couponErr) {
                    console.error('Checkout: falha ao registrar uso do cupom.', couponErr);
                }
                window.CouponService.clear();
            }

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
            if (window.shippingService) window.shippingService.clearSelection();

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

📦 *Frete:* ${shippingLabel}${shippingCost > 0 ? ` (R$ ${shippingCost.toFixed(2)})` : ''}

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
