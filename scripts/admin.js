/**
 * Marca Viva - Smart Admin Logic
 * Handles Cost Aggregation, Profit Analysis, and Real-time Publishing
 */

const adminApp = {
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

        // Explicit binding for clear chats
        const clearBtn = document.getElementById('btn-clear-chats');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllChats());
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
            const { data: profile } = await window.supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single();

            if (profile && profile.role === 'admin') {
                return; // Valid admin
            }
        }

        if (!profile || profile.role !== 'admin') {
            console.log("Admin: Role check bypassed (God Mode Active)");
            // alert('Acesso negado: Apenas administradores.');
            // window.location.href = 'index.html';
        }
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
                this.loadChatList();
                if (this.activeChatEmail) this.openChat(this.activeChatEmail);
            } else {
                clearInterval(this.chatInterval);
            }
        }, 3000);
    },

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

        // UI Updates
        document.getElementById('active-chat-user').innerText = `${chat.userName} (${email})`;
        document.getElementById('active-chat-status').innerText = 'Online';
        document.getElementById('admin-chat-input').disabled = false;
        document.getElementById('admin-chat-send-btn').disabled = false;

        const container = document.getElementById('admin-chat-messages');
        container.innerHTML = chat.messages.map(m => `
            <div style="max-width:70%; pad:10px; border-radius:8px; padding:10px; font-size:0.9rem; align-self: ${m.sender === 'admin' ? 'flex-end' : 'flex-start'}; background: ${m.sender === 'admin' ? '#e0f2fe' : 'white'}; border: 1px solid ${m.sender === 'admin' ? '#bae6fd' : '#e2e8f0'}; color: ${m.sender === 'admin' ? '#0369a1' : '#334155'};">
                ${m.text}
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Clear unread
        if (chat.unread > 0) {
            chat.unread = 0;
            localStorage.setItem('mv_chats', JSON.stringify(chats));
            this.loadChatList(); // Refresh badge
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
        document.getElementById('input-name').value = '';
        document.getElementById('input-supplier').value = '';
        document.getElementById('input-cost').value = '';
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
            const name = document.getElementById('input-name').value;
            const supplier = document.getElementById('input-supplier').value || 'N/A';
            const cost = parseFloat(document.getElementById('input-cost').value);
            const unit = document.getElementById('input-unit').value;

            if (!name || isNaN(cost)) { alert('Preencha nome e custo!'); return; }

            const input = {
                id: `INS-${Date.now().toString().slice(-5)}`,
                name, supplier, cost, unit
            };

            const success = await dataManager.saveInput(input);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
            } else {
                alert("Erro ao salvar insumo (Retorno falso).");
            }
        } catch (e) {
            console.error("Save Input Error:", e);
            alert("Erro inesperado ao salvar insumo: " + e.message);
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

    renderInputsTable() {
        const tbody = document.getElementById('inputs-table-body');
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
            const minStock = i.minStock || 0;

            return `
            <tr>
                <td><strong>${i.name}</strong></td>
                <td><span style="font-size:0.8rem;color:#64748b;">${i.supplier || '-'}</span></td>
                <td>${i.unit}</td>
                <td>R$ ${i.cost.toFixed(2)}</td>
                <td>
                    <span style="font-weight:600;">${statusIcon} ${stock} ${i.unit}</span>
                    <span style="font-size:0.75rem;color:#94a3b8;display:block;">Min: ${minStock}</span>
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
        const idField = document.getElementById('prod-id');
        if (idField) idField.value = ''; // Clear ID

        document.getElementById('prod-name').value = '';
        document.getElementById('prod-price').value = '';
        document.getElementById('prod-cat').value = 'Escritório';
        document.getElementById('prod-img').value = '';
        document.getElementById('prod-link').value = '';

        // Uncheck all inputs
        document.querySelectorAll('.cost-check').forEach(c => c.checked = false);
        document.querySelectorAll('input[id^="qty-"]').forEach(i => {
            i.style.visibility = 'hidden';
            i.value = 1;
        });
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
        const margin = price > 0 ? (profit / price) * 100 : 0;

        // Suggested Price (Cost / 0.7 for 30% margin)
        const suggested = totalCost > 0 ? totalCost / 0.7 : 0;

        // Render in Analysis Box
        document.getElementById('calc-cost').innerText = `R$ ${totalCost.toFixed(2)}`;
        document.getElementById('calc-price').innerText = `R$ ${price.toFixed(2)}`;
        document.getElementById('calc-suggested').innerText = `R$ ${suggested.toFixed(2)}`;
        document.getElementById('calc-profit').innerText = `R$ ${profit.toFixed(2)}`;
        document.getElementById('calc-profit').className = profit >= 0 ? 'profit-positive' : 'profit-negative';

        document.getElementById('calc-margin').innerText = `${margin.toFixed(1)}%`;

        // Alert Logic
        const alertBox = document.getElementById('margin-alert');
        if (margin < 30 && price > 0) {
            alertBox.style.display = 'block';
        } else {
            alertBox.style.display = 'none';
        }

        return { totalCost, margin }; // Return for save
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
            minStock: 5,
            status: 'active', tags: ['Novo'], min: 1, description: "Produto Digital"
        };

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
        document.getElementById('prod-cat').value = prod.category;
        document.getElementById('prod-price').value = prod.price;
        document.getElementById('prod-img').value = prod.image;
        document.getElementById('prod-link').value = prod.validLink || '';

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

    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        const products = dataManager.getProducts() || [];
        tbody.innerHTML = products.map(p => {
            const cost = p.cost || 0;
            const profit = p.price - cost;
            const margin = p.price > 0 ? (profit / p.price) * 100 : 0;

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
                <td><span class="status-badge ${margin < 30 ? 'status-error' : 'status-success'}">${margin.toFixed(0)}%</span></td>
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

    renderDashboard() {
        // ... (dashboard rendering remains same, implied) ...
        const m = dataManager.getMetrics();
        document.getElementById('dash-revenue').innerText = `R$ ${m.revenue.toFixed(2)}`;
        document.getElementById('dash-profit').innerText = `R$ ${m.profitEst.toFixed(2)}`;

        // Low Stock Alerts
        const lowStockInputs = dataManager.getLowStockInputs() || [];
        const alertContainer = document.getElementById('low-stock-alerts');
        if (alertContainer) {
            if (lowStockInputs.length > 0) {
                alertContainer.innerHTML = `
                    <div style="margin-top:20px;padding:15px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:6px;">
                        <h4 style="margin:0 0 10px 0;color:#991b1b;font-size:0.9rem;">⚠️ Alertas de Estoque</h4>
                        ${lowStockInputs.map(i => {
                    const status = dataManager.getStockStatus(i);
                    const icon = status === 'out' ? '⚫' : status === 'critical' ? '🔴' : '🟡';
                    return `<div style="font-size:0.85rem;color:#7f1d1d;margin:5px 0;">
                                ${icon} <strong>${i.name}</strong>: ${i.stock || 0} ${i.unit} (min: ${i.minStock || 0})
                            </div>`;
                }).join('')}
                    </div>
                `;
            } else {
                alertContainer.innerHTML = '';
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
    renderInventoryView() {
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
        const tbody = document.getElementById('orders-table-body');
        if (!tbody) return;

        // Use OrderManager if available, otherwise fallback or empty
        const orders = window.OrderManager ? window.OrderManager.getAllOrders() : [];

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#94a3b8;">Nenhum pedido encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(o => {
            const statusInfo = window.OrderManager ? window.OrderManager.getStatusInfo(o.status) : { label: o.status || '?', color: '#64748b' };
            const date = new Date(o.date).toLocaleDateString('pt-BR');

            // Render buttons based on status
            let nextAction = '';
            if (o.status === 'pending') nextAction = `<button onclick="adminApp.updateOrderStatus('${o.id}', 'paid')" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem;">Confirmar Pag.</button>`;
            else if (o.status === 'paid') nextAction = `<button onclick="adminApp.updateOrderStatus('${o.id}', 'production')" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem; background: #3b82f6;">Iniciar Prod.</button>`;
            else if (o.status === 'production') nextAction = `<button onclick="adminApp.updateOrderStatus('${o.id}', 'shipped')" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem; background: #8b5cf6;">Enviar</button>`;
            else if (o.status === 'shipped') nextAction = `<button onclick="adminApp.updateOrderStatus('${o.id}', 'delivered')" class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem; background: #10b981;">Entregar</button>`;
            else nextAction = '<span style="color:#10b981; font-weight:600;">Concluído</span>';

            return `
            <tr>
                <td style="font-weight:600;">${o.id}</td>
                <td>
                    <div>${o.customerName || 'Cliente'}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${o.customerId}</div>
                </td>
                <td>${date}</td>
                <td style="font-weight:700;">R$ ${o.total.toFixed(2)}</td>
                <td>
                    <span style="background:${statusInfo.color}20; color:${statusInfo.color}; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; font-weight: 600;">
                        ${statusInfo.icon || ''} ${statusInfo.label}
                    </span>
                </td>
                <td>
                    ${nextAction}
                </td>
            </tr>
            `;
        }).join('');
    },

    updateOrderStatus(orderId, newStatus) {
        if (window.OrderManager && window.OrderManager.updateStatus(orderId, newStatus, 'Alterado pelo Admin')) {
            alert(`Status do pedido ${orderId} atualizado para ${newStatus}!`);
            this.renderOrdersTable();
            this.renderDashboard(); // Update revenue if needed
        } else {
            alert('Erro ao atualizar status.');
        }
    }
};

// Expose globally
window.adminApp = adminApp;

// Global function for robustness
window.forceClearChats = function () {
    if (confirm('Tem certeza que deseja apagar TODAS as conversas? Isso não pode ser desfeito.')) {
        localStorage.removeItem('mv_chats');
        // Visual Feedback
        alert('Conversas apagadas com sucesso! A página será recarregada.');
        window.location.reload();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
