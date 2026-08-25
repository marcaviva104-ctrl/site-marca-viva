/**
 * Marca Viva - Shopping Cart Logic
 * Handles adding/removing items and persistence to LocalStorage.
 */

const cartService = {
    // Dynamic Key based on User
    getCartKey: () => {
        // 1. Try Memory (Auth Service)
        let user = window.authService ? window.authService.getCurrentUser() : null;

        // 2. Try Cache (Failsafe for Fast Loads)
        if (!user) {
            try {
                const cached = localStorage.getItem('mv_user_cache');
                if (cached) user = JSON.parse(cached);
            } catch (e) { console.error("Cart Key Cache Error:", e); }
        }

        if (user && user.id) {
            return `mv_cart_${user.id}`;
        }
        return null; // Guest or not valid
    },

    getCart: () => {
        try {
            const key = cartService.getCartKey();
            if (!key) return []; // No guest cart access
            return JSON.parse(localStorage.getItem(key)) || [];
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
        // Enforce Login
        if (!window.authService || !window.authService.isAuthenticated()) {
            Swal.fire({
                icon: 'info',
                title: 'Login Necessário',
                text: 'Para adicionar itens ao carrinho, você precisa estar logado.',
                showCancelButton: true,
                confirmButtonText: 'Fazer Login',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = 'login.html';
                }
            });
            return [];
        }

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

        // Check if item exists (Group by ID unless it has custom files/dynamic config)
        let lineId = `${product.id}-${safeCustomization}`;
        if (product.fileUrl || product.pricing_type === 'variable') {
            // Force a unique line ID for products with unique files or page configurations
            lineId = `${product.id}-${safeCustomization}-${Date.now()}`;
        }

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
                addedAt: new Date().toISOString(),
                // Persistence for Enterprise Configurator & Files
                configuration: product.configuration || {},
                fileUrl: product.fileUrl || null,
                fileName: product.fileName || null
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
        const key = cartService.getCartKey();
        if (key) localStorage.removeItem(key);
        cartService.notifyChange();
        cartService.renderSidebar();
        cartService.clearCloud();
    },

    saveCart: (cart) => {
        const key = cartService.getCartKey();
        if (key) localStorage.setItem(key, JSON.stringify(cart));
        cartService.notifyChange();
        cartService.pushToCloud(cart);
    },

    // ---- Sincronização com Supabase (cart_items) ----
    // localStorage continua sendo a fonte de verdade síncrona (getCart/saveCart);
    // a nuvem é só um backup/sync para acompanhar o usuário entre dispositivos.
    // Nunca deve bloquear addToCart/checkout — por isso tudo aqui é fire-and-forget
    // e envolto em try/catch.

    _cloudUserId: () => (window.authService && window.authService.isAuthenticated())
        ? (window.authService.getCurrentUser() || {}).id
        : null,

    _toCloudRow: (item, userId) => ({
        user_id: userId,
        line_id: item.lineId,
        product_id: item.productId,
        name: item.name || null,
        image: item.image || null,
        price: isNaN(item.price) ? 0 : item.price,
        qty: item.qty || 1,
        customization: item.customization || null,
        configuration: item.configuration || {},
        file_url: item.fileUrl || null,
        file_name: item.fileName || null,
        added_at: item.addedAt || null
    }),

    _fromCloudRow: (row) => ({
        lineId: row.line_id,
        productId: row.product_id,
        name: row.name,
        image: row.image,
        price: Number(row.price) || 0,
        qty: row.qty || 1,
        customization: row.customization || 'Sem gravação',
        addedAt: row.added_at || row.updated_at,
        configuration: row.configuration || {},
        fileUrl: row.file_url || null,
        fileName: row.file_name || null
    }),

    pushToCloud: async (cart) => {
        try {
            if (!window.supabase) return;
            const userId = cartService._cloudUserId();
            if (!userId) return;

            if (cart.length === 0) {
                await window.supabase.from('cart_items').delete().eq('user_id', userId);
                return;
            }

            const rows = cart.map(item => cartService._toCloudRow(item, userId));
            const lineIds = rows.map(r => r.line_id);

            await window.supabase.from('cart_items').upsert(rows, { onConflict: 'user_id,line_id' });
            await window.supabase.from('cart_items').delete()
                .eq('user_id', userId)
                .not('line_id', 'in', `(${lineIds.map(id => `"${id}"`).join(',')})`);
        } catch (e) {
            console.warn('Cart: falha ao sincronizar com a nuvem.', e);
        }
    },

    clearCloud: async () => {
        try {
            if (!window.supabase) return;
            const userId = cartService._cloudUserId();
            if (!userId) return;
            await window.supabase.from('cart_items').delete().eq('user_id', userId);
        } catch (e) {
            console.warn('Cart: falha ao limpar carrinho na nuvem.', e);
        }
    },

    // Une o carrinho local com o da nuvem ao logar (ex.: comprador troca de
    // dispositivo). Quando o mesmo item existe nos dois lados, mantém a maior
    // quantidade — nunca descarta uma adição feita em outro aparelho.
    pullAndMerge: async () => {
        try {
            if (!window.supabase) return;
            const userId = cartService._cloudUserId();
            if (!userId) return;

            const { data, error } = await window.supabase
                .from('cart_items')
                .select('*')
                .eq('user_id', userId);
            if (error) throw error;

            const cloudItems = (data || []).map(cartService._fromCloudRow);
            const localItems = cartService.getCart();

            const merged = [...localItems];
            cloudItems.forEach(cloudItem => {
                const localMatch = merged.find(i => i.lineId === cloudItem.lineId);
                if (localMatch) {
                    localMatch.qty = Math.max(localMatch.qty || 1, cloudItem.qty || 1);
                } else {
                    merged.push(cloudItem);
                }
            });

            const key = cartService.getCartKey();
            if (key) localStorage.setItem(key, JSON.stringify(merged));
            cartService.notifyChange();
            cartService.renderSidebar();
            cartService.pushToCloud(merged);
        } catch (e) {
            console.warn('Cart: falha ao mesclar carrinho da nuvem.', e);
        }
    },

    getTotal: () => {
        const cart = cartService.getCart();
        return cart.reduce((acc, item) => {
            let price = Number(item.price);
            if (isNaN(price)) price = 0;
            const qty = Number(item.qty) || 1;
            return acc + (price * qty);
        }, 0);
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
                <div class="cart-empty-state" style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                    <i class="ph-duotone ph-shopping-cart" style="font-size: 4rem; opacity: 0.5; margin-bottom: 20px;"></i>
                    <p style="font-size: 1.1rem; font-weight: 500;">Seu carrinho está vazio</p>
                    <button onclick="cartService.toggle()" class="btn-primary" style="margin-top:20px; padding: 12px 30px; border-radius: 99px; background: var(--accent-orange); color: white; border: none; cursor: pointer;">Ver Ofertas</button>
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
                        ${item.fileName ? `<div class="cart-item-meta" style="color:#0ea5e9; font-weight:600; margin-top:4px;"><a href="${item.fileUrl}" target="_blank" style="color:#0ea5e9; text-decoration:underline;" onclick="event.stopPropagation();"><i class="ph-bold ph-link"></i> Download do Arquivo (${item.fileName})</a></div>` : ''}
                    </div>
                    
                    <div class="cart-price-row">
                        <div class="qty-control">
                            ${item.fileName || item.pricing_type === 'variable'
                    ? `<span class="qty-val" style="font-size: 0.85rem; color: #64748b; padding: 0 5px;" title="Quantidade definida na configuração do arquivo">Qtd: ${item.qty || 1} <i class="ph-bold ph-lock-key"></i></span>`
                    : `
                            <button class="qty-btn" onclick="cartService.updateQty('${item.lineId}', -1)">−</button>
                            <span class="qty-val">${item.qty || 1}</span>
                            <button class="qty-btn" onclick="cartService.updateQty('${item.lineId}', 1)">+</button>
                            `}
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
            Swal.fire('Or�amento Vazio', 'Adicione produtos antes de finalizar.', 'warning');
            return;
        }
        window.location.href = 'checkout.html';
    },

    // [NEW] Generate Quote Feature
    downloadQuote: () => {
        if (cartService.getCount() === 0) {
            Swal.fire('Or�amento Vazio', 'Adicione produtos para gerar orçamento.', 'warning');
            return;
        }

        // Check Login
        if (!window.authService || !window.authService.isAuthenticated()) {
            Swal.fire({
                icon: 'info',
                title: 'Login Necessário',
                text: 'Faça login para gerar um orçamento oficial com seus dados.',
                showCancelButton: true,
                confirmButtonText: 'Fazer Login',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) window.location.href = 'login.html';
            });
            return;
        }

        // Capture Form Data (if on checkout page)
        const quoteData = {
            timestamp: new Date().getTime()
        };

        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value : null;
        };

        const street = getVal('chk-street');
        if (street) {
            quoteData.address = {
                street: street,
                number: getVal('chk-number'),
                neighborhood: getVal('chk-neighborhood'),
                city: getVal('chk-city'),
                cep: getVal('chk-cep')
            };
        }

        localStorage.setItem('mv_quote_temp', JSON.stringify(quoteData));

        // Open Printable Page (with Cache Buster)
        const cacheBuster = new Date().getTime();
        // Determine path depending on if we are in root or in /pages/
        const isPagesDir = window.location.pathname.includes('/pages/');
        const quotePath = isPagesDir ? `quote.html?v=${cacheBuster}` : `pages/quote.html?v=${cacheBuster}`;

        window.open(quotePath, '_blank');
    }
};

// Global Expose
window.cartService = cartService;

// Initialize Badge on Load
document.addEventListener('DOMContentLoaded', () => {
    cartService.notifyChange();
});

// Mescla o carrinho da nuvem uma vez por login (troca de usuário/dispositivo).
// auth:stateChanged também dispara em refresh de perfil, então guardamos o
// último userId já mesclado nesta sessão para não repetir o merge à toa.
let _cartLastMergedUserId = null;
document.addEventListener('auth:stateChanged', (e) => {
    const user = e.detail && e.detail.user;
    if (user && user.id && user.id !== _cartLastMergedUserId) {
        _cartLastMergedUserId = user.id;
        cartService.pullAndMerge();
    }
    if (!user) {
        _cartLastMergedUserId = null;
    }
});
