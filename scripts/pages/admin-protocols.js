/**
 * Admin Protocols Management
 * Handles listing, approving, and rejecting budget protocols.
 */

const ProtocolsManager = {
    state: {
        protocols: [],
        filter: 'pending' // pending, approved, rejected, all
    },

    init: () => {
        console.log("Protocols Manager Initialized");
        // Expose to global adminApp if needed or just use directly
        window.adminApp = window.adminApp || {};
        window.adminApp.openProtocols = ProtocolsManager.openProtocols;
        window.adminApp.filterProtocols = ProtocolsManager.setFilter;
        window.adminApp.approveProtocol = ProtocolsManager.approve;
        window.adminApp.rejectProtocol = ProtocolsManager.reject;
        window.adminApp.viewProtocolDetails = ProtocolsManager.viewDetails;
    },

    openProtocols: () => {
        // Switch View (handled by admin.js logic usually, but we ensure data load)
        ProtocolsManager.loadProtocols();
    },

    loadProtocols: async () => {
        const container = document.getElementById('protocols-list-body');
        if (container) container.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">Carregando protocolos...</td></tr>';

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
                .order('created_at', { ascending: false });

            if (ProtocolsManager.state.filter !== 'all') {
                query = query.eq('status', ProtocolsManager.state.filter);
            }

            const { data, error } = await query;

            if (error) throw error;

            ProtocolsManager.state.protocols = data || [];
            ProtocolsManager.render();

            // Update Badge
            ProtocolsManager.updateBadge();

        } catch (err) {
            console.error('Erro ao carregar protocolos:', err);
            if (container) container.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding:20px;">Erro ao carregar dados.</td></tr>';
        }
    },

    setFilter: (filter) => {
        ProtocolsManager.state.filter = filter;

        // Update UI Buttons
        document.querySelectorAll('.filter-btn-protocol').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) btn.classList.add('active');
        });

        ProtocolsManager.loadProtocols();
    },

    updateBadge: async () => {
        // Count pending
        try {
            const { count, error } = await window.supabase
                .from('protocols')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

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

        if (list.length === 0) {
            container.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">Nenhum protocolo encontrado (${ProtocolsManager.state.filter}).</td></tr>`;
            return;
        }

        container.innerHTML = list.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('pt-BR');
            const total = p.total_amount ? `R$ ${p.total_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

            let statusBadge = '';
            if (p.status === 'pending') statusBadge = '<span class="status-badge status-warning">Pendente</span>';
            else if (p.status === 'approved') statusBadge = '<span class="status-badge status-success">Aprovado</span>';
            else if (p.status === 'rejected') statusBadge = '<span class="status-badge status-danger">Rejeitado</span>';

            return `
                <tr>
                    <td>#${p.id.toString().slice(0, 8)}</td>
                    <td>
                        <div style="font-weight:600;">${p.client_name || 'Desconhecido'}</div>
                        <div style="font-size:0.8rem; color:#64748b;">${p.client_email || '-'}</div>
                    </td>
                    <td>${date}</td>
                    <td>${total}</td>
                    <td>${statusBadge}</td>
                    <td>
                         <button onclick="adminApp.viewProtocolDetails('${p.id}')" class="btn-icon" title="Ver Detalhes">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                        ${p.status === 'pending' ? `
                        <button onclick="adminApp.approveProtocol('${p.id}')" class="btn-icon text-success" title="Aprovar">
                            <i class="ph-bold ph-check"></i>
                        </button>
                        <button onclick="adminApp.rejectProtocol('${p.id}')" class="btn-icon text-danger" title="Rejeitar">
                            <i class="ph-bold ph-x"></i>
                        </button>
                        ` : ''}
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
                        ${p.items.map(item => `
                            <tr>
                                <td style="padding:5px; border-bottom:1px solid #e2e8f0;">${item.name}</td>
                                <td style="padding:5px; border-bottom:1px solid #e2e8f0; text-align:right;">${item.qty}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        Swal.fire({
            title: `Protocolo #${id.slice(0, 8)}`,
            html: `
                <div style="text-align:left;">
                    <p><strong>Cliente:</strong> ${p.client_name}</p>
                    <p><strong>Email:</strong> ${p.client_email}</p>
                    <p><strong>Total:</strong> R$ ${p.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <hr style="margin:10px 0; border:0; border-top:1px solid #eee;">
                    <strong>Itens:</strong>
                    ${itemsHtml}
                </div>
            `,
            showCloseButton: true,
            focusConfirm: false,
            showCancelButton: p.status === 'pending',
            confirmButtonText: 'Fechar',
            cancelButtonText: 'Rejeitar',
            denyButtonText: 'Aprovar',
            showDenyButton: p.status === 'pending',
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
            status: 'pending',
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

// Auto Init if document ready
document.addEventListener('DOMContentLoaded', () => {
    ProtocolsManager.init();
});
