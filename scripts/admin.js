/**
 * Marca Viva - Smart Admin Logic
 * Handles Cost Aggregation, Profit Analysis, and Real-time Publishing
 */

const adminApp = {
    init() {
        this.checkAuth();
        this.bindNav();
        this.renderDashboard();
    },

    checkAuth() {
        // Keeping same flexible auth check
        const user = JSON.parse(localStorage.getItem('marcaViva_session'));
        if (!user || user.role !== 'admin') {
            window.location.href = 'login.html';
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
            });
        });
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    },

    // --- Module 1: Inputs (Insumos) ---
    openInputModal() {
        document.getElementById('modal-input').classList.add('open');
        document.getElementById('input-name').value = '';
        document.getElementById('input-supplier').value = '';
        document.getElementById('input-cost').value = '';
    },

    saveInput() {
        const name = document.getElementById('input-name').value;
        const supplier = document.getElementById('input-supplier').value || 'N/A';
        const cost = parseFloat(document.getElementById('input-cost').value);
        const unit = document.getElementById('input-unit').value;

        if (!name || isNaN(cost)) { alert('Preencha nome e custo!'); return; }

        const input = {
            id: `INS-${Date.now().toString().slice(-5)}`,
            name, supplier, cost, unit
        };
        dataManager.saveInput(input);
        this.closeModals();
        this.renderInputsTable();
    },

    renderInputsTable() {
        const tbody = document.getElementById('inputs-table-body');
        const inputs = dataManager.getInputs();
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
        this.showConfirm('Excluir este insumo?', 'Isso removerá o item do estoque permanentemente.', () => {
            dataManager.deleteInput(id);
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
        const inputs = dataManager.getInputs();
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

    saveProduct() {
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

        dataManager.saveProduct(newProd);
        alert(id ? 'Produto Atualizado com Sucesso!' : 'Produto Publicado com Sucesso!');
        this.closeModals();
        this.renderProductsTable();
        this.updateInventoryBadge();
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
        const products = dataManager.getProducts();
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
        this.showConfirm('Excluir produto?', 'O produto será removido da loja e do painel.', () => {
            dataManager.deleteProduct(id);
            this.renderProductsTable();
        });
    },

    renderDashboard() {
        const m = dataManager.getMetrics();
        document.getElementById('dash-revenue').innerText = `R$ ${m.revenue.toFixed(2)}`;
        document.getElementById('dash-profit').innerText = `R$ ${m.profitEst.toFixed(2)}`;

        // Low Stock Alerts
        const lowStockInputs = dataManager.getLowStockInputs();
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

    saveStockEntry() {
        const inputId = document.getElementById('stock-entry-input-id').value;
        const qty = parseFloat(document.getElementById('stock-entry-qty').value);
        const supplier = document.getElementById('stock-entry-supplier').value;
        const cost = document.getElementById('stock-entry-cost').value;
        const note = document.getElementById('stock-entry-note').value;

        if (!qty || qty <= 0) {
            alert('Informe uma quantidade válida!');
            return;
        }

        const reason = `Entrada de estoque${supplier ? ` - ${supplier}` : ''}${note ? ` (${note})` : ''}`;
        dataManager.adjustStock(inputId, qty, 'entrada', reason);

        this.closeModals();
        this.renderInputsTable();
        this.renderProductsTable(); // Update available stock
        this.renderDashboard();
        this.updateInventoryBadge(); // Update badge
        alert('Entrada registrada com sucesso!');
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

    saveStockAdjust() {
        const inputId = document.getElementById('stock-adjust-input-id').value;
        const qty = parseFloat(document.getElementById('stock-adjust-qty').value);
        const type = document.getElementById('stock-adjust-type').value;
        const reason = document.getElementById('stock-adjust-reason').value;

        if (!qty || qty <= 0) {
            alert('Informe uma quantidade válida!');
            return;
        }

        if (!reason) {
            alert('Informe um motivo para o ajuste!');
            return;
        }

        // Negative quantity for loss/usage
        dataManager.adjustStock(inputId, -qty, type, reason);

        this.closeModals();
        this.renderInputsTable();
        this.renderProductsTable(); // Update available stock
        this.renderDashboard();
        this.updateInventoryBadge(); // Update badge
        alert('Ajuste registrado com sucesso!');
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
    }
};

// Expose to window for inline onclicks
window.adminApp = adminApp;

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
