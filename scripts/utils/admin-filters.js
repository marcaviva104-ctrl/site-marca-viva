// Enhanced filter functions for admin panel

// Store current filters
adminApp.currentFilters = {
    status: 'all',
    search: '',
    dateRange: 'all'
};

// Filter by status (update existing function)
adminApp.filterByStatus = function (status) {
    this.currentFilters.status = status;

    // Update active button
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-status="${status}"]`)?.classList.add('active');

    this.applyAllFilters();
};

// Main filter function (called by search and date inputs)
adminApp.filterOrders = function () {
    const searchValue = document.getElementById('orders-search-input')?.value || '';
    const dateValue = document.getElementById('date-filter-select')?.value || 'all';

    this.currentFilters.search = searchValue.toLowerCase();
    this.currentFilters.dateRange = dateValue;

    this.applyAllFilters();
};

// Clear all filters
adminApp.clearFilters = function () {
    this.currentFilters = {
        status: 'all',
        search: '',
        dateRange: 'all'
    };

    // Reset UI
    document.getElementById('orders-search-input').value = '';
    document.getElementById('date-filter-select').value = 'all';
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-status="all"]')?.classList.add('active');

    this.applyAllFilters();
};

// Apply all filters combined
adminApp.applyAllFilters = function () {
    if (!this.ordersData || !Array.isArray(this.ordersData)) {
        console.log('No orders data to filter');
        return;
    }

    let filteredOrders = [...this.ordersData];

    // Filter by status
    if (this.currentFilters.status !== 'all') {
        filteredOrders = filteredOrders.filter(order =>
            (order.status || 'inquiry') === this.currentFilters.status
        );
    }

    // Filter by search (client name, order ID, notes)
    if (this.currentFilters.search) {
        filteredOrders = filteredOrders.filter(order => {
            const searchStr = this.currentFilters.search;
            const orderId = (order.id || '').toLowerCase();
            const clientName = (order.client_name || 'Cliente').toLowerCase();
            const notes = (order.notes || '').toLowerCase();

            return orderId.includes(searchStr) ||
                clientName.includes(searchStr) ||
                notes.includes(searchStr);
        });
    }

    // Filter by date range
    if (this.currentFilters.dateRange !== 'all') {
        const now = new Date();
        const filterDate = new Date();

        switch (this.currentFilters.dateRange) {
            case 'today':
                filterDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                filterDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                filterDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                filterDate.setFullYear(now.getFullYear());
                filterDate.setMonth(0);
                filterDate.setDate(1);
                break;
        }

        filteredOrders = filteredOrders.filter(order => {
            const orderDate = new Date(order.created_at);
            return orderDate >= filterDate;
        });
    }

    // Render filtered results
    this.renderFilteredTable(filteredOrders);
    this.updateFilteredStats(filteredOrders);
};

// Render table with filtered data
adminApp.renderFilteredTable = function (orders) {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="ph-bold ph-magnifying-glass" style="font-size: 3rem; opacity: 0.3;"></i>
                    <p style="margin-top: 15px; font-size: 1.1rem;">Nenhum pedido encontrado</p>
                    <p style="font-size: 0.9rem;">Tente ajustar os filtros</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const clientName = order.client_name || 'Cliente';
        const date = new Date(order.created_at).toLocaleDateString('pt-BR');
        const total = order.total_amount || 0;
        const statusBadge = this.getStatusBadge(order.status || 'inquiry');
        const paymentBadge = this.getPaymentBadge(order.payment_status || 'pending', order.paid_amount || 0, order.total_amount || 0);

        return `
            <tr>
                <td><strong>${order.id}</strong></td>
                <td>${clientName}</td>
                <td>${date}</td>
                <td>${statusBadge}</td>
                <td style="font-weight: 600;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${paymentBadge}</td>
                <td style="text-align: right;">
                    <div style="display: flex; gap: 5px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="adminApp.viewOrderDetails('${order.id}')" 
                            style="padding: 5px 10px; font-size: 0.8rem;" title="Ver Detalhes">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                        <button class="btn-success" onclick="adminApp.registerPayment('${order.id}')" 
                            style="padding: 5px 10px; font-size: 0.8rem; background: #10b981; color: white;" title="Registrar Pagamento">
                            <i class="ph-bold ph-currency-dollar"></i>
                        </button>
                        <button class="btn-secondary" onclick="adminApp.updateOrderStatus('${order.id}')" 
                            style="padding: 5px 10px; font-size: 0.8rem;" title="Atualizar Status">
                            <i class="ph-bold ph-arrows-clockwise"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

// Update stats with filtered data
adminApp.updateFilteredStats = function (orders) {
    const stats = {
        pending: 0,
        production: 0,
        completed: 0,
        total: orders.length
    };

    orders.forEach(order => {
        const status = order.status || 'inquiry';
        if (status === 'inquiry') stats.pending++;
        else if (status === 'production') stats.production++;
        else if (status === 'delivered' || status === 'completed') stats.completed++;
    });

    document.getElementById('orders-stat-pending').textContent = stats.pending;
    document.getElementById('orders-stat-production').textContent = stats.production;
    document.getElementById('orders-stat-completed').textContent = stats.completed;
    document.getElementById('orders-stat-total').textContent = stats.total;
};
