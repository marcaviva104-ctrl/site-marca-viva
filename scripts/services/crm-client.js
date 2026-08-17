/**
 * CRM Manager
 * Handles Customer Data Aggregation & VIP Logic
 */

const CRMManager = {
    // Config
    VIP_THRESHOLD: 1000, // R$ 1000 lifetime value
    allClients: [], // Local cache for filtering
    page: 0,
    pageSize: 50,

    async init() {
        // Can be called when switching to 'customers' view
        await this.loadCustomers();
    },

    // Antes buscava TODOS os profiles + TODOS os protocols (com itens de
    // cada pedido) e somava gasto/contagem no navegador — sem limite,
    // crescendo pra sempre a cada pedido novo no sistema. A view
    // customer_stats (database/migrations/updates/add_customer_stats_view.sql)
    // já entrega uma linha por cliente com os totais prontos.
    async loadCustomers() {
        const container = document.getElementById('customers-list-body');
        if (!container) return;

        container.innerHTML = '<tr><td colspan="6" class="text-center">Carregando dados...</td></tr>';

        const { data, error } = await window.supabase
            .from('customer_stats')
            .select('*')
            .order('total_spent', { ascending: false });

        if (error) {
            console.error("CRM Load Error:", error);
            container.innerHTML = '<tr><td colspan="6" class="text-center" style="color:red">Erro ao carregar usuários.</td></tr>';
            return;
        }

        const sortedClients = (data || []).map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            totalSpent: Number(c.total_spent) || 0,
            orderCount: c.order_count || 0,
            lastOrder: c.last_order ? new Date(c.last_order) : null,
            approved: c.approved,
            role: c.role,
            cpf: c.cpf || '',
            cnpj: c.cnpj || '',
            personType: c.person_type || 'pf'
        }));

        this.allClients = sortedClients; // Save to cache
        this.page = 0;
        this.renderList(sortedClients);
    },

    filterCustomers() {
        const query = (document.getElementById('customer-search').value || '').toLowerCase();
        const type = (document.getElementById('customer-type-filter') || { value: 'all' }).value;

        const filtered = this.allClients.filter(c => {
            // 1. Text Search
            const digits = query.replace(/\D/g, '');
            const matchesText = !query ||
                c.name.toLowerCase().includes(query) ||
                c.email.toLowerCase().includes(query) ||
                (digits && c.phone && c.phone.replace(/\D/g, '').includes(digits)) ||
                (digits && c.cpf && c.cpf.replace(/\D/g, '').includes(digits)) ||
                (digits && c.cnpj && c.cnpj.replace(/\D/g, '').includes(digits));

            // 2. Type Filter (PJ vs PF)
            // Vale o person_type do cadastro; o CNPJ preenchido serve de
            // reforço para fichas antigas que não têm o tipo definido.
            let matchesType = true;
            if (type !== 'all') {
                const isPJ = c.personType === 'pj' || !!(c.cnpj && c.cnpj.trim());

                if (type === 'pj') matchesType = isPJ;
                if (type === 'pf') matchesType = !isPJ;
            }

            // 3. Filtro de pendentes (fila de liberação de empresas)
            let matchesPending = true;
            if (type === 'pending') {
                matchesType = true;
                matchesPending = c.approved === false;
            }

            return matchesText && matchesType && matchesPending;
        });

        this.page = 0; // busca/filtro novo: volta pra primeira página
        this.currentVisibleClients = filtered;
        this.renderList(filtered);
    },

    nextPage() {
        this.page = (this.page || 0) + 1;
        this.renderList(this.currentVisibleClients || this.allClients);
    },

    prevPage() {
        this.page = Math.max(0, (this.page || 0) - 1);
        this.renderList(this.currentVisibleClients || this.allClients);
    },

    updatePagerUi(totalFiltered) {
        const label = document.getElementById('customers-page-label');
        const prevBtn = document.getElementById('customers-prev-page');
        const nextBtn = document.getElementById('customers-next-page');
        if (!label && !prevBtn && !nextBtn) return;

        const pageSize = this.pageSize || 50;
        const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
        const page = this.page || 0;

        if (label) label.textContent = `Página ${page + 1} de ${totalPages} (${totalFiltered} cliente(s))`;
        if (prevBtn) prevBtn.disabled = page <= 0;
        if (nextBtn) nextBtn.disabled = page + 1 >= totalPages;
    },

    exportWhatsAppList() {
        const listToExport = this.currentVisibleClients || this.allClients;
        const validPhones = [];

        listToExport.forEach(c => {
            if (c.phone && c.phone !== '-') {
                const digits = c.phone.replace(/\D/g, '');
                if (digits.length >= 10) validPhones.push(digits);
            }
        });

        if (validPhones.length === 0) {
            Swal.fire('Vazio', 'Nenhum contato com telefone válido na lista atual.', 'info');
            return;
        }

        const numbersText = validPhones.join('\n');

        Swal.fire({
            title: 'Contatos WhatsApp',
            html: `
                <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 15px;">
                    Encontrados <b>${validPhones.length}</b> números na sua pesquisa atual.
                </p>
                <textarea id="whatsapp-bulk-list" style="width: 100%; height: 150px; padding: 10px; font-family: monospace; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 8px;" readonly>${numbersText}</textarea>
            `,
            showCancelButton: true,
            confirmButtonText: 'Copiar Lista',
            cancelButtonText: 'Fechar',
            confirmButtonColor: '#10b981'
        }).then((result) => {
            if (result.isConfirmed) {
                const textArea = document.getElementById('whatsapp-bulk-list');
                textArea.select();
                document.execCommand('copy');
                Swal.fire('Copiado!', 'Lista copiada para a área de transferência.', 'success');
            }
        });
    },

    renderList(list) {
        const container = document.getElementById('customers-list-body');
        const countBadge = document.getElementById('customer-count');

        if (countBadge) {
            // Empresas aguardando liberação aparecem sempre, mesmo que o
            // filtro atual as esconda — senão a fila passa despercebida.
            const pending = (this.allClients || []).filter(c => c.approved === false).length;

            countBadge.innerHTML = `${list.length} clientes`
                + (pending
                    ? ` <span style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; padding:2px 8px; border-radius:999px; font-size:0.8rem; margin-left:6px;">⏳ ${pending} aguardando liberação</span>`
                    : '');
        }

        // Pagina só a exibição — busca/filtro/exportação continuam olhando
        // pra lista inteira (list), só a montagem de <tr> é fatiada.
        const pageSize = this.pageSize || 50;
        const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
        this.page = Math.min(this.page || 0, totalPages - 1);
        const pageStart = this.page * pageSize;
        const pageList = list.slice(pageStart, pageStart + pageSize);
        this.updatePagerUi(list.length);

        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum cliente encontrado.</td></tr>';
            return;
        }

        // Fetch Dynamic Settings — loadSettings() é async, e renderList() é chamado
        // de forma síncrona (a cada tecla do filtro), então lemos do cache local que
        // o próprio SettingsManager mantém atualizado em vez de chamar loadSettings()
        // sem await (o que retornaria a Promise em vez dos dados).
        const cachedSettings = JSON.parse(localStorage.getItem('mv_store_settings') || '{}');
        const vipThreshold = cachedSettings.crmVipThreshold || 1000;
        const ghostDays = cachedSettings.crmGhostDays || 45;

        // Smart Tags Logic
        pageList.forEach(client => {
            const isVIP = client.totalSpent >= vipThreshold;
            const cleanPhone = client.phone && client.phone !== '-' ? client.phone.replace(/\D/g, '') : null;
            const whatsappLink = cleanPhone ? `https://wa.me/55${cleanPhone}` : '#';

            const daysSinceLastOrder = client.lastOrder ? Math.floor((new Date() - new Date(client.lastOrder)) / (1000 * 60 * 60 * 24)) : 0;
            let tagsHtml = '';

            if (isVIP) tagsHtml += `<span title="Cliente VIP" style="background:#fef3c7; color:#d97706; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #fcd34d;">👑 Rei</span> `;
            if (daysSinceLastOrder > ghostDays) tagsHtml += `<span title="Ausente há ${daysSinceLastOrder} dias" style="background:#f1f5f9; color:#64748b; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #e2e8f0;">👻 Fantasma</span> `;
            if (client.orderCount === 1 && daysSinceLastOrder < 7) tagsHtml += `<span title="Cliente Novo" style="background:#dcfce7; color:#166534; padding:2px 6px; border-radius:6px; font-size:0.75rem; border:1px solid #bbf7d0;">⚡ Novo</span> `;

            const row = document.createElement('tr');
            row.style.verticalAlign = 'middle';

            row.innerHTML = `
                <td style="vertical-align: middle;">
                    <div style="font-weight:600; color:#1e293b; display:flex; align-items:center; gap:8px;">
                        ${client.name}
                        <div style="display:flex; gap:4px;">${tagsHtml}</div>
                    </div>
                    <div style="font-size:0.85rem; color:#64748b;">${client.email}</div>
                    ${client.cpf ? `<div style="font-size:0.7rem; color:#94a3b8;">${client.cpf}</div>` : ''}
                </td>
                <td style="vertical-align: middle;">
                    ${cleanPhone ? `<a href="${whatsappLink}" target="_blank" style="color:#10b981; font-weight:600; text-decoration:none; display:flex; align-items:center; gap:5px;">
                        <i class="ph-bold ph-whatsapp-logo"></i> <span style="font-size:0.9rem">${client.phone}</span>
                    </a>` : '<span style="color:#cbd5e1">-</span>'}
                </td>
                <td style="vertical-align: middle;">${client.orderCount} pedidos</td>
                <td style="vertical-align: middle;">
                    <div style="font-weight:700; color:${isVIP ? '#cd7f32' : '#1e293b'};">
                        R$ ${client.totalSpent.toFixed(2)}
                    </div>
                    <small style="color:#94a3b8; font-size:0.7rem;">Última: ${daysSinceLastOrder}d atrás</small>
                </td>
                <td style="vertical-align: middle;">
                    ${isVIP
                    ? '<span class="status-badge status-paid">💎 VIP</span>'
                    : (client.approved === false
                        ? '<span class="status-badge" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; min-width:100px; justify-content:center;">⏳ Pendente</span>'
                        : '<span class="status-badge status-pending" style="background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; min-width:100px; justify-content:center;">✅ Ativo</span>')
                }
                </td>
                <td style="vertical-align: middle;">
                    ${client.id ? `
                        <button class="btn-icon" onclick="CRMManager.editCustomerProfile('${client.id}')" title="Editar Ficha" style="color:#0ea5e9; border: 1px solid #bae6fd; background: #e0f2fe; margin-right: 5px;">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
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
                        
                        <div style="display:flex; gap: 10px; margin-top: 12px;">
                            <div style="font-size: 0.8rem; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items:center; gap:6px;">
                                <i class="ph-bold ph-identification-card"></i>
                                ${profile.cpf || 'CPF não inf.'}
                            </div>
                            <div style="font-size: 0.8rem; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; display: inline-flex; align-items:center; gap:6px;">
                                <i class="ph-bold ph-whatsapp-logo"></i>
                                ${profile.phone || 'Tel não inf.'}
                            </div>
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
                    <label style="background: white; border: 2px solid #10b981; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; gap: 15px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='white'">
                        <input type="checkbox" id="user-approved" ${profile.approved ? 'checked' : ''} style="transform: scale(1.5); cursor: pointer;">
                        <div>
                            <div style="color: #065f46; font-weight: 700; font-size: 1rem;">✅ Cadastro Aprovado</div>
                            <div style="color: #059669; font-size: 0.8rem;">Permitir que faça login e compras</div>
                        </div>
                    </label>

                    <!-- ADMIN TOGGLE -->
                    <label style="background: white; border: 1px solid #fda4af; border-radius: 8px; padding: 10px; display: flex; align-items: center; gap: 15px; cursor: pointer;" onmouseover="this.style.background='#fff1f2'" onmouseout="this.style.background='white'">
                        <input type="checkbox" id="role-admin" ${isAdmin ? 'checked' : ''} style="transform: scale(1.3); cursor: pointer;">
                        <div>
                            <div style="color: #881337; font-weight: 700; font-size: 0.95rem;">👑 Admin Global</div>
                            <div style="color: #9f1239; font-size: 0.8rem;">Acesso total ao sistema (Cuidado)</div>
                        </div>
                    </label>

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

                <!-- ADMIN NOTES -->
                <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #b45309; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        <i class="ph-bold ph-notebook"></i> Notas Privadas (Admin)
                    </h4>
                    <p style="font-size: 0.75rem; color: #d97706; margin-top: 0; margin-bottom: 10px;">Anotações secretas sobre preferências, pendências ou alertas.</p>
                    <textarea id="admin-notes-area" placeholder="Digite sua nota secreta aqui..." style="width: 100%; height: 80px; padding: 12px; border: 1px solid #fcd34d; border-radius: 8px; resize: vertical; font-family: 'Inter', sans-serif; font-size: 0.9rem; background: white; color: #451a03;">${profile.admin_notes || ''}</textarea>
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

            const adminNotes = document.getElementById('admin-notes-area') ? document.getElementById('admin-notes-area').value : '';

            // Update Supabase
            const { error } = await window.supabase
                .from('profiles')
                .update({
                    role: newRole,
                    approved: isApprovedChecked,
                    permissions: newPerms,
                    admin_notes: adminNotes
                })
                .eq('id', userId);

            if (error) {
                console.error("ERRO AO SALVAR:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Falha ao Salvar',
                    text: 'O banco de dados recusou a alteração. Erro: ' + (error.message || error),
                    footer: 'Tente rodar o script de desbloqueio (UNLOCK) novamente.'
                });
            } else {
                Swal.fire({
                    icon: 'success',
                    title: 'Atualizado!',
                    text: 'A permissão foi salva com sucesso.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    // Force reload to guarantee UI matches Database
                    window.location.reload();
                });
            }
        }
    },

    async triggerPasswordReset(email) {
        if (!email) return;
        try {
            Swal.showLoading();
            const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/pages/profile.html',
            });
            if (error) throw error;
            Swal.fire('Email Enviado!', `O link de recuperação foi enviado para <b>${email}</b>.`, 'success');
        } catch (e) {
            Swal.fire('Erro', e.message || 'Falha ao enviar email', 'error');
        }
    },

    async editCustomerProfile(userId) {
        try {
            Swal.fire({ title: 'Carregando dados...', didOpen: () => Swal.showLoading() });

            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error || !profile) throw new Error("Usuário não encontrado");

            const addr = typeof profile.address === 'string' ? JSON.parse(profile.address) : (profile.address || {});

            const formHtml = `
                <div style="text-align: left; font-size: 0.9rem;">
                    <div style="margin-bottom: 20px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:700; color:#1e293b; font-size:1.1rem;">Editar Cliente</div>
                            <div style="color:#64748b; font-size:0.8rem;">ID: ${userId.slice(0, 8)}...</div>
                        </div>
                        <button type="button" onclick="CRMManager.triggerPasswordReset('${profile.email}')" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:6px 12px; border-radius:6px; font-weight:600; color:#475569; cursor:pointer; font-size:0.8rem; display:flex; gap:5px; align-items:center;">
                            <i class="ph-bold ph-key"></i> Enviar Reset de Senha
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom:15px;">
                        <div>
                            <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Nome Completo</label>
                            <input id="swal-edit-name" class="modal-input" placeholder="Ex: João Silva" value="${profile.full_name || ''}">
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">CPF</label>
                            <input id="swal-edit-cpf" class="modal-input" placeholder="000.000.000-00" value="${profile.cpf || ''}">
                        </div>
                    </div>

                    <div style="margin-bottom:15px;">
                        <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Telefone (WhatsApp)</label>
                        <input id="swal-edit-phone" class="modal-input" placeholder="(11) 99999-9999" value="${profile.phone || ''}">
                    </div>

                    <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:8px; margin-top:20px;">
                        <div style="font-weight:700; color:#334155; margin-bottom:15px; display:flex; align-items:center; gap:5px;">
                            <i class="ph-bold ph-map-pin"></i> Endereço
                        </div>
                        
                        <div style="margin-bottom:10px;">
                            <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">CEP</label>
                            <input id="swal-edit-zip" class="modal-input" placeholder="Apenas números" value="${addr.zip || ''}" maxlength="8" style="width: 150px;">
                        </div>

                        <div style="display: grid; grid-template-columns: 3fr 1fr; gap: 10px; margin-bottom:10px;">
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Logradouro (Rua)</label>
                                <input id="swal-edit-street" class="modal-input" value="${addr.street || ''}">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Número</label>
                                <input id="swal-edit-num" class="modal-input" value="${addr.number || ''}">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom:10px;">
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Complemento</label>
                                <input id="swal-edit-comp" class="modal-input" value="${addr.complement || ''}">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Bairro</label>
                                <input id="swal-edit-neigh" class="modal-input" value="${addr.neighborhood || ''}">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 3fr 1fr; gap: 10px;">
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">Cidade</label>
                                <input id="swal-edit-city" class="modal-input" value="${addr.city || ''}">
                            </div>
                            <div>
                                <label style="display:block; margin-bottom:5px; color:#475569; font-weight:600;">UF</label>
                                <input id="swal-edit-state" class="modal-input" maxlength="2" style="text-transform:uppercase;" value="${addr.state || ''}">
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const { value: formValues } = await Swal.fire({
                html: formHtml,
                focusConfirm: false,
                showCancelButton: true,
                cancelButtonText: 'Cancelar',
                confirmButtonText: 'Salvar Alterações',
                confirmButtonColor: '#0ea5e9',
                width: 600,
                didOpen: () => {
                    const zipInput = document.getElementById('swal-edit-zip');
                    zipInput.addEventListener('blur', async () => {
                        const cep = zipInput.value.replace(/\D/g, '');
                        if (cep.length === 8) {
                            try {
                                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                                const data = await res.json();
                                if (!data.erro) {
                                    document.getElementById('swal-edit-street').value = data.logradouro || '';
                                    document.getElementById('swal-edit-neigh').value = data.bairro || '';
                                    document.getElementById('swal-edit-city').value = data.localidade || '';
                                    document.getElementById('swal-edit-state').value = data.uf || '';
                                    document.getElementById('swal-edit-num').focus();
                                }
                            } catch (e) { }
                        }
                    });
                },
                preConfirm: () => {
                    return {
                        full_name: document.getElementById('swal-edit-name').value,
                        cpf: document.getElementById('swal-edit-cpf').value,
                        phone: document.getElementById('swal-edit-phone').value,
                        address: {
                            zip: document.getElementById('swal-edit-zip').value,
                            street: document.getElementById('swal-edit-street').value,
                            number: document.getElementById('swal-edit-num').value,
                            complement: document.getElementById('swal-edit-comp').value,
                            neighborhood: document.getElementById('swal-edit-neigh').value,
                            city: document.getElementById('swal-edit-city').value,
                            state: document.getElementById('swal-edit-state').value.toUpperCase()
                        }
                    }
                }
            });

            if (formValues) {
                Swal.fire({ title: 'Salvando...', didOpen: () => Swal.showLoading() });
                const { error: updateError } = await window.supabase
                    .from('profiles')
                    .update({
                        full_name: formValues.full_name,
                        cpf: formValues.cpf,
                        phone: formValues.phone,
                        address: formValues.address,
                        updated_at: new Date()
                    })
                    .eq('id', userId);

                if (updateError) throw updateError;

                Swal.fire('Sucesso!', 'Os dados do cliente foram atualizados.', 'success');
                CRMManager.loadCustomers(); // Reload list
            }

        } catch (err) {
            console.error(err);
            Swal.fire('Erro', err.message || 'Falha ao editar cliente.', 'error');
        }
    }
};

window.CRMManager = CRMManager;
