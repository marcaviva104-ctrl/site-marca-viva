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

        // 1. Fetch ALL Profiles (Base of Truth)
        const { data: profiles, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("CRM Load Error:", error);
            container.innerHTML = '<tr><td colspan="6" class="text-center" style="color:red">Erro ao carregar usuários.</td></tr>';
            return;
        }

        // 2. Fetch all orders for stats
        const orders = await OrderManager.getAllOrders();

        // 3. Merge Data
        const clients = {};

        // Initialize from Profiles
        profiles.forEach(p => {
            const email = (p.email || '').toLowerCase();
            clients[email] = {
                id: p.id,
                name: p.full_name || 'Usuário',
                email: p.email,
                phone: p.phone || '-',
                totalSpent: 0,
                orderCount: 0,
                lastOrder: null,
                approved: p.approved, // Important for UI
                role: p.role
            };
        });

        // Enrich with Orders
        orders.forEach(order => {
            const email = (order.customer_email || '').toLowerCase();
            // If user exists in profiles, update stats. If not (guest checkout?), add them.
            if (!clients[email]) {
                clients[email] = {
                    id: null,
                    name: order.customer_name || 'Cliente (Guest)',
                    email: email,
                    phone: order.customer_phone || '-',
                    totalSpent: 0,
                    orderCount: 0,
                    lastOrder: null,
                    approved: true, // Guests technically don't have login blocks usually
                    role: 'guest'
                };
            }

            clients[email].totalSpent += order.total;
            clients[email].orderCount++;

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
                    : (client.approved === false
                        ? '<span class="status-badge" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca;">⏳ Pendente</span>'
                        : '<span class="status-badge status-pending" style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">✅ Ativo</span>')
                }
                </td>
                <td>
                    ${client.id ? `
                        <button class="btn-icon" onclick="CRMManager.openDetails('${client.id}')" title="Ver Detalhes">
                            <i class="ph-bold ph-squares-four"></i>
                        </button>
                    ` : `
                        <button class="btn-icon" disabled style="opacity:0.3; cursor:not-allowed;" title="Sem cadastro (Guest)">
                            <i class="ph-bold ph-user-minus"></i>
                        </button>
                    `}
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

        const bentoHtml = `
            <div style="font-family: 'Inter', sans-serif; text-align: left;">
                
                <!-- HERO -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div>
                        <h2 style="margin:0; font-size: 1.5rem; font-weight: 700;">${profile.full_name || 'Usuário'}</h2>
                        <div style="opacity: 0.9; font-size: 0.9rem; margin-top: 4px;">${profile.email}</div>
                        <div style="background: rgba(255,255,255,0.2); font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">
                            CPF: ${profile.cpf || '-'}
                        </div>
                    </div>
                    <div style="font-size: 2.5rem; opacity: ${isAdmin ? 1 : 0.3};">
                        <i class="ph-fill ph-crown"></i>
                    </div>
                </div>

                <!-- STATS ROW -->
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                        <div style="font-size: 1.4rem; font-weight: 800; color: #10b981;">R$ ${totalSpent.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Gasto</div>
                    </div>
                    <div style="flex: 1; background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; text-align: center;">
                        <div style="font-size: 1.4rem; font-weight: 800; color: #6366f1;">${orderCount}</div>
                        <div style="font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase;">Pedidos</div>
                    </div>
                </div>

                <!-- ACTIONS AREA -->
                <div style="background: #fff1f2; border: 1px solid #fda4af; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #881337; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-shield-check"></i> Controle de Acesso
                    </h4>

                    <!-- BIG APPROVE BUTTON -->
                    <div onclick="document.getElementById('user-approved').click()" style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                        <input type="checkbox" id="user-approved" ${profile.approved ? 'checked' : ''} style="transform: scale(1.5); cursor: pointer;">
                        <div>
                            <div style="color: #065f46; font-weight: 700; font-size: 1rem;">✅ Cadastro Aprovado</div>
                            <div style="color: #059669; font-size: 0.8rem;">Permitir que faça login e compras</div>
                        </div>
                    </div>

                    <!-- ADMIN TOGGLE -->
                    <div onclick="document.getElementById('role-admin').click()" style="background: white; border: 1px solid #fda4af; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 15px; cursor: pointer;" onmouseover="this.style.background='#fff1f2'" onmouseout="this.style.background='white'">
                        <input type="checkbox" id="role-admin" ${isAdmin ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;">
                        <div>
                            <div style="color: #881337; font-weight: 700; font-size: 0.95rem;">👑 Admin Global</div>
                            <div style="color: #9f1239; font-size: 0.8rem;">Acesso total ao sistema (Cuidado)</div>
                        </div>
                    </div>

                    <div style="margin: 15px 0; height: 1px; background: #fecdd3;"></div>
                    
                    <!-- PERMISSIONS GRID -->
                    <div style="font-size: 0.85rem; color: #881337; font-weight: 700; margin-bottom: 10px;">Permissões Específicas:</div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        ${renderPermToggle('dashboard', 'Dashboard', 'Ver gráficos e resumos', has('dashboard'))}
                        ${renderPermToggle('orders', 'Pedidos', 'Gerenciar vendas e envios', has('orders'))}
                        ${renderPermToggle('products', 'Produtos', 'Editar preços e estoque', has('products'))}
                        ${renderPermToggle('financial', 'Financeiro', 'Ver lucro e caixa', has('financial'))}
                        ${renderPermToggle('crm', 'Clientes', 'Ver lista de clientes', has('crm'))}
                        ${renderPermToggle('settings', 'Configs', 'Ajustes da loja', has('settings'))}
                    </div>
                </div>

                <!-- ORDERS LIST -->
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 0;">
                    <div style="padding: 12px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-radius: 12px 12px 0 0; font-weight: 700; color: #334155;">
                        🛒 Últimas Compras
                    </div>
                    <div style="padding: 10px 15px; max-height: 150px; overflow-y: auto;">
                         ${clientOrders.length === 0 ?
                '<p style="text-align:center; color:#94a3b8; font-size:0.9rem; margin:10px 0;">Nenhum pedido encontrado.</p>' :
                clientOrders.slice(0, 5).map(o => `
                            <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem;">
                                <span>#${o.id.toString().slice(0, 6)}</span>
                                <span style="font-weight: 600;">R$ ${o.total.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>

            </div>
        `;

        // Helper for cleaner HTML
        function renderPermToggle(val, label, desc, checkedState) {
            return `
            <div onclick="this.querySelector('input').click()" style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; display: flex; align-items: start; gap: 8px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#cbd5e1'" onmouseout="this.style.borderColor='#e2e8f0'">
               <input type="checkbox" class="perm-chk" value="${val}" ${checkedState} style="margin-top: 3px;">
               <div>
                   <div style="font-weight: 600; font-size: 0.85rem; color: #1e293b;">${label}</div>
                   <div style="font-size: 0.7rem; color: #64748b; line-height: 1.2;">${desc}</div>
               </div>
            </div>`;
        }

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
            const isApprovedChecked = document.getElementById('user-approved').checked;
            const newRole = isAdminChecked ? 'admin' : 'customer';

            const checkboxes = document.querySelectorAll('.perm-chk');
            const newPerms = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);

            // Update Supabase
            const { error } = await window.supabase
                .from('profiles')
                .update({
                    role: newRole,
                    approved: isApprovedChecked,
                    permissions: newPerms
                })
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
