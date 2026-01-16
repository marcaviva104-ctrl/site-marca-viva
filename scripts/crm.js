/**
 * CRM Manager
 * Handles Customer Data Aggregation & VIP Logic
 */

const CRMManager = {
    // Config
    VIP_THRESHOLD: 1000, // R$ 1000 lifetime value

    async init() {
        // Can be called when switching to 'customers' view
        await this.loadCustomers();
    },

    async loadCustomers() {
        const container = document.getElementById('customers-list-body');
        if (!container) return;

        container.innerHTML = '<tr><td colspan="6" class="text-center">Carregando dados...</td></tr>';

        // 1. Fetch all orders
        const orders = await OrderManager.getAllOrders();

        // 2. Process Data (Group by Email)
        const clients = {};

        orders.forEach(order => {
            const email = order.customer_email || 'Anônimo';
            if (!clients[email]) {
                clients[email] = {
                    name: order.customer_name || 'Cliente',
                    email: email,
                    phone: order.customer_phone || '-',
                    totalSpent: 0,
                    orderCount: 0,
                    lastOrder: null
                };
            }

            clients[email].totalSpent += order.total;
            clients[email].orderCount++;

            // Check recency
            const orderDate = new Date(order.date);
            if (!clients[email].lastOrder || orderDate > clients[email].lastOrder) {
                clients[email].lastOrder = orderDate;
            }
        });

        // 3. Render
        container.innerHTML = '';
        const sortedClients = Object.values(clients).sort((a, b) => b.totalSpent - a.totalSpent);

        if (sortedClients.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        // Smart Tags Logic
        sortedClients.forEach(client => {
            const isVIP = client.totalSpent >= this.VIP_THRESHOLD;
            const cleanPhone = client.phone && client.phone !== '-' ? client.phone.replace(/\D/g, '') : null;
            const whatsappLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';

            const daysSinceLastOrder = client.lastOrder ? Math.floor((new Date() - new Date(client.lastOrder)) / (1000 * 60 * 60 * 24)) : 0;
            let tagsHtml = '';

            if (isVIP) tagsHtml += `<span title="Cliente VIP" style="background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #fcd34d;">👑 Rei</span> `;
            if (daysSinceLastOrder > 45) tagsHtml += `<span title="Ausente há ${daysSinceLastOrder} dias" style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #e2e8f0;">👻 Fantasma</span> `;
            if (client.orderCount === 1 && daysSinceLastOrder < 7) tagsHtml += `<span title="Cliente Novo" style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #bbf7d0;">⚡ Novo</span> `;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="font-weight:600; color:#1e293b; display:flex; align-items:center; gap:8px;">
                        ${client.name}
                        <div style="display:flex; gap:4px;">${tagsHtml}</div>
                    </div>
                    <div style="font-size:0.85rem; color:#64748b;">${client.email}</div>
                </td>
                <td>
                    ${cleanPhone ? `<a href="${whatsappLink}" target="_blank" style="color:#10b981; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:5px;">
                        <i class="ph-bold ph-whatsapp-logo"></i> ${client.phone}
                    </a>` : '-'}
                </td>
                <td>${client.orderCount} pedidos</td>
                <td>
                    <div style="font-weight:700; color:${isVIP ? '#cd7f32' : '#1e293b'};">
                        R$ ${client.totalSpent.toFixed(2)}
                    </div>
                    <small style="color:#94a3b8; font-size:0.7rem;">Última: ${daysSinceLastOrder}d atrás</small>
                </td>
                <td>
                    ${isVIP
                    ? '<span class="status-badge status-paid">💎 VIP</span>'
                    : '<span class="status-badge status-pending">Comum</span>'}
                </td>
                <td>
                    <button class="btn-icon" onclick="CRMManager.openDetails('${client.email}')">
                        <i class="ph-bold ph-squares-four"></i>
                    </button>
                </td>
            `;
            container.appendChild(row);
        });
    },

    async openDetails(userId) {
        // 1. Fetch Profile Data & Orders
        const { data: profile } = await window.supabase.from('profiles').select('*').eq('id', userId).single();
        if (!profile) return Swal.fire('Erro', 'Usuário não encontrado', 'error');

        const allOrders = await OrderManager.getAllOrders();
        const clientOrders = allOrders.filter(o => o.customer_email === profile.email);

        const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
        const orderCount = clientOrders.length;
        const lastOrderDate = clientOrders.length > 0 ? new Date(clientOrders[0].date) : null;
        const daysSince = lastOrderDate ? Math.floor((new Date() - lastOrderDate) / (1000 * 60 * 60 * 24)) : 0;

        // Permissions Check
        const isAdmin = profile.role === 'admin';
        const perms = profile.permissions || [];

        // Helper to check perm
        const has = (p) => perms.includes(p) ? 'checked' : '';

        // 2. Build Bento Grid HTML (Expanded with Admin UI)
        const bentoHtml = `
            <style>
                /* ...Previous Styles... */
                .bento-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
                .bento-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; text-align: center; }
                .bento-card.large { grid-column: 1 / -1; align-items: flex-start; text-align: left; background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; border:none; }
                .bento-stat { font-size: 1.8rem; font-weight: 800; color: #1e293b; }
                .bento-label { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
                
                .admin-section { grid-column: 1 / -1; background: #fff1f2; border: 1px solid #fda4af; padding: 20px; border-radius: 12px; mt-3; text-align: left; }
                .perm-list { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
                .checkbox-wrapper { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #881337; }
            </style>

            <div class="bento-grid">
                <!-- 1. Hero Card -->
                <div class="bento-card large">
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                        <div>
                            <h2 style="margin:0; font-size:1.5rem;">${profile.full_name || 'Usuário'}</h2>
                            <p style="margin:5px 0 0 0; opacity:0.9;">${profile.email}</p>
                            <p style="font-size:0.8rem; opacity:0.7;">CPF: ${profile.cpf || '-'}</p>
                        </div>
                        <div style="font-size:3rem; opacity: ${isAdmin ? '1' : '0.2'};">
                            <i class="ph-fill ph-crown"></i>
                        </div>
                    </div>
                </div>

                <!-- 2. LTV Stats -->
                <div class="bento-card">
                    <div class="bento-stat" style="color: #10b981;">R$ ${totalSpent.toFixed(2)}</div>
                    <div class="bento-label">Total Gasto (LTV)</div>
                </div>

                <!-- 3. Engagement Stats -->
                <div class="bento-card">
                    <div class="bento-stat" style="color: #6366f1;">${orderCount}</div>
                    <div class="bento-label">Pedidos Feitos</div>
                </div>

                <!-- 4. Admin Permissions Zone (Only for You) -->
                <div class="admin-section">
                    <strong style="color: #881337;">🛡️ Gestão de Permissões</strong>
                    <div style="margin-top:10px; border-bottom:1px solid #fda4af; padding-bottom:10px; margin-bottom:10px;">
                        <div class="checkbox-wrapper" style="font-weight:700;">
                            <input type="checkbox" id="role-admin" ${isAdmin ? 'checked' : ''}>
                            Tornar Administrador Global
                        </div>
                    </div>
                    
                    <small>Acesso Granular (Abas):</small>
                    <div class="perm-list">
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="dashboard" ${has('dashboard')}> Dashboard</div>
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="orders" ${has('orders')}> Pedidos</div>
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="products" ${has('products')}> Produtos</div>
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="financial" ${has('financial')}> Financeiro</div>
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="crm" ${has('crm')}> CRM (Clientes)</div>
                        <div class="checkbox-wrapper"><input type="checkbox" class="perm-chk" value="settings" ${has('settings')}> Configs</div>
                    </div>
                </div>

                <!-- 5. Recency (Full Width) -->
                 <div class="bento-card" style="grid-column: 1 / -1; background: white; border-color: #f1f5f9; align-items: flex-start; text-align: left;">
                    <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                        <strong style="color:#334155;">🛒 Últimas Compras</strong>
                        <span style="font-size:0.8rem; color:${daysSince > 30 ? '#ef4444' : '#10b981'};">
                           ${clientOrders.length === 0 ? 'Nunca comprou' : (daysSince === 0 ? 'Comprou Hoje!' : `Há ${daysSince} dias`)}
                        </span>
                    </div>
                    <div style="max-height:150px; overflow-y:auto; width:100%; margin-top:10px;">
                        ${clientOrders.slice(0, 5).map(o => `
                            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:0.85rem;">
                                <span style="font-weight:600;">#${o.id.toString().slice(0, 6)}</span>
                                <span>${new Date(o.date).toLocaleDateString()}</span>
                                <span style="font-weight:700;">R$ ${o.total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        const { isConfirmed } = await Swal.fire({
            html: bentoHtml,
            showConfirmButton: true,
            confirmButtonText: 'Salvar Permissões',
            confirmButtonColor: '#be123c', // Admin red color
            showCloseButton: true,
            width: 800,
            padding: '20px',
            background: '#fff',
            focusConfirm: false
        });

        if (isConfirmed) {
            // Collect Data
            const isAdminChecked = document.getElementById('role-admin').checked;
            const newRole = isAdminChecked ? 'admin' : 'customer';

            const checkboxes = document.querySelectorAll('.perm-chk');
            const newPerms = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);

            // Update Supabase
            const { error } = await window.supabase
                .from('profiles')
                .update({ role: newRole, permissions: newPerms })
                .eq('id', userId);

            if (error) {
                Swal.fire('Erro', 'Falha ao atualizar permissões: ' + error.message, 'error');
            } else {
                Swal.fire('Sucesso', 'Permissões atualizadas!', 'success');
                CRMManager.loadCustomers(); // Reload list
            }
        }
    }
};

window.CRMManager = CRMManager;
