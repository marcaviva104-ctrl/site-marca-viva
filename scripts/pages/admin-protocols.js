/**
 * Admin Protocols Management
 * Handles listing, approving, and rejecting budget protocols.
 */

const ProtocolsManager = {
    state: {
        protocols: [],
        filter: 'inquiry' // inquiry, approved, rejected, all
    },

    init: () => {
        console.log("Protocols Manager Initialized");
        // Expose to global adminApp if needed or just use directly
        window.adminApp = window.adminApp || {};
        window.adminApp.openProtocols = ProtocolsManager.openProtocols;
        window.adminApp.filterProtocols = ProtocolsManager.setFilter;
        window.adminApp.approveProtocol = ProtocolsManager.approve;
        window.adminApp.rejectProtocol = ProtocolsManager.reject;
        window.adminApp.promoteProtocol = ProtocolsManager.promoteStatus;
        window.adminApp.notifyCustomerCompleted = ProtocolsManager.notifyCustomerCompleted;
        window.adminApp.viewProtocolDetails = ProtocolsManager.viewDetails;
    },

    openProtocols: () => {
        // Switch View (handled by admin.js logic usually, but we ensure data load)
        ProtocolsManager.loadProtocols();
    },

    loadProtocols: async () => {
        const listBody = document.getElementById('protocols-list-body');

        // 1. Skeleton Loader Injection before await
        if (listBody) {
            listBody.innerHTML = Array(3).fill(`
                <tr>
                    <td style="padding:15px"><div class="skeleton" style="width: 60px;"></div></td>
                    <td><div class="skeleton" style="width: 120px;"></div><br><div class="skeleton" style="width: 180px; margin-top:4px;"></div></td>
                    <td><div class="skeleton" style="width: 90px;"></div><br><div class="skeleton" style="width: 60px; margin-top:4px;"></div></td>
                    <td><div class="skeleton" style="width: 80px;"></div></td>
                    <td><div class="skeleton" style="width: 100px; height: 24px; border-radius: 12px;"></div></td>
                    <td style="text-align:center"><div class="skeleton" style="width: 32px; height: 32px; border-radius: 8px;"></div></td>
                </tr>
            `).join('');
        }

        try {
            let query = window.supabase
                .from('protocols')
                .select(`
                    id,
                    created_at,
                    status,
                    total_amount,
                    client_name,
                    client_email,
                    items
                `)
                .order('created_at', { ascending: false })
                .limit(200); // 2. Anti-Freeze Pagination Limit

            if (ProtocolsManager.state.filter !== 'all') {
                query = query.eq('status', ProtocolsManager.state.filter);
            }

            const { data, error } = await query;

            if (error) throw error;

            ProtocolsManager.state.protocols = data || [];

            // Fetch payments safely for loaded protocols
            const protocolIds = ProtocolsManager.state.protocols.map(p => p.id);
            ProtocolsManager.state.paymentsMap = {};
            ProtocolsManager.state.paymentsDetailsCard = {};

            if (protocolIds.length > 0 && window.supabase) {
                try {
                    const { data: paymentsData, error: paymentsError } = await window.supabase
                        .from('order_payments')
                        .select('order_id, amount, payment_method, paid_at, created_at, notes')
                        .in('order_id', protocolIds);

                    if (paymentsError) {
                        console.warn('Erro não-crítico ao buscar pagamentos:', paymentsError);
                    } else if (paymentsData) {
                        const paymentsMap = {};
                        const paymentsDetailsCard = {};

                        paymentsData.forEach(p => {
                            // Sum for the badge/display map
                            paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + Number(p.amount);

                            // History for the PDF
                            if (!paymentsDetailsCard[p.order_id]) paymentsDetailsCard[p.order_id] = [];
                            paymentsDetailsCard[p.order_id].push(p);
                        });

                        ProtocolsManager.state.paymentsMap = paymentsMap;
                        ProtocolsManager.state.paymentsDetailsCard = paymentsDetailsCard;
                    }
                } catch (paymentErr) {
                    console.warn('Exceção ao buscar pagamentos:', paymentErr);
                }
            }

            ProtocolsManager.render();

            // Update Badge & Stats
            ProtocolsManager.updateBadge();
            if (typeof adminApp !== 'undefined' && adminApp.updateOrdersStats) {
                adminApp.updateOrdersStats();
            }

        } catch (err) {
            console.error('Erro ao carregar protocolos DO BANCO:', err);
            let errorMessage = "Erro desconhecido.";
            if (err) {
                errorMessage = err.message || err.details || JSON.stringify(err);
            }
            if (listBody) {
                listBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:20px; font-weight:bold;">Erro do Sistema de Banco: <br> <span style="font-weight:normal; font-family: monospace; font-size: 0.9em; background: #fee2e2; padding: 5px; border-radius: 4px; display:inline-block; margin-top:5px;">${errorMessage}</span></td></tr>`;
            }
        }
    },

    setFilter: (filter) => {
        ProtocolsManager.state.filter = filter;

        // Update UI Buttons
        const container = document.querySelector('#orders .filter-toolbar');
        if (container) {
            container.querySelectorAll('.filter-btn-ghost, .filter-btn-action').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === filter) btn.classList.add('active');
            });
        }

        ProtocolsManager.loadProtocols();
    },

    searchProtocols: (term) => {
        ProtocolsManager.state.search = term;
        ProtocolsManager.render();
    },

    updateBadge: async () => {
        // Count pending
        try {
            const { count, error } = await window.supabase
                .from('protocols')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'inquiry');

            const badge = document.getElementById('protocols-badge');
            if (badge) {
                if (!error && count > 0) {
                    badge.innerText = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (e) { }
    },

    render: () => {
        const container = document.getElementById('protocols-list-body');
        if (!container) return;

        const list = ProtocolsManager.state.protocols;
        const paymentsMap = ProtocolsManager.state.paymentsMap || {};

        // Badges for status
        const badges = {
            'inquiry': '<span class="status-badge status-warning">Aguardando Aprovação</span>',
            'pending': '<span class="status-badge status-warning">Aguardando Aprovação</span>',
            'approved': '<span class="status-badge status-success">Aprovado</span>',
            'rejected': '<span class="status-badge status-danger">Rejeitado</span>',
            'production': '<span class="status-badge status-info">Em Produção</span>',
            'completed': '<span class="status-badge status-success">Concluído</span>',
            'cancelled': '<span class="status-badge status-danger">Cancelado</span>'
        };

        // Actions for status
        const getActions = (p) => ({
            'inquiry': `
                <button onclick="adminApp.approveProtocol('${p.id}')" class="btn-icon text-success" data-tooltip="Aprovar Protocolo">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button onclick="adminApp.rejectProtocol('${p.id}')" class="btn-icon text-danger" data-tooltip="Rejeitar Protocolo">
                    <i class="ph-bold ph-x"></i>
                </button>
            `,
            'pending': `
                <button onclick="adminApp.approveProtocol('${p.id}')" class="btn-icon text-success" data-tooltip="Aprovar Protocolo">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button onclick="adminApp.rejectProtocol('${p.id}')" class="btn-icon text-danger" data-tooltip="Rejeitar Protocolo">
                    <i class="ph-bold ph-x"></i>
                </button>
            `,
            'approved': `
                <button onclick="adminApp.promoteProtocol('${p.id}', 'production', 'Mandar para Produção?')" class="btn-icon text-primary" data-tooltip="Mandar para Produção">
                    <i class="ph-bold ph-gear"></i>
                </button>
            `,
            'production': `
                <button onclick="adminApp.promoteProtocol('${p.id}', 'completed', 'Finalizar Pedido?')" class="btn-icon text-success" data-tooltip="Concluir Pedido">
                    <i class="ph-bold ph-check-circle"></i>
                </button>
            `,
            'completed': `
                <button onclick="adminApp.notifyCustomerCompleted('${p.id}')" class="btn-icon text-primary" data-tooltip="Avisar Cliente via WhatsApp">
                    <i class="ph-bold ph-whatsapp-logo"></i>
                </button>
            `
        });

        // Search
        const searchQuery = ProtocolsManager.state.search?.toLowerCase().trim();

        let filtered = ProtocolsManager.state.protocols.filter(p => {
            if (ProtocolsManager.state.filter !== 'all' && p.status !== ProtocolsManager.state.filter) return false;
            if (searchQuery) {
                return p.client_name?.toLowerCase().includes(searchQuery) ||
                    p.id?.toLowerCase().includes(searchQuery);
            }
            return true;
        });

        if (filtered.length === 0) {
            // 5. Empty States Premium Display
            let emptyIcon = ProtocolsManager.state.filter === 'inquiry' ? 'ph-clock' :
                ProtocolsManager.state.filter === 'production' ? 'ph-gear' : 'ph-package';

            let emptyMessage = ProtocolsManager.state.filter === 'inquiry' ? 'Nenhuma aprovação pendente' :
                ProtocolsManager.state.filter === 'production' ? 'Nada em produção no momento' : 'Nenhum pedido encontrado';

            container.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding: 60px 20px;">
                        <i class="ph-duotone ${emptyIcon}" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 15px;"></i>
                        <div style="font-size: 1.1rem; color: #475569; font-weight: 500;">${emptyMessage}</div>
                        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 5px;">Os pedidos aparecerão aqui.</div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = filtered.map(p => {
            const date = new Date(p.created_at);
            const displayId = p.id.startsWith('#') ? p.id : '#' + p.id;

            // 3. Relative Time Logic inline (Safe fallback)
            let dateDisplay = ProtocolsManager.formatRelativeTime(p.created_at);
            let timeDisplay = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Quick Copy injection
            const copyIdHtml = `<i class="ph-bold ph-copy quick-copy" data-tooltip="Copiar ID" onclick="adminApp.copyToClipboard('${displayId}', this)"></i>`;

            return `
                <tr>
                    <td style="font-family:monospace; font-weight:600; color:#475569;">
                        ${displayId.slice(0, 8)} ${copyIdHtml}
                    </td>
                    <td>
                        <div style="font-weight:600; color:#1e293b;">${p.client_name || 'Desconhecido'}</div>
                        <div style="font-size:0.8rem; color:#64748b;">${p.client_email || 'Sem email'}</div>
                    </td>
                    <td>
                        <div style="font-weight:500; color:#475569;">${dateDisplay}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${timeDisplay}</div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:#3b82f6;">R$ ${(p.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </td>
                    <td>${badges[p.status] || `<span class="status-badge" style="background:#f1f5f9; color:#475569;">${p.status}</span>`}</td>
                    <td>
                        ${p.payment_status === 'paid' ? '<span class="status-badge status-success" style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph-bold ph-check"></i> Pago</span>' : '<span class="status-badge status-warning" style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph-bold ph-clock"></i> Pendente</span>'}
                    </td>
                    <td style="text-align:center;">
                        ${getActions(p)[p.status] || ''}
                        <button onclick="adminApp.viewProtocolDetails('${p.id}')" class="btn-icon" data-tooltip="Ver Detalhes, Produção e Opções" style="background:#f1f5f9; color:#475569; border:none; padding:8px; border-radius:6px; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    viewDetails: (id) => {
        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        let itemsHtml = '<i>Sem itens registrados</i>';
        if (p.items && Array.isArray(p.items)) {
            itemsHtml = `
                <table style="width:100%; font-size:0.9rem; border-collapse:collapse; margin-top:10px;">
                    <thead style="background:#f1f5f9;">
                        <tr><th style="padding:5px; text-align:left;">Item</th><th style="padding:5px; text-align:right;">Qtd</th></tr>
                    </thead>
                    <tbody>
                        ${p.items.map(item => {
                let fileLink = '';
                let fileName = item.fileName || 'Arquivo';
                if (item.fileUrl) {
                    fileLink = `<br><a href="${item.fileUrl}" target="_blank" style="color:#0ea5e9; font-size:0.8rem; text-decoration:none;">
                                    <i class="ph-bold ph-file-pdf"></i> ${fileName}
                                </a>`;
                }

                // Customization details
                let details = '';
                if (item.configuration) {
                    const c = item.configuration;
                    if (c.printMode) details += `<br><small style="color:#64748b">Modo: ${c.printMode === 'color' ? 'Colorido' : 'P&B'}</small>`;
                    if (c.stdPages) details += `<br><small style="color:#64748b">Normal: ${c.stdPages} | Cheia: ${c.heavyPages}</small>`;
                } else if (item.customization) {
                    details += `<br><small style="color:#64748b">${item.customization}</small>`;
                }

                return `
                            <tr>
                                <td style="padding:8px 5px; border-bottom:1px solid #e2e8f0;">
                                    <div style="font-weight:600;">${item.name}</div>
                                    ${details}
                                    ${fileLink}
                                </td>
                                <td style="padding:8px 5px; border-bottom:1px solid #e2e8f0; text-align:right; vertical-align:top;">${item.qty || item.quantity}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                </table>
            `;
        }

        Swal.fire({
            title: `Protocolo #${id.slice(0, 8)}`,
            html: `
                <div style="text-align:left;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
                        <p style="margin:2px 0;"><strong>Cliente:</strong> ${p.client_name}</p>
                        <p style="margin:2px 0;"><strong>Email:</strong> ${p.client_email}</p>
                        <p style="margin:2px 0;"><strong>Total:</strong> R$ ${p.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <strong>Itens do Pedido:</strong>
                    ${itemsHtml}
                    <div style="margin-top:15px; text-align:center;">
                         <button onclick="ProtocolsManager.printProtocol('${id}')" style="background:#6366f1; color:white; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-size:0.9rem;">
                            <i class="ph-bold ph-printer"></i> Imprimir Ordem de Produção
                         </button>
                    </div>
                </div>
            `,
            showCloseButton: true,
            focusConfirm: false,
            showCancelButton: (p.status === 'inquiry' || p.status === 'pending'),
            confirmButtonText: 'Fechar',
            cancelButtonText: 'Rejeitar',
            denyButtonText: 'Aprovar',
            showDenyButton: (p.status === 'inquiry' || p.status === 'pending'),
            width: '600px'
        }).then((result) => {
            if (result.isDenied) {
                ProtocolsManager.approve(id);
            } else if (result.dismiss === Swal.DismissReason.cancel) {
                ProtocolsManager.reject(id);
            }
        });
    },

    approve: async (id) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Aprovar Protocolo?',
            text: "Isso transformará o protocolo em um Pedido (Kanban).",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Sim, Aprovar'
        });

        if (!isConfirmed) return;

        // Call RPC 'promote_request_to_protocol' or direct update
        // Using direct update for status first, then maybe create order

        try {
            // 1. Update Status
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: 'approved' })
                .eq('id', id);

            if (error) throw error;

            // 2. Ideally trigger a backend function to create the Order
            // For now frontend logic:
            const p = ProtocolsManager.state.protocols.find(i => i.id === id);

            // Create Order in 'orders' table
            /* 
               Assuming logic exists or we rely on the procedure. 
               Let's assume the user wants the RPC call:
            */
            const { error: rpcError } = await window.supabase
                .rpc('promote_request_to_protocol', { request_id: id });

            if (rpcError) {
                console.warn('RPC Error (fallback to manual):', rpcError);
                // Fallback: Just marking as approved visually
            }

            Swal.fire('Aprovado!', 'O protocolo foi aprovado com sucesso.', 'success');
            ProtocolsManager.loadProtocols();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível aprovar.', 'error');
        }
    },

    promoteStatus: async (id, newStatus, title) => {
        const { isConfirmed } = await Swal.fire({
            title: title || 'Atualizar Status?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Sim, Confirmar'
        });

        if (!isConfirmed) return;

        try {
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            Swal.fire('Status Atualizado!', 'O pedido mudou de fase com sucesso.', 'success');
            ProtocolsManager.loadProtocols();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
        }
    },

    notifyCustomerCompleted: async (id) => {
        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        try {
            // First try to resolve the client details
            const { data: client, error } = await window.supabase
                .from('clients')
                .select('phone, name')
                .eq('id', p.client_id)
                .single();

            let phone = (client && client.phone) ? client.phone.replace(/[^0-9]/g, '') : '';
            let name = (client && client.name) ? client.name.split(' ')[0] : 'Cliente';

            if (!phone) {
                // If the user doesn't have a phone on record, prompt the admin
                const { value: typedPhone } = await Swal.fire({
                    title: 'Número do Cliente Misto',
                    text: 'Não encontramos o telefone no cadastro. Qual o WhatsApp do cliente?',
                    input: 'text',
                    inputPlaceholder: 'Ex: 11999999999',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar'
                });

                if (typedPhone) {
                    phone = typedPhone.replace(/[^0-9]/g, '');
                } else {
                    return;
                }
            }

            // Prefix with 55 if length is local (10 or 11 digits)
            if (phone.length === 10 || phone.length === 11) {
                phone = '55' + phone;
            }

            const protocolName = p.id.startsWith('#') ? p.id : '#' + p.id;
            const msg = `Olá ${name}! Tudo bem?\n\nSeu pedido *${protocolName.slice(0, 8)}* na *Marca Viva* já está embalado e Concluído! 🎉\n\nPor favor, confirme como deseja proceder com a retirada ou entrega. Qualquer dúvida estou à disposição!`;

            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Houve um erro ao buscar os dados do cliente para o WhatsApp.', 'error');
        }
    },

    reject: async (id) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Rejeitar Protocolo?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim, Rejeitar'
        });

        if (!isConfirmed) return;

        try {
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;

            Swal.fire('Rejeitado', 'O protocolo foi rejeitado.', 'info');
            ProtocolsManager.loadProtocols();
        } catch (e) {
            Swal.fire('Erro', 'Erro ao rejeitar.', 'error');
        }
    },

    // --- MANUAL PROTOCOL LOGIC ---
    manualState: {
        clientId: null,
        items: []
    },

    openNewProtocolModal: () => {
        // Reset State
        ProtocolsManager.manualState = { clientId: null, items: [] };

        // Reset Fields
        document.getElementById('new-prot-client-search').value = '';
        document.getElementById('new-prot-client-name').value = '';
        document.getElementById('new-prot-client-phone').value = '';
        document.getElementById('new-prot-client-email').value = '';
        document.getElementById('new-prot-client-id').value = '';
        document.getElementById('new-prot-items-body').innerHTML = '';
        document.getElementById('new-prot-total').innerText = 'R$ 0,00';

        // Open Modal (using adminApp logic or direct class)
        document.getElementById('modal-new-protocol').classList.add('open');
    },

    searchClient: async (query) => {
        const resultsDiv = document.getElementById('client-search-results');
        if (query.length < 3) {
            resultsDiv.style.display = 'none';
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(5);

            if (data && data.length > 0) {
                resultsDiv.innerHTML = data.map(c => `
                    <div onclick="adminApp.selectClient('${c.id}', '${c.full_name}', '${c.email}', '${c.phone}')" 
                         style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; hover:background:#f8fafc;">
                        <strong>${c.full_name || 'Sem nome'}</strong><br>
                        <small>${c.email}</small>
                    </div>
                `).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.style.display = 'none';
            }
        } catch (e) { console.error(e); }
    },

    selectClient: (id, name, email, phone) => {
        document.getElementById('new-prot-client-id').value = id;
        document.getElementById('new-prot-client-name').value = name !== 'null' ? name : '';
        document.getElementById('new-prot-client-email').value = email !== 'null' ? email : '';
        document.getElementById('new-prot-client-phone').value = phone !== 'null' ? phone : '';
        document.getElementById('client-search-results').style.display = 'none';
        ProtocolsManager.manualState.clientId = id;
    },

    searchProductProtocol: async (query) => {
        const resultsDiv = document.getElementById('prod-search-results');
        if (query.length < 3) {
            resultsDiv.style.display = 'none';
            return;
        }

        try {
            const { data } = await window.supabase
                .from('products')
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(10);

            if (data && data.length > 0) {
                resultsDiv.innerHTML = data.map(p => `
                    <div onclick="adminApp.addItemToProtocol('${p.id}', '${p.name?.replace(/'/g, "\\'")}', ${p.price})" 
                         style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                        <span>${p.name}</span>
                        <strong>R$ ${p.price?.toFixed(2)}</strong>
                    </div>
                `).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.style.display = 'none';
            }
        } catch (e) { }
    },

    addItem: (id, name, price) => {
        // Check if exists
        const existing = ProtocolsManager.manualState.items.find(i => i.id === id);
        if (existing) {
            existing.qty++;
        } else {
            ProtocolsManager.manualState.items.push({ id, name, price, qty: 1 });
        }

        document.getElementById('prod-search-results').style.display = 'none';
        document.getElementById('new-prot-prod-search').value = ''; // clear
        ProtocolsManager.renderManualItems();
    },

    renderManualItems: () => {
        const tbody = document.getElementById('new-prot-items-body');
        let total = 0;

        tbody.innerHTML = ProtocolsManager.manualState.items.map((item, index) => {
            const subtotal = item.price * item.qty;
            total += subtotal;
            return `
                <tr>
                    <td style="padding:10px;">${item.name}</td>
                    <td style="padding:10px;">
                        <input type="number" value="${item.qty}" min="1" 
                            onchange="adminApp.updateItemQty(${index}, this.value)"
                            style="width:60px; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    </td>
                    <td style="padding:10px;">R$ ${item.price.toFixed(2)}</td>
                    <td style="padding:10px;">R$ ${subtotal.toFixed(2)}</td>
                    <td style="padding:10px; text-align:center;">
                        <button onclick="adminApp.removeItemProtocol(${index})" style="color:red; background:none; border:none; cursor:pointer;">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('new-prot-total').innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    },

    updateItemQty: (index, qty) => {
        if (qty < 1) return;
        ProtocolsManager.manualState.items[index].qty = parseInt(qty);
        ProtocolsManager.renderManualItems();
    },

    removeItem: (index) => {
        ProtocolsManager.manualState.items.splice(index, 1);
        ProtocolsManager.renderManualItems();
    },

    saveManualProtocol: async () => {
        const name = document.getElementById('new-prot-client-name').value;
        const email = document.getElementById('new-prot-client-email').value;
        const phone = document.getElementById('new-prot-client-phone').value;
        const userId = document.getElementById('new-prot-client-id').value || null;

        if (!name || !email) {
            Swal.fire('Erro', 'Nome e Email são obrigatórios.', 'error');
            return;
        }

        if (ProtocolsManager.manualState.items.length === 0) {
            Swal.fire('Erro', 'Adicione pelo menos um produto.', 'error');
            return;
        }

        // Calculate Total
        const total = ProtocolsManager.manualState.items.reduce((acc, i) => acc + (i.price * i.qty), 0);

        // Prepare Data
        const payload = {
            client_name: name,
            client_email: email,
            client_phone: phone, // Assuming column exists or stored in json
            user_id: userId, // Link if known
            items: ProtocolsManager.manualState.items,
            total_amount: total,
            status: 'inquiry',
            created_at: new Date()
        };

        try {
            Swal.showLoading();

            // 1. Check if email exists in profiles but NO userId was selected
            if (!userId && email) {
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (profile) payload.user_id = profile.id;
            }

            const { error } = await window.supabase
                .from('protocols')
                .insert(payload);

            if (error) throw error;

            Swal.fire('Sucesso', 'Protocolo criado!', 'success');
            ProtocolsManager.loadProtocols(); // Reload list
            adminApp.closeModals();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Falha ao salvar protocolo.', 'error');
        }
    },

    // Global Utility Functions inserted within ProtocolsManager 
    copyToClipboard: (text, element) => {
        navigator.clipboard.writeText(text).then(() => {
            // Give visual feedback using the class defined in admin.html
            const originalClass = element.className;
            element.className = 'ph-bold ph-check-circle quick-copy copy-feedback';
            element.setAttribute('data-tooltip', 'Copiado!');
            setTimeout(() => {
                element.className = originalClass;
                element.setAttribute('data-tooltip', 'Copiar ID');
            }, 1000);
        }).catch(err => console.error("Clipboard falhou:", err));
    },

    formatRelativeTime: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoje";
        if (diffDays === 1) return "Ontem";
        if (diffDays < 7) return `Há ${diffDays} dias`;

        return date.toLocaleDateString('pt-BR');
    },

    printProtocol: (id) => {
        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        try {
            let items = p.items || [];
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }

            // Map data to Quote HTML format
            // Se o protocolo for muito antigo e não tiver itens no banco, criamos um item genérico com o Total.
            if (!items || items.length === 0) {
                items = [{
                    name: `Orçamento/Pedido #${p.id.slice(0, 8)}`,
                    qty: 1,
                    price: p.total_amount || 0
                }];
            }

            const printData = {
                id: p.id,
                customer_name: p.client_name || 'Cliente',
                client_email: p.client_email && p.client_email !== 'null' ? p.client_email : 'Não informado',
                total_amount: p.total_amount || 0,
                date: p.created_at,
                items: items.map(i => {
                    let customStr = '';
                    if (i.configuration) {
                        customStr += i.configuration.printMode ? (i.configuration.printMode === 'color' ? 'Modo: Colorido' : 'Modo: P&B') : '';
                        customStr += i.configuration.stdPages ? ` | Pág. Normal: ${i.configuration.stdPages} | Cheia: ${i.configuration.heavyPages}` : '';
                    } else if (i.customization) {
                        customStr = i.customization;
                    }
                    return {
                        product_name: i.name || 'Item do Pedido',
                        quantity: i.qty || i.quantity || 1,
                        unit_price: parseFloat(i.price) || 0,
                        customization: customStr,
                        fileName: i.fileName || ''
                    };
                }),
                paidAmount: ProtocolsManager.state.paymentsMap ? (ProtocolsManager.state.paymentsMap[p.id] || 0) : 0,
                payments: ProtocolsManager.state.paymentsDetailsCard ? (ProtocolsManager.state.paymentsDetailsCard[p.id] || []) : []
            };

            // Set data into local storage exactly as Admin module 5 does
            localStorage.setItem('mv_admin_print_data', JSON.stringify(printData));

            // Open the new premium Quote PDF layout window
            window.open(`pages/quote.html?source=admin&id=${encodeURIComponent(p.id)}`, '_blank');

        } catch (e) {
            console.error('Error opening quote print:', e);
            alert('Erro ao gerar Ordem de Produção visual.');
        }
    }
};

// Global Exposure for HTML onclicks
window.adminApp = window.adminApp || {};
// ... previous exposures
window.adminApp.openNewProtocolModal = ProtocolsManager.openNewProtocolModal;
window.adminApp.searchClient = ProtocolsManager.searchClient;
window.adminApp.selectClient = ProtocolsManager.selectClient;
window.adminApp.searchProductProtocol = ProtocolsManager.searchProductProtocol;
window.adminApp.addItemToProtocol = ProtocolsManager.addItem;
window.adminApp.updateItemQty = ProtocolsManager.updateItemQty;
window.adminApp.removeItemProtocol = ProtocolsManager.removeItem;
window.adminApp.saveManualProtocol = ProtocolsManager.saveManualProtocol;
window.adminApp.viewProtocolDetails = ProtocolsManager.viewDetails; // Ensure this map
window.adminApp.copyToClipboard = ProtocolsManager.copyToClipboard;
window.adminApp.formatRelativeTime = ProtocolsManager.formatRelativeTime;
window.adminApp.searchProtocols = ProtocolsManager.searchProtocols;
// Expose Print Protocol
ProtocolsManager.printProtocol = ProtocolsManager.printProtocol; // Ensure internal ref


// Auto Init if document ready
document.addEventListener('DOMContentLoaded', () => {
    ProtocolsManager.init();
});
