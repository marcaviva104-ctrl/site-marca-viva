/**
 * Marca Viva - Smart Admin Logic
 * Handles Cost Aggregation, Profit Analysis, and Real-time Publishing
 */

const adminApp = {
    currentStatusFilter: 'all', // State for filters

    async init() {
        console.log("AdminApp: Starting initialization...");

        // 1. Bind UI immediately so tabs work even during loading
        this.bindNav();

        // 2. Initialize Data Layer
        if (typeof dataManager !== 'undefined') {
            await dataManager.init();
        }

        // 3. Check Auth & Render
        try {
            await this.checkAuth();
        } catch (e) {
            console.error("Auth check failed:", e);
        }

        this.renderDashboard();
        this.updateInventoryBadge();


        const clearBtn = document.getElementById('btn-clear-chats');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllChats());
        }

        // 4. Initialize Realtime Listeners
        if (typeof RealtimeManager !== 'undefined') {
            RealtimeManager.init();
        }

        console.log("AdminApp: Init completed.");
    },

    async checkAuth() {
        // Wait for Supabase
        let retries = 0;
        while (!window.supabase && retries < 20) {
            await new Promise(r => setTimeout(r, 100));
            retries++;
        }

        if (!window.supabase) {
            console.error("Admin: Supabase client missing.");
            return;
        }

        // 1. Get Session
        const { data: { session } } = await window.supabase.auth.getSession();

        if (!session) {
            console.warn("Admin: No session found. Checking God Mode...");
            // window.location.href = 'login.html';
            // return;
        }

        // 2. CHECK OVERRIDE FIRST (Fastest & Safest)
        const currentEmail = (session && session.user && session.user.email) ? session.user.email.toLowerCase() : '';
        const adminEmail = authService.EMERGENCY_ADMIN_EMAIL.toLowerCase();

        if (currentEmail === adminEmail) {
            console.log("Admin: Access granted (Emergency Override).");
            return; // Allow access immediately
        }

        // 3. Check DB Profile (Fallback) - Only if session exists
        if (session && session.user) {
            let profile = null;
            try {
                const { data } = await window.supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                profile = data;
            } catch (err) {
                console.warn("Admin: Profile fetch failed (ignoring)", err);
            }

            if (profile && profile.role === 'admin') {
                return; // Valid admin
            }
        }

        // If we reach here, no valid admin session was found via DB and no God Mode match
        console.log("Admin: Access check finished - Unauthorized.");

        // Blocking access for non-admins
        // Blocking access for non-admins
        if (currentEmail !== adminEmail) {
            console.warn('DEV MODE: Acesso de admin permitido sem verificação rigorosa.');
            // alert('Acesso negado: Área restrita para administradores.');
            // window.location.href = 'index.html';
        }

        // Initial Render
        this.renderDashboard();
    },

    bindNav() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const vid = link.getAttribute('data-view');
                if (!vid) return;
                e.preventDefault();

                document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
                document.getElementById(vid).classList.add('active');

                if (vid === 'inputs') this.renderInputsTable();
                if (vid === 'products') this.renderProductsTable();
                if (vid === 'dashboard') this.renderDashboard();
                if (vid === 'inventory') this.renderInventoryView();
                if (vid === 'orders') this.renderOrdersTable();
                if (vid === 'messages') this.renderMessagesView();
                if (vid === 'financial') this.renderFinancial();
            });
        });
    },



    // --- Module 5: Internal Chat (Phase 4) ---
    renderMessagesView() {
        this.loadChatList();
        // Start polling for new messages if view is active
        if (this.chatInterval) clearInterval(this.chatInterval);
        this.chatInterval = setInterval(() => {
            if (document.getElementById('view-messages').classList.contains('active')) {
                // Optimization: Check for changes before invalidating DOM
                const currentStr = localStorage.getItem('mv_chats');
                if (this.lastChatStr !== currentStr) {
                    this.loadChatList();
                    this.lastChatStr = currentStr;

                    // Only refresh active chat if it's open
                    if (this.activeChatEmail) this.openChat(this.activeChatEmail);
                }
            } else {
                clearInterval(this.chatInterval);
            }
        }, 3000);
    },

    lastChatStr: '',

    loadChatList() {
        const list = document.getElementById('admin-chat-list');
        const chats = JSON.parse(localStorage.getItem('mv_chats')) || {};

        if (Object.keys(chats).length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhuma conversa iniciada.</p>';
            return;
        }

        list.innerHTML = Object.keys(chats).map(email => {
            const chat = chats[email];
            const lastMsg = chat.messages[chat.messages.length - 1] || { text: '', timestamp: 0 };
            const isActive = this.activeChatEmail === email ? 'background: #f1f5f9;' : '';
            const unreadBadge = chat.unread > 0 ? `<span style="background:var(--accent-orange); color:white; font-size:0.7rem; padding:2px 6px; border-radius:10px;">${chat.unread}</span>` : '';

            return `
                <div onclick="adminApp.openChat('${email}')" style="padding: 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition:0.2s; ${isActive}" onmouseover="this.style.background='#f8fafc'" onmouseout="if(this.style.background!=='rgb(241, 245, 249)') this.style.background='white'">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:600; color:#1e293b;">${chat.userName}</span>
                        ${unreadBadge}
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${lastMsg.text}
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">
                        ${new Date(lastMsg.timestamp).toLocaleTimeString()} - ${email}
                    </div>
                </div>
            `;
        }).join('');
    },

    activeChatEmail: null,

    openChat(email) {
        this.activeChatEmail = email;
        const chats = JSON.parse(localStorage.getItem('mv_chats'));
        const chat = chats[email];

        if (!chat) return;

        // UI Updates
        document.getElementById('active-chat-user').innerText = `${chat.userName} (${email})`;
        document.getElementById('active-chat-status').innerText = 'Online';
        document.getElementById('admin-chat-input').disabled = false;
        document.getElementById('admin-chat-send-btn').disabled = false;

        const container = document.getElementById('admin-chat-messages');

        // Simple Diff: Only update if length changed or first load
        // Note: For a perfect chat we'd append, but for stability reset is safer if fast enough.
        // We will just keep it simple but ensure scroll sticks to bottom ONLY if we were at bottom or it's new.

        container.innerHTML = chat.messages.map(m => `
            <div style="max-width:70%; pad:10px; border-radius:8px; padding:10px; font-size:0.9rem; align-self: ${m.sender === 'admin' ? 'flex-end' : 'flex-start'}; background: ${m.sender === 'admin' ? '#e0f2fe' : 'white'}; border: 1px solid ${m.sender === 'admin' ? '#bae6fd' : 'white'}; color: ${m.sender === 'admin' ? '#0369a1' : '#334155'}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ${m.text}
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Clear unread
        if (chat.unread > 0) {
            chat.unread = 0;
            localStorage.setItem('mv_chats', JSON.stringify(chats));
            // We don't call loadChatList here to avoid loop, strictly update data
        }
    },

    sendAdminMessage() {
        if (!this.activeChatEmail) return;
        const input = document.getElementById('admin-chat-input');
        const text = input.value.trim();
        if (!text) return;

        const chats = JSON.parse(localStorage.getItem('mv_chats'));
        if (!chats[this.activeChatEmail]) return;

        chats[this.activeChatEmail].messages.push({
            sender: 'admin',
            text: text,
            timestamp: Date.now()
        });

        localStorage.setItem('mv_chats', JSON.stringify(chats));
        input.value = '';
        this.openChat(this.activeChatEmail); // Refresh view
        this.loadChatList(); // Refresh list preview
    },

    clearAllChats() {
        if (confirm('Tem certeza que deseja apagar TODAS as conversas? Isso não pode ser desfeito.')) {
            localStorage.removeItem('mv_chats');
            this.loadChatList();
            this.activeChatEmail = null;
            document.getElementById('admin-chat-messages').innerHTML = '';
            document.getElementById('active-chat-user').innerText = 'Selecione uma conversa';
            document.getElementById('active-chat-status').innerText = '-';
            document.getElementById('admin-chat-input').disabled = true;
            document.getElementById('admin-chat-send-btn').disabled = true;
        }
    },


    // --- Module 1: Inputs (Insumos) ---
    openInputModal() {
        document.getElementById('modal-input').classList.add('open');
        document.getElementById('input-id').value = '';
        document.getElementById('input-name').value = '';
        document.getElementById('input-supplier').value = '';
        document.getElementById('input-cost').value = '';
        document.getElementById('input-unit').value = 'un';
        document.getElementById('input-min-stock').value = 5;
        document.getElementById('check-no-min-stock').checked = false;
        this.toggleMinStockInput(document.getElementById('check-no-min-stock'));
    },

    async cleanupInputs() {
        // Whitelist provided by user
        const keep = [
            "papel fotográfico adesivo 180g",
            "bopp fosco",
            "tinta papel fotográfico"
        ];

        const inputs = dataManager.getInputs();
        const toDelete = inputs.filter(i => {
            const name = i.name.toLowerCase().trim();
            // Keep if name loosely matches any whitelist item
            return !keep.some(k => name.includes(k) || k.includes(name));
        });

        if (toDelete.length === 0) {
            alert("Nenhum item para excluir! A lista já está limpa.");
            return;
        }

        if (!confirm(`⚠️ PERIGO: Isso vai apagar ${toDelete.length} insumos e manter apenas os 3 solicitados. Tem certeza?`)) return;

        let count = 0;
        for (const item of toDelete) {
            await dataManager.deleteInput(item.id);
            count++;
        }

        this.renderInputsTable();
        alert(`Limpeza concluída! ${count} itens foram removidos.`);
    },

    async saveInput() {
        try {
            const id = document.getElementById('input-id').value;
            const name = document.getElementById('input-name').value;
            const supplier = document.getElementById('input-supplier').value || 'N/A';
            const cost = parseFloat(document.getElementById('input-cost').value);
            const unit = document.getElementById('input-unit').value;

            // Min Stock Logic
            const noMinStock = document.getElementById('check-no-min-stock').checked;
            const minStock = noMinStock ? 0 : (parseFloat(document.getElementById('input-min-stock').value) || 0);

            if (!name || isNaN(cost)) { alert('Preencha nome e custo!'); return; }

            // Fetch existing inputs to preserve stock if editing
            const existingInputs = dataManager.getInputs() || [];
            const existing = id ? existingInputs.find(i => i.id === id) : null;

            const input = {
                id: id ? id : `INS-${Date.now().toString().slice(-5)}`,
                name, supplier, cost, unit,
                minStock,
                stock: existing ? (existing.stock || 0) : 0
            };

            const success = await dataManager.saveInput(input);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.updateInventoryBadge();
                this.renderDashboard(); // Update dashboard alerts
            } else {
                alert("Erro ao salvar insumo (Retorno falso).");
            }
        } catch (e) {
            console.error("Save Input Error:", e);
            alert("Erro inesperado ao salvar insumo: " + e.message);
        }
    },

    toggleMinStockInput(checkbox) {
        const input = document.getElementById('input-min-stock');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = 1; // Visual Only
            input.style.opacity = '0.5';
        } else {
            input.disabled = false;
            input.style.opacity = '1';
        }
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    },

    showConfirm(title, msg, onConfirm) {
        const modal = document.getElementById('modal-confirm');
        if (!modal) return;

        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;

        // Setup Yes button
        const yesBtn = document.getElementById('confirm-btn-yes');

        // Remove old listeners to prevent stacking
        const newBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newBtn, yesBtn);

        newBtn.addEventListener('click', () => {
            onConfirm();
            this.closeModals();
        });

        modal.classList.add('open');
    },

    async renderInputsTable() {
        const tbody = document.getElementById('inputs-table-body');
        // Fetch fresh data from Cloud
        await dataManager.fetchInputs();
        const inputs = dataManager.getInputs();
        if (!inputs) return; // robustness
        tbody.innerHTML = inputs.map(i => {
            const status = dataManager.getStockStatus(i);
            const statusIcon = {
                'ok': '🟢',
                'low': '🟡',
                'critical': '🔴',
                'out': '⚫'
            }[status] || '🟢';

            const stock = i.stock || 0;
            const minStock = i.minStock || 5;

            // Simple Status Logic (Override dataManager for now to ensure reactivity to custom minStock)
            let displayIcon = '🟢';
            if (stock <= 0) displayIcon = '⚫';
            else if (stock <= minStock) displayIcon = '🟠';

            return `
            <tr>
                <td><strong>${i.name}</strong></td>
                <td><span style="font-size:0.8rem;color:#64748b;">${i.supplier || '-'}</span></td>
                <td>${i.unit}</td>
                <td>R$ ${i.cost.toFixed(2)}</td>
                <td>
                    <span style="font-weight:600;">${displayIcon} ${stock} ${i.unit}</span>
                    <span style="font-size:0.75rem;color:#94a3b8;display:block;">${minStock === 0 ? 'Sem Mínimo' : `Min: ${minStock}`}</span>
                </td>
                <td>
                    <button onclick="adminApp.openStockEntry('${i.id}')" title="Entrada de Estoque" 
                        style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-arrow-down-left"></i>
                    </button>
                    <button onclick="adminApp.openStockAdjust('${i.id}')" title="Saída/Perda" 
                        style="color:#f59e0b;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-arrow-up-right"></i>
                    </button>
                    <button onclick="adminApp.deleteInput('${i.id}')" style="color:red;border:none;background:none;cursor:pointer;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    },

    deleteInput(id) {
        this.showConfirm('Excluir este insumo?', 'Isso removerá o item do estoque permanentemente.', async () => {
            await dataManager.deleteInput(id);
            this.renderInputsTable();
        });
    },

    updateCategoryDatalist() {
        const products = dataManager.getProducts() || [];
        const datalist = document.getElementById('category-list');
        if (!datalist) return;

        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        // Add defaults if missing
        ['Escritório', 'Tecnologia', 'Serviços', 'Kits'].forEach(c => {
            if (!categories.includes(c)) categories.push(c);
        });

        datalist.innerHTML = categories.sort().map(c => `<option value="${c}">`).join('');
    },

    // --- Module 2: Smart Product Aggregator ---
    openProductModal() {
        document.getElementById('modal-product').classList.add('open');
        this.resetModal();

        // Reset Search
        const searchInput = document.getElementById('input-search');
        if (searchInput) searchInput.value = '';

        this.renderInputList();
        this.calculateProfit();
    },

    resetModal() {
        document.getElementById('prod-id').value = '';
        document.getElementById('prod-name').value = '';
        document.getElementById('prod-sku').value = ''; // Clear SKU
        document.getElementById('prod-cat').value = '';
        document.getElementById('prod-desc').value = ''; // Clear Description
        document.getElementById('prod-img').value = '';
        document.getElementById('prod-link').value = '';
        document.getElementById('prod-min-stock').value = 5;
        document.getElementById('prod-min-order').value = 1;
        document.getElementById('check-no-min-order').checked = true;
        this.toggleMinOrder(document.getElementById('check-no-min-order'));

        // Uncheck all inputs
        document.querySelectorAll('.cost-check').forEach(c => c.checked = false);
        document.querySelectorAll('input[id^="qty-"]').forEach(i => {
            i.style.visibility = 'hidden';
            i.value = 1;
        });

        // Reset Variations
        document.getElementById('prod-has-variations').checked = false;
        this.currentVariations = [];
        this.toggleVariations();
        this.renderVariations();
        document.getElementById('prod-stock').value = 0;
        document.getElementById('prod-min-stock').value = 5;

        // Reset Image
        this.removeImage();
    },

    renderInputList(filterText = '') {
        const inputs = dataManager.getInputs() || [];
        const listContainer = document.getElementById('input-selection-list');

        const filtered = inputs.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:10px;">Nenhum insumo encontrado.</div>';
            return;
        }

        listContainer.innerHTML = filtered.map(i => `
            <div class="comp-item">
                <div style="display:flex;align-items:center;gap:8px;flex:1;">
                    <input type="checkbox" class="cost-check" id="check-${i.id}" value="${i.cost}" data-id="${i.id}" onchange="adminApp.toggleQty('${i.id}')">
                    <label for="check-${i.id}" style="font-size:0.9rem;cursor:pointer;color:#334155;">${i.name} (${i.unit})</label>
                </div>
                
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="number" id="qty-${i.id}" value="1" min="1" placeholder="Qtd"
                           style="width:60px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;visibility:hidden;font-size:0.8rem;" 
                           oninput="adminApp.calculateProfit()" onclick="event.stopPropagation()">
                    <span style="font-size:0.8rem;color:#64748b;min-width:70px;text-align:right;">R$ ${i.cost.toFixed(2)}</span>
                </div>
            </div>
        `).join('');
    },

    toggleQty(id) {
        const checkbox = document.getElementById(`check-${id}`);
        const qtyInput = document.getElementById(`qty-${id}`);
        if (checkbox.checked) {
            qtyInput.style.visibility = 'visible';
            qtyInput.focus();
        } else {
            qtyInput.style.visibility = 'hidden';
            qtyInput.value = 1;
        }
        this.calculateProfit();
    },

    filterInputs(val) {
        this.renderInputList(val);
    },

    calculateProfit() {
        // Sum checked inputs with quantities
        const checks = document.querySelectorAll('.cost-check:checked');
        let totalCost = 0;

        checks.forEach(c => {
            const id = c.getAttribute('data-id');
            const qtyInput = document.getElementById(`qty-${id}`);
            const qty = qtyInput ? (parseFloat(qtyInput.value) || 1) : 1;
            totalCost += parseFloat(c.value) * qty;
        });

        const price = parseFloat(document.getElementById('prod-price').value) || 0;
        const profit = price - totalCost;

        // MARKUP CALCULATION (Profit / Cost) * 100
        // Allows > 100%
        let markup = 0;
        if (totalCost > 0) {
            markup = (profit / totalCost) * 100;
        } else if (price > 0) {
            markup = 100; // If cost is 0, practically 100% profit (or infinite markup)
        }

        // Suggested Price (Cost * 1.5 for 50% Markup roughly, or Cost / 0.6)
        // Let's keep the suggestion logic simple: Cost + 40% margin (Markup ~66%)
        const suggested = totalCost > 0 ? totalCost * 1.5 : 0;

        // Render in Analysis Box
        document.getElementById('calc-cost').innerText = `R$ ${totalCost.toFixed(2)}`;
        document.getElementById('calc-price').innerText = `R$ ${price.toFixed(2)}`;
        document.getElementById('calc-suggested').innerText = `R$ ${suggested.toFixed(2)}`;
        document.getElementById('calc-profit').innerText = `R$ ${profit.toFixed(2)}`;
        document.getElementById('calc-profit').className = profit >= 0 ? 'profit-positive' : 'profit-negative';

        document.getElementById('calc-margin').innerText = `${markup.toFixed(0)}% (Markup)`;

        // Alert Logic
        const alertBox = document.getElementById('margin-alert');
        // If Markup < 30%, it might be too low.
        if (markup < 30 && price > 0) {
            alertBox.style.display = 'block';
            alertBox.innerHTML = `⚠ Markup muito baixo (< 30%). Cuidado!`;
        } else {
            alertBox.style.display = 'none';
        }

        return { totalCost, margin: markup }; // Return for save
    },

    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const name = document.getElementById('prod-name').value;
        const price = parseFloat(document.getElementById('prod-price').value);
        const { totalCost } = this.calculateProfit(); // Get computed cost
        const cat = document.getElementById('prod-cat').value;
        const img = document.getElementById('prod-img').value || 'https://via.placeholder.com/500';
        const link = document.getElementById('prod-link').value;

        if (!name || isNaN(price)) { alert('Nome e Preço são obrigatórios!'); return; }

        // --- Variations / Stock Logic ---
        const hasVariations = document.getElementById('prod-has-variations').checked;
        let finalStock = 0;
        let variationsData = null;
        let minStock = parseInt(document.getElementById('prod-min-stock').value) || 5;

        // Min Order Logic
        const noMinOrder = document.getElementById('check-no-min-order').checked;
        const minOrder = noMinOrder ? 1 : (parseInt(document.getElementById('prod-min-order').value) || 1);

        if (hasVariations) {
            variationsData = this.currentVariations;
            // Sum stock from variations
            finalStock = variationsData.reduce((acc, v) => acc + (v.stock || 0), 0);
        } else {
            finalStock = parseInt(document.getElementById('prod-stock').value) || 0;
        }

        // Capture selected ingredients (BOM)
        const checks = document.querySelectorAll('.cost-check:checked');
        const recipe = [];
        checks.forEach(c => {
            const inputId = c.getAttribute('data-id');
            const qtyInput = document.getElementById(`qty-${inputId}`);
            const quantity = qtyInput ? (parseFloat(qtyInput.value) || 1) : 1;
            recipe.push({ inputId, quantity });
        });

        const newProd = {
            id: id ? id : `MV-${Date.now().toString().slice(-4)}`, // Reuse ID if editing
            name, category: cat, price, cost: totalCost, image: img, validLink: link,
            recipe: recipe, // Save BOM
            minStock: minStock,
            recipe: recipe, // Save BOM
            minStock: minStock,
            minOrder: minOrder, // Save Min Order
            stock: finalStock, // Master Stock
            variations: variationsData, // Save Variations JSON
            status: 'active',
            tags: ['Novo'],
            description: document.getElementById('prod-desc').value || '', // New Desc Field
            sku: document.getElementById('prod-sku').value || '', // New SKU Field
            min: 1
        };

        // Refresh categories after save
        setTimeout(() => this.updateCategoryDatalist(), 1000);

        try {
            const success = await dataManager.saveProduct(newProd);
            if (success) {
                alert(id ? 'Produto Atualizado com Sucesso!' : 'Produto Publicado com Sucesso!');
                this.closeModals();
                this.renderProductsTable();
                this.updateInventoryBadge();
            } else {
                alert('Erro ao salvar no banco de dados. Tente novamente ou verifique sua conexão.');
            }
        } catch (error) {
            console.error("Save error:", error);
            alert('Erro crítico ao salvar.');
        }
    },

    editProd(id) {
        const products = dataManager.getProducts();
        const prod = products.find(p => p.id === id);
        if (!prod) return;

        document.getElementById('modal-product').classList.add('open');
        this.resetModal(); // Clear previous state first

        // Fill Data
        document.getElementById('prod-id').value = prod.id;
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-sku').value = prod.sku || ''; // Load SKU
        document.getElementById('prod-cat').value = prod.category;
        document.getElementById('prod-desc').value = prod.description || '';
        document.getElementById('prod-price').value = prod.price;
        document.getElementById('prod-img').value = prod.image;

        // Show Image Preview if valid
        if (prod.image && prod.image.startsWith('http')) {
            document.getElementById('img-preview').src = prod.image;
            document.getElementById('img-preview-container').style.display = 'block';
            document.getElementById('drop-zone').style.display = 'none';
        }

        document.getElementById('prod-link').value = prod.validLink || '';
        document.getElementById('prod-min-stock').value = prod.minStock || 5;

        // Load Min Order
        const minOrder = prod.minOrder || 1;
        document.getElementById('prod-min-order').value = minOrder;
        document.getElementById('check-no-min-order').checked = (minOrder === 1);
        this.toggleMinOrder(document.getElementById('check-no-min-order'));

        // --- Load Variations ---
        if (prod.variations && prod.variations.length > 0) {
            document.getElementById('prod-has-variations').checked = true;
            this.currentVariations = [...prod.variations];
            document.getElementById('prod-stock').value = 0; // Ignored when variations active
        } else {
            document.getElementById('prod-has-variations').checked = false;
            this.currentVariations = [];
            document.getElementById('prod-stock').value = prod.stock || 0;
        }
        this.toggleVariations();
        this.renderVariations();

        // Restore BOM (recipe) - checkboxes and quantities
        this.renderInputList(); // Render all inputs first
        if (prod.recipe && prod.recipe.length > 0) {
            prod.recipe.forEach(recipeItem => {
                const checkbox = document.getElementById(`check-${recipeItem.inputId}`);
                if (checkbox) {
                    checkbox.checked = true;
                    const qtyInput = document.getElementById(`qty-${recipeItem.inputId}`);
                    if (qtyInput) {
                        qtyInput.value = recipeItem.quantity;
                        qtyInput.style.visibility = 'visible';
                    }
                }
            });
        }

        this.calculateProfit();
    },

    // --- Image Handling ---
    handleFileSelect(input) {
        if (input.files && input.files[0]) {
            this.processFile(input.files[0]);
        }
    },

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('drop-zone').classList.remove('dragover');

        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            this.processFile(event.dataTransfer.files[0]);
        }
    },

    async processFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas imagens.');
            return;
        }

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('img-preview').src = e.target.result;
            document.getElementById('img-preview-container').style.display = 'block';
            document.getElementById('drop-zone').style.display = 'none';
        };
        reader.readAsDataURL(file);

        // Upload to Cloud
        if (window.StorageManager) {
            // Show loading state?
            const publicUrl = await window.StorageManager.uploadFile(file);
            if (publicUrl) {
                document.getElementById('prod-img').value = publicUrl;
                console.log("Image Uploaded:", publicUrl);
            }
        } else {
            console.warn("StorageManager missing. Image will not be uploaded to cloud.");
        }
    },

    removeImage(e) {
        if (e) e.stopPropagation();
        document.getElementById('prod-img').value = '';
        document.getElementById('prod-file-input').value = ''; // Reset input
        document.getElementById('img-preview').src = '';
        document.getElementById('img-preview-container').style.display = 'none';
        document.getElementById('drop-zone').style.display = 'block';
    },

    async renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        // Fetch fresh data from Cloud
        await dataManager.fetchProducts();
        const products = dataManager.getProducts() || [];
        tbody.innerHTML = products.map(p => {
            const cost = p.cost || 0;
            const profit = p.price - cost;
            // Markup Calculation for Table
            let markup = 0;
            if (cost > 0) {
                markup = (profit / cost) * 100;
            } else if (p.price > 0) {
                markup = 100;
            }

            // Calculate available stock from BOM
            const availableStock = dataManager.calculateAvailableStock(p);
            const minStock = p.minStock || 0;

            let stockStatus = 'ok';
            let stockIcon = '🟢';
            if (availableStock === 0) {
                stockStatus = 'out';
                stockIcon = '⚫';
            } else if (availableStock <= minStock * 0.5) {
                stockStatus = 'critical';
                stockIcon = '🔴';
            } else if (availableStock <= minStock) {
                stockStatus = 'low';
                stockIcon = '🟡';
            }

            // Recipe preview
            let recipePreview = '';
            if (p.recipe && p.recipe.length > 0) {
                const inputs = dataManager.getInputs();
                recipePreview = p.recipe.map(r => {
                    const input = inputs.find(i => i.id === r.inputId);
                    return input ? `${r.quantity}x ${input.name}` : '';
                }).filter(Boolean).join(', ');
            }

            return `
            <tr>
                <td>
                    <div style="font-weight:600;">${p.name}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${p.category}</div>
                    ${recipePreview ? `<div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;">📦 ${recipePreview}</div>` : ''}
                </td>
                <td>R$ ${cost.toFixed(2)}</td>
                <td>R$ ${p.price.toFixed(2)}</td>
                <td><span class="status-badge ${markup < 30 ? 'status-error' : 'status-success'}">${markup.toFixed(0)}%</span></td>
                <td style="font-weight:700; color: ${profit >= 0 ? '#10b981' : '#ef4444'}">R$ ${profit.toFixed(2)}</td>
                <td>
                    <span style="font-weight:700;font-size:0.95rem;">${stockIcon} ${availableStock === Infinity ? '∞' : availableStock} un</span>
                    <div style="font-size:0.7rem;color:#94a3b8;">Pode fazer</div>
                </td>
                <td>
                    <button onclick="adminApp.editProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:#0ea5e9;margin-right:10px;"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="adminApp.deleteProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:red;"><i class="ph-bold ph-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    },

    deleteProd(id) {
        this.showConfirm('Excluir produto?', 'O produto será removido da loja e do painel.', async () => {
            await dataManager.deleteProduct(id);
            this.renderProductsTable();
        });
    },

    async renderDashboard() {
        // 1. Date (Consolidated Fix)
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const dateEl = document.getElementById('dash-date');
        if (dateEl) dateEl.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        // 2. Data
        await dataManager.fetchProducts(); // Ensure fresh
        await dataManager.fetchInputs();

        const products = dataManager.getProducts() || [];
        const inputs = dataManager.getInputs() || [];
        // Manual orders: usage of localStorage as primary until we move to dataManager completely
        const manualOrders = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');

        // 3. Stats
        const pendingCount = manualOrders.filter(o => o.status === 'pending').length;
        document.getElementById('dash-pending-orders').innerText = pendingCount;

        document.getElementById('dash-total-products').innerText = products.length;

        // 4. Low Stock Alerts (Filtered by No Min)
        const lowStockInputs = dataManager.getLowStockInputs() || [];
        document.getElementById('dash-low-stock').innerText = lowStockInputs.length;

        // 5. Populate Alerts Table (Using dash-alerts-body from admin.html)
        const tbody = document.getElementById('dash-alerts-body');
        if (tbody) {
            if (lowStockInputs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">Tudo certo por aqui! 🎉 Estoque saudável.</td></tr>';
            } else {
                tbody.innerHTML = lowStockInputs.map(item => `
                    <tr>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary)">${item.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary)">${item.supplier || '-'}</div>
                        </td>
                        <td>${item.stock} ${item.unit}</td>
                        <td><span class="status-badge status-error">Baixo</span></td>
                    </tr>
                `).join('');
            }
        }
    },

    // --- Inventory Management ---
    openStockEntry(inputId) {
        const inputs = dataManager.getInputs();
        const input = inputs.find(i => i.id === inputId);
        if (!input) return;

        const modal = document.getElementById('modal-stock-entry');
        modal.classList.add('open');
        document.getElementById('stock-entry-input-id').value = inputId;
        document.getElementById('stock-entry-name').innerText = input.name;
        document.getElementById('stock-entry-qty').value = '';
        document.getElementById('stock-entry-supplier').value = input.supplier || '';
        document.getElementById('stock-entry-cost').value = input.cost || '';
        document.getElementById('stock-entry-note').value = '';
    },

    // Helper to prevent double clicks
    setLoading(btnSelector, isLoading) {
        const btn = document.querySelector(btnSelector);
        if (!btn) return;
        btn.disabled = isLoading;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Processando...';
        } else {
            btn.innerHTML = btn.dataset.originalText || 'Salvar';
        }
    },

    async saveStockEntry() {
        try {
            this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', true);
            const inputId = document.getElementById('stock-entry-input-id').value;
            const qty = parseFloat(document.getElementById('stock-entry-qty').value);
            const supplier = document.getElementById('stock-entry-supplier').value;
            const note = document.getElementById('stock-entry-note').value;

            if (!qty || qty <= 0) {
                alert('Informe uma quantidade válida!');
                this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', false);
                return;
            }

            const reason = `Entrada de estoque${supplier ? ` - ${supplier}` : ''}${note ? ` (${note})` : ''}`;

            const success = await dataManager.adjustStock(inputId, qty, 'entrada', reason);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.renderProductsTable(); // Update available stock
                this.renderDashboard();
                this.updateInventoryBadge(); // Update badge
                alert('Entrada registrada com sucesso!');
            } else {
                alert('Erro ao registrar entrada (retorno falso).');
            }
        } catch (e) {
            console.error(e);
            alert('Erro inesperado: ' + e.message);
        } finally {
            this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', false);
        }
    },

    openStockAdjust(inputId) {
        const inputs = dataManager.getInputs();
        const input = inputs.find(i => i.id === inputId);
        if (!input) return;

        const modal = document.getElementById('modal-stock-adjust');
        modal.classList.add('open');
        document.getElementById('stock-adjust-input-id').value = inputId;
        document.getElementById('stock-adjust-name').innerText = input.name;
        document.getElementById('stock-adjust-current').innerText = `Estoque atual: ${input.stock || 0} ${input.unit}`;
        document.getElementById('stock-adjust-qty').value = '';
        document.getElementById('stock-adjust-type').value = 'perda';
        document.getElementById('stock-adjust-reason').value = '';
    },

    async saveStockAdjust() {
        try {
            this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', true);
            const inputId = document.getElementById('stock-adjust-input-id').value;
            const qty = parseFloat(document.getElementById('stock-adjust-qty').value);
            const type = document.getElementById('stock-adjust-type').value;
            const reason = document.getElementById('stock-adjust-reason').value;

            if (!qty || qty <= 0) {
                alert('Informe uma quantidade válida!');
                this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
                return;
            }

            if (!reason) {
                alert('Informe um motivo para o ajuste!');
                this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
                return;
            }

            // Negative quantity for loss/usage
            const success = await dataManager.adjustStock(inputId, -qty, type, reason);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.renderProductsTable(); // Update available stock
                this.renderDashboard();
                this.updateInventoryBadge(); // Update badge
                alert('Ajuste registrado com sucesso!');
            } else {
                alert('Erro ao registrar ajuste (retorno falso).');
            }
        } catch (e) {
            console.error(e);
            alert('Erro inesperado: ' + e.message);
        } finally {
            this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
        }
    },

    // --- Inventory Control View ---
    async renderInventoryView() {
        await dataManager.fetchInputs(); // Ensure stock is fresh
        await dataManager.fetchHistory(); // Ensure history is fresh
        this.renderInventoryOverview();
        this.renderInventoryHistory('all');
        this.updateInventoryStats();
    },

    renderInventoryOverview() {
        const tbody = document.getElementById('inventory-overview-body');
        const inputs = dataManager.getInputs();

        tbody.innerHTML = inputs.map(input => {
            const stock = input.stock || 0;
            const minStock = input.minStock || 0;
            const status = dataManager.getStockStatus(input);
            const totalValue = stock * (input.cost || 0);

            const statusConfig = {
                'ok': { icon: '🟢', label: 'OK', color: '#10b981' },
                'low': { icon: '🟡', label: 'Baixo', color: '#f59e0b' },
                'critical': { icon: '🔴', label: 'Crítico', color: '#ef4444' },
                'out': { icon: '⚫', label: 'Esgotado', color: '#64748b' }
            }[status];

            return `
                <tr style="background: ${status === 'critical' || status === 'out' ? '#fef2f2' : 'white'}">
                    <td>
                        <strong>${input.name}</strong>
                        <div style="font-size:0.75rem;color:#94a3b8;">${input.supplier || 'Sem fornecedor'}</div>
                    </td>
                    <td>
                        <span style="font-weight:600;font-size:1.1rem;">${stock} ${input.unit}</span>
                    </td>
                    <td>
                        <span style="color:#64748b;">${minStock} ${input.unit}</span>
                    </td>
                    <td>
                        <span style="color:${statusConfig.color};font-weight:600;">
                            ${statusConfig.icon} ${statusConfig.label}
                        </span>
                    </td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>
                        <button onclick="adminApp.openStockEntry('${input.id}')" 
                            style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;" title="Entrada">
                            <i class="ph-bold ph-plus-circle"></i>
                        </button>
                        <button onclick="adminApp.openStockAdjust('${input.id}')" 
                            style="color:#ef4444;border:none;background:none;cursor:pointer;" title="Saída">
                            <i class="ph-bold ph-minus-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderInventoryHistory(filter = 'all') {
        const tbody = document.getElementById('inventory-history-body');
        let history = dataManager.getInventoryHistory(50);

        if (filter !== 'all') {
            history = history.filter(h => h.type === filter);
        }

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">
                        Nenhuma movimentação encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = history.map(h => {
            const date = new Date(h.date);
            const typeConfig = {
                'entrada': { icon: '📥', label: 'Entrada', color: '#10b981' },
                'venda': { icon: '💰', label: 'Venda', color: '#3b82f6' },
                'perda': { icon: '⚠️', label: 'Perda', color: '#ef4444' },
                'uso_interno': { icon: '🔧', label: 'Uso Interno', color: '#f59e0b' },
                'manual': { icon: '✏️', label: 'Ajuste', color: '#64748b' }
            }[h.type] || { icon: '📝', label: h.type, color: '#64748b' };

            const quantityColor = h.quantity > 0 ? '#10b981' : '#ef4444';
            const quantitySign = h.quantity > 0 ? '+' : '';

            return `
                <tr>
                    <td>
                        <div style="font-weight:600;font-size:0.85rem;">${date.toLocaleDateString('pt-BR')}</div>
                        <div style="font-size:0.75rem;color:#94a3b8;">${date.toLocaleTimeString('pt-BR')}</div>
                    </td>
                    <td>
                        <span style="color:${typeConfig.color};font-weight:600;">
                            ${typeConfig.icon} ${typeConfig.label}
                        </span>
                    </td>
                    <td>${h.inputName}</td>
                    <td style="color:${quantityColor};font-weight:700;">
                        ${quantitySign}${h.quantity}
                    </td>
                    <td style="font-size:0.85rem;">${h.reason || '-'}</td>
                    <td style="color:#64748b;font-size:0.85rem;">${h.user || 'Sistema'}</td>
                </tr>
            `;
        }).join('');
    },

    updateInventoryStats() {
        const inputs = dataManager.getInputs();
        const lowStock = dataManager.getLowStockInputs();
        const history = dataManager.getInventoryHistory();

        // Count movements today
        const today = new Date().toDateString();
        const movementsToday = history.filter(h => {
            const date = new Date(h.date);
            return date.toDateString() === today;
        }).length;

        document.getElementById('critical-stock-count').innerText = lowStock.length;
        document.getElementById('total-inputs-count').innerText = inputs.length;
        document.getElementById('movements-today-count').innerText = movementsToday;
    },

    refreshInventoryView() {
        this.renderInventoryView();
    },

    filterHistory(type) {
        this.renderInventoryHistory(type);
    },

    showLowStockOnly() {
        const inputs = dataManager.getLowStockInputs();
        const tbody = document.getElementById('inventory-overview-body');

        if (inputs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#10b981;">
                        ✅ Nenhum item com estoque crítico!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = inputs.map(input => {
            const stock = input.stock || 0;
            const minStock = input.minStock || 0;
            const status = dataManager.getStockStatus(input);
            const totalValue = stock * (input.cost || 0);

            const statusConfig = {
                'low': { icon: '🟡', label: 'Baixo', color: '#f59e0b' },
                'critical': { icon: '🔴', label: 'Crítico', color: '#ef4444' },
                'out': { icon: '⚫', label: 'Esgotado', color: '#64748b' }
            }[status];

            return `
                <tr style="background:#fef2f2">
                    <td>
                        <strong>${input.name}</strong>
                        <div style="font-size:0.75rem;color:#94a3b8;">${input.supplier || 'Sem fornecedor'}</div>
                    </td>
                    <td><span style="font-weight:600;font-size:1.1rem;">${stock} ${input.unit}</span></td>
                    <td><span style="color:#64748b;">${minStock} ${input.unit}</span></td>
                    <td>
                        <span style="color:${statusConfig.color};font-weight:600;">
                            ${statusConfig.icon} ${statusConfig.label}
                        </span>
                    </td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>
                        <button onclick="adminApp.openStockEntry('${input.id}')" 
                            style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;">
                            <i class="ph-bold ph-plus-circle"></i>
                        </button>
                        <button onclick="adminApp.openStockAdjust('${input.id}')" 
                            style="color:#ef4444;border:none;background:none;cursor:pointer;">
                            <i class="ph-bold ph-minus-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAllStock() {
        this.renderInventoryOverview();
    },

    showInventoryHistory() {
        // Scroll to history section
        const historyTable = document.getElementById('inventory-history-table');
        if (historyTable) {
            historyTable.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Update Inventory Badge
    updateInventoryBadge() {
        const lowStock = dataManager.getLowStockInputs();
        const badge = document.getElementById('inventory-badge');
        if (badge) {
            if (lowStock.length > 0) {
                badge.style.display = 'inline-block';
                badge.innerText = lowStock.length;
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // --- Module 4: Order Management ---
    renderOrdersTable() {
        this.renderKanban();
    },

    // --- Module 4: Order Management (Kanban) ---
    async renderKanban() {
        if (!window.OrderManager) return;

        // Show loaders
        const statuses = ['pending', 'paid', 'production', 'shipped', 'delivered'];
        statuses.forEach(status => {
            const list = document.getElementById(`list-${status}`);
            if (list) list.innerHTML = '<div style="text-align:center;padding:20px;color:#cbd5e1;"><i class="ph-bold ph-spinner ph-spin"></i></div>';
            const badge = document.getElementById(`count-${status}`);
            if (badge) badge.innerText = '-';
        });

        const orders = await OrderManager.getAllOrders();

        // Clear lists
        const cols = {
            pending: document.getElementById('list-pending'),
            paid: document.getElementById('list-paid'),
            production: document.getElementById('list-production'),
            shipped: document.getElementById('list-shipped'),
            delivered: document.getElementById('list-delivered')
        };

        const counts = { pending: 0, paid: 0, production: 0, shipped: 0, delivered: 0 };

        // Clear loading spinners
        Object.values(cols).forEach(el => { if (el) el.innerHTML = ''; });

        orders.forEach(order => {
            const status = order.status || 'pending';
            // Fallback for unknown statuses
            const targetCol = cols[status] || cols['pending'];

            if (targetCol) {
                if (counts[status] !== undefined) counts[status]++;

                const card = document.createElement('div');
                card.className = 'kanban-card';
                card.draggable = true;
                // Bind drag event with order ID
                card.ondragstart = (e) => adminApp.drag(e, order.id);

                const date = new Date(order.date).toLocaleDateString('pt-BR');
                const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

                card.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                        <span style="font-weight:700;font-size:0.9rem;color:var(--primary-hero);">#${order.id}</span>
                        <span class="k-date">${date}</span>
                    </div>
                    <div style="font-weight:600; font-size:0.95rem;margin-bottom:2px;color:#1e293b;">${order.customer_name || 'Cliente'}</div>
                    <div style="font-size:0.8rem;color:#64748b;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4;">
                        ${itemsSummary}
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <span class="k-tag" style="background:#f1f5f9;color:#64748b;">${order.items.length} itens</span>
                        <div class="k-price">R$ ${order.total.toFixed(2)}</div>
                    </div>
                `;
                targetCol.appendChild(card);
            }
        });

        // Update counts
        Object.keys(counts).forEach(key => {
            const badge = document.getElementById(`count-${key}`);
            if (badge) badge.innerText = counts[key];
        });
    },

    drag(ev, orderId) {
        ev.dataTransfer.setData("text", orderId);
        ev.target.classList.add('dragging');
    },

    allowDrop(ev) {
        ev.preventDefault();
        ev.currentTarget.classList.add('drag-over');
    },

    async drop(ev, newStatus) {
        ev.preventDefault();
        const col = ev.currentTarget;
        col.classList.remove('drag-over');

        const orderId = ev.dataTransfer.getData("text");
        const draggingCard = document.querySelector('.kanban-card.dragging');
        if (draggingCard) draggingCard.classList.remove('dragging');

        if (!orderId) return;

        // Visual Feedback (Optimistic UI - optional, but let's wait for API for safety first)
        // Call API
        try {
            // Ensure ID is number if DB uses numbers, or string if string. Supabase usually handles mixed well but best to keep consistent.
            // Our OrderManager uses whatever valid ID.
            const success = await OrderManager.updateStatus(orderId, newStatus);
            if (success) {
                // Refresh board
                this.renderKanban();
            } else {
                alert("Falha ao atualizar status do pedido. Tente novamente.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao mover pedido: " + e.message);
        }
    },

    updateOrderStatus(orderId, newStatus) {
        // Legacy wrapper if called from elsewhere, redirect to API
        OrderManager.updateStatus(orderId, newStatus).then(res => this.renderKanban());
    },

    // --- Module 5: Financial Control (New Tab) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---

    // Helper to calculate dates
    filterFinancial(rangeType) {
        const now = new Date();
        let start, end;

        if (rangeType === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day
        } else if (rangeType === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (rangeType === 'custom') {
            const sVal = document.getElementById('fin-date-start').value;
            const eVal = document.getElementById('fin-date-end').value;
            if (!sVal || !eVal) { alert('Selecione as datas de início e fim!'); return; }
            start = new Date(sVal);
            end = new Date(eVal);
            // End of the selected day
            end.setHours(23, 59, 59, 999);
        }

        // Set inputs to match
        const fmt = d => d.toISOString().split('T')[0];
        if (start) document.getElementById('fin-date-start').value = fmt(start);
        if (end) document.getElementById('fin-date-end').value = fmt(end);

        this.renderFinancial({ startDate: start, endDate: end });
    },

    // State for filtering
    currentStatusFilter: 'all', // 'all', 'pending', 'paid'

    filterStatus(status) {
        this.currentStatusFilter = status;
        this.renderFinancial();

        // Update visual state (optional but nice)
        // Note: Simple re-render handles data, but we might want button styles.
        // For now, let's keep it simple.
    },

    async renderFinancial(options = { isBackground: false, startDate: null, endDate: null }) {
        console.log("Admin: renderFinancial Init", options);
        const tbody = document.getElementById('financial-table-body');
        if (!tbody) { console.error("Admin: Tbody missing"); return; }

        if (!options.isBackground) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;"><i class="ph-duotone ph-spinner-gap ph-spin" style="font-size:2rem;"></i><br>Carregando dados...</td></tr>';
            // Trigger Goals Render
            this.renderFinancialGoals();
        }

        try {
            // Default to This Month if no dates provided
            let { startDate, endDate } = options;
            if (!startDate) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);

                // Set inputs initial state
                const fmt = d => d.toISOString().split('T')[0];
                const iS = document.getElementById('fin-date-start');
                const iE = document.getElementById('fin-date-end');
                if (iS && !iS.value) iS.value = fmt(startDate);
                if (iE && !iE.value) iE.value = fmt(endDate);
            }

            // 1. Fetch System Orders (Safe)
            let orders = [];
            try {
                // Note: getAllOrders fetches EVERYTHING. Optimization: Add date filter to OrderManager later.
                // For now, we filter in memory for system orders.
                orders = window.OrderManager ? await window.OrderManager.getAllOrders() : [];
                // Filter System Orders by Date
                orders = orders.filter(o => {
                    const d = new Date(o.date);
                    return d >= startDate && d <= endDate;
                });
                console.log(`Admin: Loaded ${orders.length} system orders (filtered)`);
            } catch (e) {
                console.error("Admin: System orders failed (ignored)", e);
            }

            // 2. Fetch Manual Data (Supabase 'financial') - FILTERED BY DB
            let cloudManualOrders = [];
            if (window.supabase) {
                try {
                    let query = window.supabase
                        .from('financial_records')
                        .select('*')
                        .gte('created_at', startDate.toISOString())
                        .lte('created_at', endDate.toISOString())
                        .order('created_at', { ascending: false });

                    const { data, error } = await query;

                    if (error) {
                        console.error("Admin: Manual fetch failed", error);
                    } else if (data) {
                        console.log(`Admin: Loaded ${data.length} manual records from DB (filtered)`);
                        cloudManualOrders = data.map(r => ({
                            id: r.id,
                            customer_name: r.customer_name,
                            total: Number(r.total) || 0,
                            date: r.created_at, // ISO string
                            status: r.status,
                            items: [{ name: r.description || 'Lançamento Manual', quantity: 1 }],
                            type: r.type || 'income',
                            category: r.category,
                            isManual: true,
                            source: 'cloud'
                        }));
                    }
                } catch (err) {
                    console.error("Admin: Manual fetch failed", err);
                }
            }

            // 3. Load Local Manual Orders (Secondary)
            let localManualOrders = [];
            try {
                const local = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');
                if (local.length > 0) {
                    console.log(`Admin: Loaded ${local.length} local manual records`);
                    localManualOrders = local.map(l => ({ ...l, isManual: true, source: 'local' }));
                }
            } catch (e) { console.error(e); }

            // Merge and Deduplicate (CLOUD WINS)
            // Strategy: Add Cloud first, then add Local only if ID not present
            const manualMap = new Map();

            // 1. Add Cloud (The Truth)
            cloudManualOrders.forEach(o => manualMap.set(o.id, o));

            // 2. Add Local (Only if missing in Cloud)
            localManualOrders.forEach(o => {
                if (!manualMap.has(o.id)) {
                    manualMap.set(o.id, o);
                }
            });

            const manualOrders = Array.from(manualMap.values());

            // 3. Payments (Moved Up for dependencies)
            let paymentsMap = {};
            let totalAccount = 0;
            let totalCash = 0;

            if (window.supabase) {
                try {
                    const { data: pay, error: payError } = await window.supabase
                        .from('order_payments')
                        .select('order_id, amount, payment_method');

                    if (!payError && pay) {
                        pay.forEach(p => {
                            const amt = Number(p.amount);
                            paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + amt;

                            // Split Totals
                            if (p.payment_method === 'cash') totalCash += amt;
                            else totalAccount += amt; // Default to Account
                        });
                    }
                } catch (e) {
                    console.error("Payment fetch error", e);
                }
            } else {
                paymentsMap = JSON.parse(localStorage.getItem('mv_payments') || '{}');
            }

            // 4. Merge All Records (Fix Duplicates)
            let allRecords = [...orders, ...manualOrders];

            // Apply Status Filter
            if (this.currentStatusFilter !== 'all') {
                allRecords = allRecords.filter(r => {
                    // Logic fixed to use paymentsMap correctly
                    const status = (r.status || 'pending').toLowerCase();
                    const filter = this.currentStatusFilter.toLowerCase();

                    const paid = paymentsMap[r.id] || 0;
                    const total = Number(r.total) || 0;
                    const debt = total - paid;
                    const isPaid = debt <= 0.01;

                    if (filter === 'paid') return isPaid; // Ignore status text, trust the money
                    if (filter === 'pending') return !isPaid;

                    return true;
                });
            }

            // Apply Search Filter (if any)
            const searchTerm = document.getElementById('financial-search') ? document.getElementById('financial-search').value.toLowerCase() : '';
            if (searchTerm) {
                allRecords = allRecords.filter(r =>
                    (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm)) ||
                    (r.id && r.id.toLowerCase().includes(searchTerm))
                );
            }

            // Store for details lookup
            this.lastFinancialRecords = allRecords;

            // Sort by Date Descending
            allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            let totalReceivable = 0;
            let totalPaid = 0;
            // 4. Render Main Table
            let html = '';

            // --- NEW: DEBTOR WALLET AGGREGATION ---
            const debtors = {}; // { 'ClientName': { totalDebt: 0, orders: [] } }

            allRecords.forEach(order => {
                const isExpense = order.type === 'expense'; // Defined early
                const paid = paymentsMap[order.id] || 0;
                const total = Number(order.total);
                const debt = total - paid;

                // Only count if debt exists
                if (debt > 0.01 && !isExpense) {
                    const name = order.customer_name || 'Desconhecido';
                    if (!debtors[name]) debtors[name] = { totalDebt: 0, count: 0 };
                    debtors[name].totalDebt += debt;
                    debtors[name].count++;
                }

                if (isExpense) {
                    // Expenses subtract from Cash (if we consider them paid)
                    // Since saveExpense sets status='paid', we assume it's money out.
                    // We directly subtract the expense total from the "Total Paid" (Cash Flow)
                    totalPaid -= total;
                } else {
                    if (debt > 0.01) totalReceivable += debt;
                    totalPaid += paid;
                }

                const isPaid = debt <= 0.01;
                const trClass = isPaid ? 'opacity-50' : '';
                const btnLabel = isPaid ? 'Quitado' : 'Registrar Pagamento';
                const btnClass = isPaid ? 'btn-ghost' : 'btn-primary';
                const isManual = order.isManual || order.id.toString().startsWith('M-') || order.id.toString().startsWith('EXP-');

                const typeBadge = isExpense
                    ? '<span class="status-badge" style="background:#fee2e2;color:#ef4444;">Despesa</span>'
                    : (isManual
                        ? '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;">Avulso</span>'
                        : `<span class="status-badge">${order.status || 'pending'}</span>`);

                // Style logic for Expense
                const rowStyle = isExpense ? 'border-left: 3px solid #ef4444;' : '';
                const amountColor = isExpense ? '#ef4444' : '#1e293b';
                const amountPrefix = isExpense ? '- ' : '';

                // Adjust Debt/Receivable Logic for Expense
                // Expenses are "outputs", so if 'paid' (default), it means money LEFT the account.
                // We don't usually track "receivable" expenses unless it's a debt WE owe.
                // For simplicity: If expense is created, it affects CASH immediately (if paid).
                // If it's pending (unpaid bill), it's a "Account Payable" (Future Feature).
                // Current Implementation assumes Expenses are PAID.

                html += `
            <tr class="${trClass}" style="cursor:pointer; transition:background 0.2s; ${rowStyle}" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'" onclick="adminApp.openOrderDetails('${order.id}')">
                <td style="font-weight:bold;">${isExpense ? '📤' : (isManual ? '📝' : '#')} ${order.id}</td>
                <td>
                    <div style="font-weight:600;">${order.customer_name || (isExpense ? order.description : 'Cliente')}</div>
                    <div style="font-size:0.8rem;color:#64748b;">${new Date(order.date).toLocaleDateString('pt-BR')} ${order.category ? `• ${order.category}` : ''}</div>
                </td>
                <td>${typeBadge}</td>
                <td style="font-weight:700; color:${amountColor};">${amountPrefix}R$ ${total.toFixed(2)}</td>
                <td style="color:#10b981;">R$ ${paid.toFixed(2)}</td>
                <td style="font-weight:700; color:${debt > 0.01 ? '#ef4444' : '#94a3b8'};">R$ ${Math.max(0, debt).toFixed(2)}</td>
                <td onclick="event.stopPropagation()">
                    <button onclick="adminApp.openPaymentModal('${order.id}', ${total}, ${paid})" class="${btnClass}" style="padding:4px 12px; font-size:0.8rem;">
                        ${btnLabel} <i class="ph-bold ph-money"></i>
                    </button>
                    ${isManual ? `
                        <button onclick="adminApp.openEditDebtModal('${order.id}')" style="background:none;border:none;color:#64748b;cursor:pointer;margin-left:5px;" title="Editar"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button onclick="adminApp.deleteManualDebt('${order.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;margin-left:2px;" title="Excluir"><i class="ph-bold ph-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
            `;
            });

            // Render Debtor Wallet Widget
            const walletContainer = document.getElementById('debtor-wallet-widget');
            if (walletContainer) {
                const sortedDebtors = Object.entries(debtors)
                    .sort(([, a], [, b]) => b.totalDebt - a.totalDebt); // Highest debt first

                if (sortedDebtors.length === 0) {
                    walletContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">Ninguém devendo! 🎉</div>`;
                } else {
                    walletContainer.innerHTML = `
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead style="position: sticky; top: 0; background: white;">
                                <tr style="border-bottom: 2px solid #f1f5f9; text-align: left; color: #64748b;">
                                    <th style="padding: 8px;">Cliente</th>
                                    <th style="padding: 8px;">Qtd Pendente</th>
                                    <th style="padding: 8px;">Total Devido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedDebtors.map(([name, data]) => `
                                    <tr style="border-bottom: 1px solid #f8fafc;">
                                        <td style="padding: 8px; font-weight: 600; color: #1e293b;">${name}</td>
                                        <td style="padding: 8px; color: #64748b;">${data.count} itens</td>
                                        <td style="padding: 8px; color: #ef4444; font-weight: 700;">R$ ${data.totalDebt.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                }
            }


            if (allRecords.length === 0) {
                html += `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum registro financeiro.</td></tr>`;
            }

            tbody.innerHTML = html;

            // Big Stats
            const elReceivable = document.getElementById('fin-total-receivable');
            if (elReceivable) elReceivable.innerText = `R$ ${totalReceivable.toFixed(2)}`;

            const elPaid = document.getElementById('fin-total-paid');
            if (elPaid) elPaid.innerText = `R$ ${totalPaid.toFixed(2)}`;

            const elAccount = document.getElementById('fin-total-account');
            if (elAccount) elAccount.innerText = `R$ ${totalAccount.toFixed(2)}`;

            const elCash = document.getElementById('fin-total-cash');
            if (elCash) elCash.innerText = `R$ ${totalCash.toFixed(2)}`;
        } catch (fatalError) {
            console.error("Critical Error in renderFinancial:", fatalError);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ef4444;">
                <i class="ph-bold ph-warning-circle" style="font-size:1.5rem;"></i><br>
                Erro ao carregar dados. Tente recarregar a página.
            </td></tr>`;
        }
    },

    // --- FINANCIAL HISTORY LOGIC ---

    async logFinancialAction(actionType, entityId, description, extraData = {}) {
        if (!window.supabase) return; // Only log if online

        try {
            await window.supabase.from('financial_history').insert({
                action_type: actionType,
                entity_type: 'manual_debt', // Default for now
                entity_id: entityId,
                description: description,
                new_value: extraData
            });
            console.log(`Admin: Action logged (${actionType})`);
        } catch (e) {
            console.error("Admin: Failed to log action", e);
        }
    },

    async openFinancialHistory() {
        // Show Modal
        document.getElementById('modal-financial-history').classList.add('open');
        const tbody = document.getElementById('financial-history-body');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Carregando...</td></tr>';

        if (!window.supabase) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Histórico disponível apenas online.</td></tr>';
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Nenhum histórico encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(log => {
                const date = new Date(log.created_at).toLocaleString('pt-BR');
                let badgeColor = '#64748b';
                let actionLabel = log.action_type;

                if (log.action_type === 'payment') { badgeColor = '#10b981'; actionLabel = 'Pagamento'; }
                if (log.action_type === 'create') { badgeColor = '#3b82f6'; actionLabel = 'Criação'; }
                if (log.action_type === 'delete') { badgeColor = '#ef4444'; actionLabel = 'Exclusão'; }

                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px; font-size:0.9rem; color:#64748b;">${date}</td>
                        <td style="padding:10px;">
                            <span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${actionLabel}</span>
                        </td>
                        <td style="padding:10px; font-size:0.95rem; color:#334155;">${log.description || '-'}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:red;">Erro ao carregar histórico.</td></tr>';
        }
    },

    async filterStatus(status) {
        this.currentStatusFilter = status;

        // Visual Feedback
        document.querySelectorAll('.filter-btn-action, .filter-btn-ghost').forEach(btn => {
            // Check if this button corresponds to the clicked status
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(`'${status}'`)) {
                btn.style.opacity = '1';
                btn.style.boxShadow = '0 0 0 2px #6366f1'; // Focus ring
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.opacity = '0.6';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        });

        this.renderFinancial();
        // Toast feedback
        const map = { 'all': 'Todos', 'pending': 'A Receber', 'paid': 'Pagos' };
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'info', title: `Filtro: ${map[status]}` });
    },

    async openPaymentModal(orderId, total, currentPaid) {
        const remaining = total - currentPaid;

        // Custom HTML for SweetAlert with Radios
        const { value: formValues } = await Swal.fire({
            title: 'Registrar Pagamento',
            html: `
                <div style="text-align:left; font-size:0.9rem; color:#64748b; margin-bottom:15px;">
                    Restante a Receber: <b style="color:#ef4444; font-size:1.1rem;">R$ ${remaining.toFixed(2)}</b>
                </div>

                <div style="margin-bottom:20px; text-align:left;">
                    <label style="display:block; font-weight:600; margin-bottom:5px; color:#334155;">Valor a Pagar (R$)</label>
                    <input id="swal-input-amount" type="number" step="0.01" value="${remaining.toFixed(2)}"
                        style="width:100%; padding:12px; font-size:1.1rem; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border 0.2s;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'">
                </div>

                <label style="display:block; text-align:left; font-weight:600; margin-bottom:10px; color:#334155;">Forma de Pagamento</label>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="pix" checked style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;" 
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-pix-logo" style="color:#22c55e; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Pix</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="cash" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-money" style="color:#16a34a; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Dinheiro</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="credit_card" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-credit-card" style="color:#3b82f6; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Crédito</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="debit_card" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-credit-card" style="color:#64748b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Débito</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="account" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-bank" style="color:#f59e0b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Conta</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="boleto" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-barcode" style="color:#1e293b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Boleto</span>
                        </div>
                    </label>
                </div>
                <style>
                    /* Custom visual selection */
                    input[type="radio"]:checked + div {
                        border-color: #6366f1 !important;
                        background-color: #e0e7ff !important;
                        box-shadow: 0 0 0 2px #6366f1;
                    }
                </style>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            confirmButtonColor: '#10b981',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    amount: document.getElementById('swal-input-amount').value,
                    method: document.querySelector('input[name="swal-method"]:checked').value
                }
            }
        });

        if (formValues && formValues.amount) {
            this.processPayment(orderId, parseFloat(formValues.amount), formValues.method);
        }
    },

    openOrderDetails(orderId) {
        // Find in cached records
        const record = this.lastFinancialRecords ? this.lastFinancialRecords.find(r => r.id === orderId) : null;

        if (!record) {
            Swal.fire('Ops', 'Detalhes não encontrados (tente recarregar).', 'info');
            return;
        }

        const itemsList = record.items && record.items.length
            ? record.items.map(i => `<li>${i.quantity || 1}x ${i.name}</li>`).join('')
            : '<li>' + (record.description || 'Sem descrição') + '</li>';

        Swal.fire({
            title: `Detalhes: #${orderId}`,
            html: `
                <div style="text-align:left; font-size:0.95rem;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
                        <h3 style="margin:0; color:#334155;">${record.customer_name || 'Cliente Desconhecido'}</h3>
                        <p style="margin:0; color:#64748b; font-size:0.85rem;">Data: ${new Date(record.date).toLocaleString()}</p>
                    </div>
                    
                    <p><strong>Itens / Descrição:</strong></p>
                    <ul style="color:#475569; margin-bottom:15px; padding-left:20px;">
                        ${itemsList}
                    </ul>

                    <div style="display:flex; justify-content:space-between; margin-top:15px; font-weight:bold; font-size:1.1rem; border-top:1px solid #e2e8f0; padding-top:10px;">
                        <span>Total:</span>
                        <span style="color:#0f172a;">R$ ${Number(record.total).toFixed(2)}</span>
                    </div>
                    
                     <div style="margin-top:10px; text-align:right;">
                         <span class="status-badge" style="display:inline-block;">${record.status || 'manual'}</span>
                     </div>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#64748b'
        });
    },

    async processPayment(orderId, amount, method = 'account') {
        if (isNaN(amount) || amount <= 0) return;

        if (window.supabase) {
            const { error } = await window.supabase.from('order_payments').insert({
                order_id: orderId,
                amount: amount,
                payment_method: method
            });

            if (error) {
                console.error("Payment Save Error:", error);
                await Swal.fire('Erro', 'Falha ao salvar pagamento no banco.', 'error');
                return;
            }
        } else {
            // Local fallback (legacy)
            const paymentData = JSON.parse(localStorage.getItem('mv_payments') || '{}');
            paymentData[orderId] = (paymentData[orderId] || 0) + amount;
            localStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }

        await Swal.fire({
            icon: 'success',
            title: 'Pagamento Registrado!',
            text: `R$ ${amount.toFixed(2)} entrou em ${method === 'account' ? 'Conta 🏦' : 'Dinheiro 💵'}`,
            timer: 2000,
            showConfirmButton: false
        });

        await this.renderFinancial();

        // Log Action
        this.logFinancialAction('payment', orderId, `Pagamento de R$ ${amount.toFixed(2)} (${method})`);
    },

    openManualDebtModal() {
        document.getElementById('modal-manual-debt').classList.add('open');
        ['manual-debt-client', 'manual-debt-desc', 'manual-debt-total', 'manual-debt-paid', 'manual-debt-edit-id'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        document.querySelector('#modal-manual-debt h3').innerText = '📝 Novo Lançamento';
    },

    openEditDebtModal(id) {
        const record = this.lastFinancialRecords ? this.lastFinancialRecords.find(r => r.id === id) : null;
        if (!record) return;

        document.getElementById('modal-manual-debt').classList.add('open');
        document.querySelector('#modal-manual-debt h3').innerText = '✏️ Editar Lançamento';

        document.getElementById('manual-debt-edit-id').value = record.id;
        document.getElementById('manual-debt-client').value = record.customer_name;
        document.getElementById('manual-debt-desc').value = record.items?.[0]?.name || record.description || '';
        document.getElementById('manual-debt-total').value = record.total;

        // Don't pre-fill paid for edits usually, or calculate it? 
        // For simplicity in edit, let's leave paid logic alone or set it to what it was? 
        // Actually editing payment inputs is complex. Let's just allow editing the DEBT details (Name, Desc, Total).
        // Payments are separate transaction records.
        document.getElementById('manual-debt-paid').value = '';
    },

    async saveManualDebt() {
        const editId = document.getElementById('manual-debt-edit-id').value;
        const client = document.getElementById('manual-debt-client').value;
        const desc = document.getElementById('manual-debt-desc').value;
        const totalVal = document.getElementById('manual-debt-total').value;
        const amount = parseFloat(totalVal);
        const paidVal = parseFloat(document.getElementById('manual-debt-paid').value) || 0;

        // Preserve original date if editing, else new date
        let date = new Date().toISOString();
        if (editId && this.lastFinancialRecords) {
            const original = this.lastFinancialRecords.find(r => r.id === editId);
            if (original) date = original.created_at; // Use created_at from original record
        }

        if (!desc || !client || isNaN(amount)) {
            Swal.fire('Erro', 'Preencha cliente, descrição e valor total.', 'warning');
            return;
        }

        const id = editId || ('manual-' + Date.now());

        const record = {
            id: id,
            customer_name: client,
            description: desc,
            total: amount,
            status: 'pending', // Re-evaluate status based on payments? simpler to leave pending
            created_at: date
        };

        // 1. Save to Cloud (Upsert handles both)
        if (window.supabase) {
            const { error } = await window.supabase.from('financial_records').upsert(record);
            if (error) {
                console.error("Manual Save Error:", error);
                Swal.fire('Atenção', 'Salvo apenas localmente (Erro na Nuvem)', 'warning');
            }
        }

        // 2. Save Local (Backup/Fallback)
        let local = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');

        if (editId) {
            // Update existing
            const index = local.findIndex(o => o.id === editId);
            if (index !== -1) {
                local[index] = {
                    ...local[index],
                    customer_name: record.customer_name,
                    items: [{ name: record.description }],
                    total: record.total,
                    date: record.created_at, // Update date as well
                    status: record.status
                };
            } else {
                // Maybe it was cloud only? Add it locally just in case
                local.push({
                    id: record.id,
                    items: [{ name: record.description }],
                    customer_name: record.customer_name,
                    total: record.total,
                    date: record.created_at,
                    status: record.status
                });
            }
        } else {
            // New Insert
            local.push({
                id: record.id,
                items: [{ name: record.description }], // Adapter for old struct
                customer_name: record.customer_name,
                total: record.total,
                date: record.created_at,
                status: record.status
            });
        }

        localStorage.setItem('mv_manual_orders', JSON.stringify(local));

        // Handle Initial Payment (Only for NEW records usually, or if user adds more)
        // If editing, we generally don't overwrite previous payments via this simple form
        if (!editId && paidVal > 0) {
            const method = document.querySelector('input[name="manual-payment-method"]:checked')?.value || 'account';
            await this.processPayment(id, paidVal, method);
        }

        Swal.fire('Sucesso', editId ? 'Lançamento atualizado!' : 'Lançamento salvo!', 'success');
        this.closeModals();
        this.renderFinancial();
        // Log Action
        this.logFinancialAction(editId ? 'update' : 'create', id, `${editId ? 'Atualização' : 'Novo'} lançamento: ${client} - R$ ${amount.toFixed(2)}`);
    },



    saveManualDebtLocally(id, client, desc, total, paid) {
        const entry = {
            id: id,
            customer_name: client,
            total: total,
            description: desc, // Ensure description is saved
            date: new Date().toISOString(),
            status: 'manual',
            items: [{ name: desc || 'Cobrança Avulsa', quantity: 1 }]
        };
        const manualOrders = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');
        manualOrders.push(entry);
        localStorage.setItem('mv_manual_orders', JSON.stringify(manualOrders));

        // Save Payment locally if needed for basic stats
        if (paid > 0) {
            const paymentData = JSON.parse(localStorage.getItem('mv_payments') || '{}');
            paymentData[id] = (paymentData[id] || 0) + paid;
            localStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }
    },

    toggleManualMethodVisibility() {
        const paid = parseFloat(document.getElementById('manual-debt-paid').value) || 0;
        const row = document.getElementById('manual-method-row');
        if (row) row.style.display = paid > 0 ? 'block' : 'none';
    },
    async logFinancialAction(actionType, entityId, description, extraData = {}) {
        if (!window.supabase) return;
        const user = window.currentUser?.email || 'admin';
        // Fire and forget
        window.supabase.from('financial_history').insert({
            action_type: actionType,
            entity_type: 'financial_record',
            entity_id: entityId,
            description: description,
            changed_by: user,
            old_value: extraData.old ? JSON.stringify(extraData.old) : null,
            new_value: extraData.new ? JSON.stringify(extraData.new) : null
        }).then(({ error }) => {
            if (error) console.error("History Log Error:", error);
        });
    },

    async openFinancialHistory() {
        if (!window.supabase) {
            Swal.fire('Erro', 'Histórico disponível apenas online.', 'info');
            return;
        }

        const modal = document.getElementById('modal-financial-history');
        modal.classList.add('open');
        const tbody = document.getElementById('financial-history-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">⌛ Carregando histórico...</td></tr>';

            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--accent-orange);">Erro ao carregar dados.</td></tr>';
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Nenhum histórico encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(log => `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td><span class="status-badge status-process">${log.action_type.toUpperCase()}</span></td>
                    <td>
                        <div style="font-weight:600; color:var(--text-primary)">${log.description}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary)">👤 ${log.changed_by}</div>
                    </td>
                </tr>
            `).join('');
        }
    },

    async deleteManualDebt(id) {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: "Excluir este lançamento permanentemente?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        // 1. Try Supabase Delete
        if (window.supabase) {
            const { error } = await window.supabase.from('financial_records').delete().eq('id', id);
            if (error) {
                console.error("Cloud Delete Error (ignoring)", error);
            }
            // Clean payments too
            await window.supabase.from('order_payments').delete().eq('order_id', id);
        }

        // 2. ALWAYS Delete Local (Cleanup)
        let manualOrders = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');
        manualOrders = manualOrders.filter(o => o.id !== id);
        localStorage.setItem('mv_manual_orders', JSON.stringify(manualOrders));

        // Cleanup local payments
        const paymentData = JSON.parse(localStorage.getItem('mv_payments') || '{}');
        if (paymentData[id]) {
            delete paymentData[id];
            localStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }

        await Swal.fire('Excluído', 'Lançamento removido.', 'success');
        await this.renderFinancial();
        // Log Action
        this.logFinancialAction('delete', id, `Exclusão de lançamento: ${id}`);
    },



    async syncLocalDataToSupabase() {
        const result = await Swal.fire({
            title: 'Sincronizar com a Nuvem?',
            text: "Isso enviará todos os dados locais (Produtos, Financeiro) para o banco de dados.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, Sincronizar!',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Sincronizando...',
            text: 'Enviando produtos, insumos e financeiro...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const promises = [];

            // 1. Inputs (Insumos)
            const localInputs = JSON.parse(localStorage.getItem('mv_inputs') || '[]');
            if (localInputs.length > 0) {
                const inputPromise = (async () => {
                    for (const item of localInputs) {
                        await window.supabase.from('inventory_items').upsert({
                            id: item.id,
                            name: item.name,
                            supplier: item.supplier,
                            cost: item.cost,
                            unit: item.unit,
                            stock: item.stock || 0
                        });
                    }
                })();
                promises.push(inputPromise);
            }

            // 2. Financial (Financial Records)
            const localManual = JSON.parse(localStorage.getItem('mv_manual_orders') || '[]');
            if (localManual.length > 0) {
                const financialPromise = (async () => {
                    for (const order of localManual) {
                        // Only insert if ID doesn't exist to prevent overwrite of newer cloud data or duplicates
                        const { count } = await window.supabase.from('financial_records').select('id', { count: 'exact', head: true }).eq('id', order.id);
                        if (count === 0) {
                            await window.supabase.from('financial_records').insert({
                                id: order.id,
                                customer_name: order.customer_name,
                                description: order.items[0]?.name,
                                total: order.total,
                                status: order.status,
                                created_at: order.date
                            });
                        }
                    }
                })();
                promises.push(financialPromise);
            }

            // 3. Products (Meus Produtos)
            const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
            if (localProducts.length > 0) {
                const productsPromise = (async () => {
                    for (const p of localProducts) {
                        // Avoid overwrite unless necessary. Upsert by ID.
                        // Need to map structure carefully if local differs from DB
                        await window.supabase.from('products').upsert({
                            id: p.id,
                            name: p.name,
                            category: p.category,
                            price: p.price,
                            cost: p.cost || 0,
                            image: p.image,
                            description: p.description || '',
                            status: p.status || 'active',
                            stock: 100, // Default stock logic if local is simple
                            recipe: p.recipe || []
                        });
                    }
                })();
                promises.push(productsPromise);
            }

            await Promise.all(promises);

            // Optional: Backup local before clearing? Or just keep it as cache?
            // Clearing acts as "migrated".
            localStorage.removeItem('mv_manual_orders');
            // localStorage.removeItem('products'); // Maybe don't clear products yet, as they are master data.

            await Swal.fire({
                icon: 'success',
                title: 'Sincronização Concluída!',
                text: 'Todos os seus dados agora estão seguros na nuvem.'
            });
            window.location.reload();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Falha na sincronização parcial: ' + e.message, 'error');
        }
    },



    async syncBackground(localItems) {
        if (!window.supabase) return;
        console.log("Admin: Attempting background sync...");

        let syncedCount = 0;
        for (const order of localItems) {
            // Check if already in DB
            const { count } = await window.supabase.from('financial_records').select('id', { count: 'exact', head: true }).eq('id', order.id);
            if (count > 0) continue; // Already there

            // Try insert
            const { error } = await window.supabase.from('financial_records').insert({
                id: order.id,
                customer_name: order.customer_name,
                description: order.items[0]?.name,
                total: order.total,
                status: order.status,
                created_at: order.date
            });

            if (!error) syncedCount++;
        }

        if (syncedCount > 0) {
            console.log(`Admin: Background sync successful for ${syncedCount} items.`);
            // Optional: Clean local storage? keeping it for safety for now.
        }
    },

    toggleDebtorWallet() {
        const body = document.getElementById('debtor-wallet-widget');
        const chevron = document.getElementById('wallet-chevron');

        if (body.style.display === 'none') {
            body.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    },

    toggleMinOrder(checkbox) {
        const input = document.getElementById('prod-min-order');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = 1;
            input.style.opacity = '0.5';
        } else {
            input.disabled = false;
            input.style.opacity = '1';
        }
    },

    forceClearChats() {
        if (confirm('Tem certeza que deseja apagar TODAS as conversas?')) {
            localStorage.removeItem('mv_chats');
            alert('Limpo!');
            window.location.reload();
        }
    },

    openExpenseModal() {
        this.closeModals();
        const modal = document.getElementById('modal-expense');
        if (modal) {
            modal.classList.add('open');
            // Reset fields
            document.getElementById('exp-desc').value = '';
            document.getElementById('exp-category').value = '';
            document.getElementById('exp-amount').value = '';
            document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        }
    },

    async saveExpense() {
        const desc = document.getElementById('exp-desc').value;
        const category = document.getElementById('exp-category').value;
        const amountVal = document.getElementById('exp-amount').value;
        const dateVal = document.getElementById('exp-date').value;
        const installmentsStore = document.getElementById('exp-installments');
        const installments = installmentsStore ? parseInt(installmentsStore.value) : 1;

        if (!desc || !amountVal) {
            Swal.fire('Erro', 'Preencha descrição e valor.', 'warning');
            return;
        }

        const amount = parseFloat(amountVal);
        const parentId = 'GRP-' + Date.now(); // Group ID for creating siblings
        const baseDate = dateVal ? new Date(dateVal) : new Date();

        // INSTALLMENT LOOP
        for (let i = 0; i < installments; i++) {
            const currentId = 'EXP-' + Date.now() + '-' + i;

            // Calculate Next Month Date
            const nextDate = new Date(baseDate);
            nextDate.setMonth(baseDate.getMonth() + i);

            // Format Description (e.g. "Notebook 1/12")
            const finalDesc = installments > 1
                ? `${desc} (${i + 1}/${installments})`
                : desc;

            const record = {
                id: currentId,
                description: finalDesc,
                category: category,
                total: (amount / installments).toFixed(2), // Split total or full? Usually user enters TOTAL purchase value.
                // Correction: If user enters 1200 for 12x, it should be 100/mo.
                // Assuming Input is TOTAL value.
                type: 'expense',
                status: 'pending', // Future installments start as pending
                created_at: nextDate.toISOString(),
                installment_number: i + 1,
                installments_total: installments,
                parent_group_id: parentId
            };

            // First installment might be paid if date is today/past? 
            // Let's keep all 'pending' for "Accounts Payable" logic unless user explicitly marks paid.
            // For now, default to 'pending' for safety. Dashboard will show them.
            if (i === 0 && new Date(record.created_at) <= new Date()) {
                record.status = 'paid'; // Assume first one is paid if today
            }

            // Save to Cloud
            if (window.supabase) {
                const { error } = await window.supabase.from('financial_records').insert(record);
                if (error) console.error("Expense Save Error (Installment " + (i + 1) + "):", error);
            }
        }

        Swal.fire('Sucesso', `${installments}x Despesas agendadas!`, 'success');
        this.closeModals();
        this.renderFinancial();
        this.renderFinancialGoals(); // Refresh Goals
        this.logFinancialAction('create', parentId, `Despesa Parcelada: ${desc} (${installments}x)`);
    },

    async renderFinancialGoals() {
        if (!window.supabase) return;
        const container = document.getElementById('goals-container');
        if (!container) return;

        const { data: goals } = await window.supabase.from('financial_goals').select('*');

        if (!goals || goals.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#94a3b8; width:100%; cursor:pointer;" onclick="adminApp.openNewGoalModal()">
                    <i class="ph-duotone ph-plus-circle" style="font-size:2rem; color:#d946ef;"></i><br>
                    Criar sua primeira meta
                </div>`;
            return;
        }

        container.innerHTML = goals.map(g => {
            const percent = Math.min(100, (g.current_amount / g.target_amount) * 100).toFixed(1);
            return `
                <div class="stat-card" style="min-width: 200px; padding: 15px; border-left: 4px solid #d946ef;">
                    <div style="font-size: 0.9rem; font-weight: 600; color: #475569;">${g.name}</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">R$ ${g.current_amount} <span style="font-size:0.8rem; color:#94a3b8;">/ ${g.target_amount}</span></div>
                    <div style="background:#e2e8f0; height:6px; border-radius:3px; margin-top:8px; overflow:hidden;">
                        <div style="background: linear-gradient(90deg, #d946ef, #a855f7); width:${percent}%; height:100%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async openNewGoalModal() {
        const { value: formValues } = await Swal.fire({
            title: 'Nova Meta 🐖',
            html:
                '<input id="swal-goal-name" class="swal2-input" placeholder="Nome (ex: Notebook)">' +
                '<input id="swal-goal-target" type="number" class="swal2-input" placeholder="Valor Alvo (R$)">',
            focusConfirm: false,
            preConfirm: () => {
                return [
                    document.getElementById('swal-goal-name').value,
                    document.getElementById('swal-goal-target').value
                ]
            }
        });

        if (formValues) {
            const [name, target] = formValues;
            if (name && target) {
                await window.supabase.from('financial_goals').insert({
                    name: name,
                    target_amount: target,
                    current_amount: 0
                });
                Swal.fire('Criado!', 'Sua meta foi definida.', 'success');
                this.renderFinancialGoals();
            }
        }
    },

    async logFinancialAction(action, entityId, details) {
        if (!window.supabase) return;
        try {
            await window.supabase.from('financial_history').insert({
                action_type: action,
                entity_type: entityId.startsWith('EXP') ? 'expense' : 'manual_debt',
                entity_id: entityId,
                description: details
            });
        } catch (e) {
            console.error("Log History Error:", e);
        }
    },

    async openFinancialHistory() {
        const modal = document.getElementById('modal-financial-history');
        const tbody = document.getElementById('financial-history-body');
        if (!modal || !tbody) return;

        modal.classList.add('open');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';

        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                tbody.innerHTML = data.map(row => `
                    <tr>
                        <td>${new Date(row.created_at).toLocaleString('pt-BR')}</td>
                        <td>${row.action_type.toUpperCase()}</td>
                        <td>${row.description || '-'}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sem histórico.</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Histórico disponível apenas Online.</td></tr>';
        }
    }
};

// Expose globally
window.adminApp = adminApp;

// Global function for robustness - keeping global link for legacy calls
window.forceClearChats = function () {
    adminApp.forceClearChats();
};

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});


