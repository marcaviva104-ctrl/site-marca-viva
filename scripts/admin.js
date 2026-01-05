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
        tbody.innerHTML = inputs.map(i => `
            <tr>
                <td><strong>${i.name}</strong></td>
                <td><span style="font-size:0.8rem;color:#64748b;">${i.supplier || '-'}</span></td>
                <td>${i.unit}</td>
                <td>R$ ${i.cost.toFixed(2)}</td>
                <td><button onclick="adminApp.deleteInput('${i.id}')" style="color:red;border:none;background:none;cursor:pointer;"><i class="ph-bold ph-trash"></i></button></td>
            </tr>
        `).join('');
    },

    deleteInput(id) {
        if (confirm('Apagar este insumo?')) {
            dataManager.deleteInput(id);
            this.renderInputsTable();
        }
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

        const newProd = {
            id: id ? id : `MV-${Date.now().toString().slice(-4)}`, // Reuse ID if editing
            name, category: cat, price, cost: totalCost, image: img, validLink: link,
            status: 'active', tags: ['Novo'], min: 1, description: "Produto Digital"
        };

        dataManager.saveProduct(newProd);
        alert(id ? 'Produto Atualizado com Sucesso!' : 'Produto Publicado com Sucesso!');
        this.closeModals();
        this.renderProductsTable();
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

        // Note: We don't restore checked inputs yet (requires storing them in DB).
        // But we DO recalculate profit based on the inputs the user MIGHT select now.
        this.calculateProfit();
    },

    renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        const products = dataManager.getProducts();
        tbody.innerHTML = products.map(p => {
            const cost = p.cost || 0;
            const profit = p.price - cost;
            const margin = p.price > 0 ? (profit / p.price) * 100 : 0;

            return `
            <tr>
                <td>
                    <div style="font-weight:600;">${p.name}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${p.category}</div>
                </td>
                <td>R$ ${cost.toFixed(2)}</td>
                <td>R$ ${p.price.toFixed(2)}</td>
                <td><span class="status-badge ${margin < 30 ? 'status-error' : 'status-success'}">${margin.toFixed(0)}%</span></td>
                <td style="font-weight:700; color: ${profit >= 0 ? '#10b981' : '#ef4444'}">R$ ${profit.toFixed(2)}</td>
                <td>
                    <button onclick="adminApp.editProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:#0ea5e9;margin-right:10px;"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="adminApp.deleteProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:red;"><i class="ph-bold ph-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    },

    deleteProd(id) {
        if (confirm('Excluir produto e retirar da loja?')) {
            dataManager.deleteProduct(id);
            this.renderProductsTable();
        }
    },

    renderDashboard() {
        const m = dataManager.getMetrics();
        document.getElementById('dash-revenue').innerText = `R$ ${m.revenue.toFixed(2)}`;
        document.getElementById('dash-profit').innerText = `R$ ${m.profitEst.toFixed(2)}`;
    }
};

// Expose to window for inline onclicks
window.adminApp = adminApp;

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});
