/**
 * Marca Viva - Profile Handler (Bento Edition)
 */

async function loadProfile() {
    // 1. Wait for Auth
    let attempts = 0;
    while (!window.authService && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    const user = authService.getCurrentUser();
    if (!user) {
        // profile.html fica em /pages/, entao login.html tambem
        window.location.href = 'login.html';
        return;
    }

    // 2. Populate Sidebar & Dashboard
    const name = user.name || user.full_name || 'Cliente';
    const email = user.email || '';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    setEl('sb-avatar', initials);
    setEl('sb-name', name);
    setEl('sb-email', email);
    setEl('hero-name', name.split(' ')[0]);
    setEl('info-name', name);
    setEl('info-email', email);

    const isVip = user.role === 'vip';
    const badgeEl = document.getElementById('sb-badge');
    const heroBadge = document.getElementById('hero-badge');
    if (isVip) {
        if (badgeEl) { badgeEl.textContent = 'VIP 💎'; badgeEl.style.color = '#a78bfa'; }
        if (heroBadge) { heroBadge.textContent = 'VIP Member 💎'; heroBadge.style.color = '#a78bfa'; }
    } else {
        if (badgeEl) badgeEl.textContent = 'Cliente';
        if (heroBadge) heroBadge.textContent = 'Cliente Novo';
    }

    // 3. Fetch Full Profile & Orders
    if (window.supabase) {
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            updateAddressView(profile.address);
            setEl('info-phone', profile.phone || '-');
            setEl('info-cpf', profile.cpf || '-');
            window.currentUserProfile = profile;
        }

        loadMyOrders(user.id);
        loadWishlist();
        updateCustomerNotifBadge();
        loadCustomerAddresses();
        loadReferralCoupon();
    }
}



function updateAddressView(addressData) {
    const ids = ['mini-address', 'mini-address-settings'];
    const empty = '<span style="color:#f59e0b">Endereço não cadastrado.</span><br>Clique em "Editar" para adicionar.';

    if (!addressData || Object.keys(addressData).length === 0) {
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = empty; });
        return;
    }

    const addr = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;
    let html = `<strong>${addr.street || 'Rua não inf.'}, ${addr.number || 'S/N'}</strong>`;
    if (addr.complement) html += ` - ${addr.complement}`;
    html += `<br>${addr.neighborhood || ''} - ${addr.city || ''}/${addr.state || ''}<br>CEP: ${addr.zip || ''}`;

    ids.forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
}


async function loadMyOrders(userId) {
    const countEl = document.getElementById('stat-orders-count');
    const container = document.getElementById('classic-orders-container');
    const emptyState = document.getElementById('orders-empty-state');

    try {
        const userEmail = window.authService?.getCurrentUser()?.email || '';

        // Build safe query (avoid broken OR when email is empty)
        let query = window.supabase
            .from('protocols')
            .select('*, protocol_items(*)')
            .order('created_at', { ascending: false })
            .limit(50); // Increased limit for table

        if (userEmail) {
            query = query.or(`client_id.eq.${userId},client_email.eq.${userEmail}`);
        } else {
            query = query.eq('client_id', userId);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        if (!orders || orders.length === 0) {
            if (container) container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (container) container.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';
        if (countEl) countEl.textContent = orders.length;

        const productionCountEl = document.getElementById('stat-production-count');
        if (productionCountEl) {
            const inProduction = orders.filter(o => o.status === 'in_production' || o.status === 'production').length;
            productionCountEl.textContent = inProduction;
        }

        // 1. Highlight Last Order
        const lastOrder = orders[0];
        document.getElementById('lo-id').textContent = lastOrder.id;

        let loStatusLabel = lastOrder.status || 'inquiry';
        if (loStatusLabel === 'inquiry' || loStatusLabel === 'pending') loStatusLabel = 'Pendente';
        else if (loStatusLabel === 'approved') loStatusLabel = 'Aprovado';
        else if (loStatusLabel === 'awaiting_payment') loStatusLabel = 'Aguardando Pagamento';
        else if (loStatusLabel === 'in_production' || loStatusLabel === 'production') loStatusLabel = 'Em Produção';
        else if (loStatusLabel === 'delivered' || loStatusLabel === 'done' || loStatusLabel === 'completed') loStatusLabel = 'Concluído';
        else loStatusLabel = 'Pendente';

        document.getElementById('lo-status').textContent = loStatusLabel;
        document.getElementById('lo-date').textContent = new Date(lastOrder.created_at).toLocaleString('pt-BR');
        document.getElementById('lo-total').textContent = Number(lastOrder.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('lo-btn-view').onclick = () => openOrderDetails(lastOrder.id);

        const pf = window.currentUserProfile || {};
        document.getElementById('lo-recipient').textContent = pf.full_name || pf.name || window.authService?.getCurrentUser()?.email || 'Você';

        let addressText = 'Não informado';
        let zipText = 'Não informado';
        if (pf.address) {
            const addr = typeof pf.address === 'string' ? JSON.parse(pf.address) : pf.address;
            if (addr.street) addressText = `${addr.street}, ${addr.number || 'S/N'} - ${addr.neighborhood || ''}, ${addr.city || ''}`;
            if (addr.zip) zipText = addr.zip;
        }
        document.getElementById('lo-address').textContent = addressText;
        document.getElementById('lo-zip').textContent = zipText;

        // 2. Render Table
        window._classicOrdersCache = orders;
        renderClassicOrdersTable(orders);

        updateGamification(orders.map(o => ({ total: Number(o.total_amount || 0) })));

    } catch (err) {
        console.error("Error loading orders:", err);
        if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = '<div style="color:#ef4444; padding:20px;">Erro ao carregar pedidos.</div>';
        }
    }
}

function renderClassicOrdersTable(ordersToRender) {
    const tbody = document.getElementById('classic-orders-tbody');
    if (!tbody) return;

    if (ordersToRender.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; color: #64748b;">Nenhum pedido encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = ordersToRender.map(order => {
        const date = new Date(order.created_at).toLocaleString('pt-BR');
        let statusLabel = order.status || 'inquiry';
        let statusColor = '#475569';

        if (statusLabel === 'inquiry' || statusLabel === 'pending') { statusLabel = 'Pendente'; statusColor = '#b45309'; }
        else if (statusLabel === 'approved') { statusLabel = 'Aprovado'; statusColor = '#1d4ed8'; }
        else if (statusLabel === 'awaiting_payment') { statusLabel = 'Aguardando Pag.'; statusColor = '#b45309'; }
        else if (statusLabel === 'in_production' || statusLabel === 'production') { statusLabel = 'Em Produção'; statusColor = '#1d4ed8'; }
        else if (statusLabel === 'delivered' || statusLabel === 'done' || statusLabel === 'completed') { statusLabel = 'Concluído'; statusColor = '#065f46'; }
        else if (statusLabel === 'rejected' || statusLabel === 'canceled') { statusLabel = 'Cancelado'; statusColor = '#ef4444'; }
        else { statusLabel = 'Pendente'; statusColor = '#475569'; }

        return `
        <tr>
            <td style="font-family:monospace; font-weight:600;">${order.id.toString().slice(0, 8)}</td>
            <td style="color:#64748b;">${date}</td>
            <td style="color:${statusColor}; font-weight:600;">${statusLabel}</td>
            <td style="color:#1e293b; font-weight:600;">R$ ${Number(order.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            <td>
                <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                    <button onclick="openOrderDetails('${order.id}')" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 10px; border-radius:4px; font-size:0.8rem; cursor:pointer;" title="Ver Detalhes"><i class="ph-bold ph-eye"></i> Ver</button>
                    <a class="classic-btn-action" onclick="event.stopPropagation(); reorderPurchase('${order.id}')" style="font-size:0.8rem;"><i class="ph-bold ph-arrow-circle-right"></i> Refazer</a>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function filterClassicOrders() {
    const searchId = document.getElementById('filter-order-id').value.trim().toLowerCase();
    let filtered = window._classicOrdersCache || [];
    if (searchId) {
        filtered = filtered.filter(o => o.id.toString().toLowerCase().includes(searchId));
    }
    renderClassicOrdersTable(filtered);
}

function updateGamification(orders) {
    const total = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const goal = 1000;
    const progress = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);

    const bar = document.getElementById('loyalty-bar');
    const txt = document.getElementById('loyalty-txt');
    const totalEl = document.getElementById('stat-total-spent');
    if (bar) bar.style.width = `${progress}%`;
    if (txt) txt.innerText = remaining > 0
        ? `Faltam R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Você é VIP! 💎';
    if (totalEl) totalEl.textContent = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;


    if (progress >= 100) {
        const heroBadge = document.getElementById('hero-badge');
        const sbBadge = document.getElementById('sb-badge');
        if (heroBadge) { heroBadge.textContent = 'VIP MEMBER'; heroBadge.style.color = '#a78bfa'; }
        if (sbBadge) { sbBadge.textContent = 'VIP 💎'; sbBadge.style.color = '#a78bfa'; }
    }
}

// === EDIT LOGIC ===

async function openEditProfileModal() {
    const profile = window.currentUserProfile || {};

    const { value: formValues } = await Swal.fire({
        title: 'Editar Meus Dados',
        html:
            `<input id="swal-name" class="swal2-input" placeholder="Nome Completo" aria-label="Nome Completo" value="${profile.full_name || ''}">` +
            `<input id="swal-phone" class="swal2-input" placeholder="Telefone" aria-label="Telefone" value="${profile.phone || ''}">` +
            `<input id="swal-cpf" class="swal2-input" placeholder="CPF" aria-label="CPF" value="${profile.cpf || ''}">`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            return {
                full_name: document.getElementById('swal-name').value,
                phone: document.getElementById('swal-phone').value,
                cpf: document.getElementById('swal-cpf').value
            }
        }
    });

    if (formValues) {
        await saveProfileData(formValues);
    }
}

async function promptAddressForm(title, addr = {}) {
    const { value: address } = await Swal.fire({
        title,
        html:
            `<input id="swal-zip" class="swal2-input" placeholder="CEP (apenas números)" aria-label="CEP" value="${addr.zip || ''}" maxlength="8">` +
            `<small style="display:block; text-align:left; color:#64748b; margin:-10px 0 10px 0; padding:0 20px;">Digite o CEP e pressione Tab para auto-completar</small>` +
            `<input id="swal-street" class="swal2-input" placeholder="Rua" aria-label="Rua" value="${addr.street || ''}">` +
            `<input id="swal-num" class="swal2-input" placeholder="Número" aria-label="Número" value="${addr.number || ''}" style="width:48%; display:inline-block;">` +
            `<input id="swal-complement" class="swal2-input" placeholder="Complemento" aria-label="Complemento" value="${addr.complement || ''}" style="width:48%; display:inline-block; margin-left:4%;">` +
            `<input id="swal-neighborhood" class="swal2-input" placeholder="Bairro" aria-label="Bairro" value="${addr.neighborhood || ''}">` +
            `<input id="swal-city" class="swal2-input" placeholder="Cidade" aria-label="Cidade" value="${addr.city || ''}" style="width:70%; display:inline-block;">` +
            `<input id="swal-state" class="swal2-input" placeholder="UF" aria-label="UF" value="${addr.state || ''}" maxlength="2" style="width:26%; display:inline-block; margin-left:4%; text-transform:uppercase;">`,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Salvar',
        didOpen: () => {
            // Auto-complete CEP on blur
            const zipInput = document.getElementById('swal-zip');
            zipInput.addEventListener('blur', async () => {
                const cep = zipInput.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    try {
                        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                        const data = await response.json();
                        if (!data.erro) {
                            document.getElementById('swal-street').value = data.logradouro || '';
                            document.getElementById('swal-neighborhood').value = data.bairro || '';
                            document.getElementById('swal-city').value = data.localidade || '';
                            document.getElementById('swal-state').value = data.uf || '';
                            // Focus on number field
                            document.getElementById('swal-num').focus();
                        }
                    } catch (e) {
                        console.error('Erro ao buscar CEP:', e);
                    }
                }
            });
        },
        preConfirm: () => {
            return {
                zip: document.getElementById('swal-zip').value,
                street: document.getElementById('swal-street').value,
                number: document.getElementById('swal-num').value,
                complement: document.getElementById('swal-complement').value,
                neighborhood: document.getElementById('swal-neighborhood').value,
                city: document.getElementById('swal-city').value,
                state: document.getElementById('swal-state').value.toUpperCase()
            };
        }
    });

    return address || null;
}

async function openAddressModal() {
    const profile = window.currentUserProfile || {};
    const addr = typeof profile.address === 'string' ? JSON.parse(profile.address) : (profile.address || {});

    const address = await promptAddressForm('📍 Editar Endereço Padrão', addr);
    if (address) {
        await saveProfileData({ address });
    }
}

// === Múltiplos Endereços (customer_addresses) ===

async function loadCustomerAddresses() {
    const container = document.getElementById('extra-addresses-list');
    if (!container || !window.supabase) return;

    const user = window.authService?.getCurrentUser();
    if (!user) return;

    const { data: addresses, error } = await window.supabase
        .from('customer_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('Endereços: falha ao carregar.', error);
        container.innerHTML = '<div style="color:#ef4444;">Erro ao carregar endereços.</div>';
        return;
    }

    window._customerAddressesCache = addresses || [];

    if (!addresses || addresses.length === 0) {
        container.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem;">Nenhum endereço extra cadastrado.</div>';
        return;
    }

    container.innerHTML = addresses.map(a => `
        <div style="border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <div style="font-size:0.85rem;">
                <strong>${a.label}</strong>${a.is_default ? ' <span style="color:#16a34a;">(padrão)</span>' : ''}<br>
                <span style="color:#64748b;">${a.street || ''}, ${a.number || 'S/N'} - ${a.neighborhood || ''}, ${a.city || ''}/${a.state || ''}</span>
            </div>
            <div style="display:flex; gap:6px; flex-shrink:0;">
                ${!a.is_default ? `<button onclick="setDefaultAddress('${a.id}')" title="Tornar padrão" style="padding:6px 8px; border-radius:6px; border:1px solid #cbd5e1; background:white; cursor:pointer;"><i class="ph-bold ph-star"></i></button>` : ''}
                <button onclick="deleteCustomerAddress('${a.id}')" title="Excluir" style="padding:6px 8px; border-radius:6px; border:1px solid #fecaca; background:white; color:#ef4444; cursor:pointer;"><i class="ph-bold ph-trash"></i></button>
            </div>
        </div>
    `).join('');
}

async function addNewAddress() {
    const user = window.authService?.getCurrentUser();
    if (!user || !window.supabase) return;

    const address = await promptAddressForm('📍 Adicionar Endereço');
    if (!address) return;

    const { value: label } = await Swal.fire({
        title: 'Dar um nome a este endereço',
        input: 'text',
        inputLabel: 'Ex: Casa, Empresa, Depósito',
        inputValue: 'Endereço',
        showCancelButton: true,
        confirmButtonText: 'Salvar'
    });
    if (!label) return;

    const { error } = await window.supabase.from('customer_addresses').insert({
        user_id: user.id,
        label,
        zip: address.zip,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state
    });

    if (error) {
        console.error('Erro ao salvar endereço:', error);
        Swal.fire('Erro', 'Não foi possível salvar o endereço.', 'error');
        return;
    }

    loadCustomerAddresses();
}

async function setDefaultAddress(addressId) {
    const address = (window._customerAddressesCache || []).find(a => a.id === addressId);
    const user = window.authService?.getCurrentUser();
    if (!address || !user || !window.supabase) return;

    Swal.fire({ title: 'Atualizando...', didOpen: () => Swal.showLoading() });

    try {
        // profiles.address continua sendo o "padrão" lido pelo autofill do
        // checkout — então tornar padrão aqui também sincroniza lá.
        await window.supabase.from('profiles').update({
            address: {
                zip: address.zip,
                street: address.street,
                number: address.number,
                complement: address.complement,
                neighborhood: address.neighborhood,
                city: address.city,
                state: address.state
            },
            updated_at: new Date()
        }).eq('id', user.id);

        await window.supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', user.id);
        await window.supabase.from('customer_addresses').update({ is_default: true }).eq('id', addressId);

        location.reload();
    } catch (e) {
        console.error('Erro ao definir endereço padrão:', e);
        Swal.fire('Erro', 'Não foi possível atualizar o endereço padrão.', 'error');
    }
}

async function deleteCustomerAddress(addressId) {
    const confirmed = await Swal.fire({
        icon: 'warning',
        title: 'Excluir endereço?',
        showCancelButton: true,
        confirmButtonText: 'Excluir',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar'
    });
    if (!confirmed.isConfirmed) return;

    if (window.supabase) {
        await window.supabase.from('customer_addresses').delete().eq('id', addressId);
    }
    loadCustomerAddresses();
}

window.addNewAddress = addNewAddress;
window.setDefaultAddress = setDefaultAddress;
window.deleteCustomerAddress = deleteCustomerAddress;

async function openPasswordModal() {
    const { value: formValues } = await Swal.fire({
        title: '🔒 Alterar Senha',
        html:
            `<input type="password" id="swal-current-pw" class="swal2-input" placeholder="Senha Atual" aria-label="Senha Atual" required>` +
            `<input type="password" id="swal-new-pw" class="swal2-input" placeholder="Nova Senha (mín. 6 caracteres)" aria-label="Nova Senha" required>` +
            `<input type="password" id="swal-confirm-pw" class="swal2-input" placeholder="Confirmar Nova Senha" aria-label="Confirmar Nova Senha" required>` +
            `<small style="display:block; text-align:left; color:#64748b; margin:10px 20px 0; line-height:1.4;">` +
            `Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.` +
            `</small>`,
        focusConfirm: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Alterar Senha',
        preConfirm: () => {
            const currentPw = document.getElementById('swal-current-pw').value;
            const newPw = document.getElementById('swal-new-pw').value;
            const confirmPw = document.getElementById('swal-confirm-pw').value;

            if (!currentPw || !newPw || !confirmPw) {
                Swal.showValidationMessage('Preencha todos os campos');
                return false;
            }

            if (newPw.length < 6) {
                Swal.showValidationMessage('A nova senha deve ter no mínimo 6 caracteres');
                return false;
            }

            if (newPw !== confirmPw) {
                Swal.showValidationMessage('As senhas não coincidem');
                return false;
            }

            return { currentPassword: currentPw, newPassword: newPw };
        }
    });

    if (formValues) {
        await changePassword(formValues.currentPassword, formValues.newPassword);
    }
}

async function changePassword(currentPassword, newPassword) {
    try {
        Swal.showLoading();

        // Update password via Supabase Auth
        const { error } = await window.supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        await Swal.fire({
            icon: 'success',
            title: 'Senha Alterada!',
            text: 'Sua senha foi atualizada com sucesso.',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (e) {
        console.error('Erro ao alterar senha:', e);
        Swal.fire({
            icon: 'error',
            title: 'Erro',
            text: e.message || 'Não foi possível alterar a senha. Verifique se a senha atual está correta.',
        });
    }
}

async function saveProfileData(updates) {
    try {
        Swal.showLoading();
        const user = authService.getCurrentUser();

        const { error } = await window.supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date() })
            .eq('id', user.id);

        if (error) throw error;

        await Swal.fire('Sucesso', 'Dados atualizados!', 'success');
        location.reload(); // Simple reload to reflect everything
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Falha ao salvar.', 'error');
    }
}


async function openOrderDetails(orderId) {
    try {
        Swal.fire({ title: 'Carregando detalhes...', didOpen: () => Swal.showLoading() });

        // Usa protocols (tabela principal, orders não existe)
        const { data: order, error } = await window.supabase
            .from('protocols')
            .select('*, protocol_items(*)')
            .eq('id', orderId)
            .single();

        if (error) throw error;

        const items = order.protocol_items || [];

        // Build HTML for items
        let itemsHtml = '<div style="text-align:left; max-height:300px; overflow-y:auto; margin-top:15px; border-top:1px solid #e2e8f0;">';

        if (items.length > 0) {
            itemsHtml += items.map(item => {
                let details = item.customization_details || {};
                if (typeof details === 'string') { try { details = JSON.parse(details); } catch (e) { } }

                let fileLink = '';
                if (details.fileUrl) {
                    const isExternalLink = details.fileUrl.includes('drive.google.com') || details.fileUrl.includes('wetransfer.com');
                    const iconClass = isExternalLink ? 'ph-link' : 'ph-file-pdf';
                    fileLink = `<div style="margin-top:4px;"><a href="${details.fileUrl}" target="_blank" style="color:#3b82f6; text-decoration:none; font-size:0.85rem; display:flex; align-items:center; gap:5px;"><i class="ph-bold ${iconClass}"></i> Ver Arquivo (${details.fileName || 'Documento'})</a></div>`;
                }

                let detailsHtml = '';
                if (details.printMode) detailsHtml += `<div style="font-size:0.75rem; color:#64748b;">Modo: ${details.printMode === 'color' ? 'Colorido' : 'P&B'}</div>`;
                if (details.text) detailsHtml += `<div style="font-size:0.75rem; color:#64748b;">${details.text}</div>`;

                return `
                <div style="padding:12px; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <div style="font-weight:600; color:#1e293b;">${item.product_name} <span style="font-weight:400; color:#94a3b8; font-size:0.85rem;">x${item.quantity}</span></div>
                        ${detailsHtml}
                        ${fileLink}
                    </div>
                    <div style="font-weight:600; color:#1e293b;">R$ ${Number(item.total_price || 0).toFixed(2)}</div>
                </div>`;
            }).join('');
        } else {
            itemsHtml += '<p style="padding:15px; text-align:center; color:#94a3b8;">Detalhes dos itens não disponíveis.</p>';
        }
        itemsHtml += '</div>';

        itemsHtml += `
            <div style="background:#f8fafc; padding:15px; border-radius:8px; margin-top:10px; text-align:right;">
                <div style="font-size:0.9rem; color:#64748b;">Total do Pedido</div>
                <div style="font-size:1.2rem; font-weight:700; color:#10b981;">R$ ${Number(order.total_amount || 0).toFixed(2)}</div>
            </div>
        `;

        const isConcluded = ['delivered', 'done', 'completed'].includes(order.status);
        if (isConcluded) {
            const existingReview = await getProtocolReview(order.id);
            itemsHtml += existingReview
                ? `<div style="margin-top:12px; padding:10px 12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; text-align:left; font-size:0.85rem;">
                    <strong>Sua avaliação:</strong> ${'⭐'.repeat(existingReview.rating)}<br>
                    ${existingReview.comment ? `<span style="color:#166534;">${existingReview.comment}</span>` : ''}
                   </div>`
                : `<button onclick="openReviewOrderModal('${order.id}')" style="width:100%; margin-top:12px; padding:10px; border-radius:8px; border:1px solid #f97316; background:white; color:#f97316; font-weight:600; cursor:pointer;">
                    <i class="ph-bold ph-star"></i> Avaliar Pedido / Atendimento
                   </button>`;
        }

        Swal.fire({
            title: `Pedido ${order.id}`,
            html: itemsHtml,
            width: '600px',
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#3b82f6'
        });

    } catch (err) {
        console.error("Error details:", err);
        Swal.fire('Erro', 'Não foi possível carregar os detalhes.', 'error');
    }
}

// === Avaliação de Pedido/Atendimento (protocol_reviews) ===

async function getProtocolReview(protocolId) {
    const user = window.authService?.getCurrentUser();
    if (!user || !window.supabase) return null;

    const { data } = await window.supabase
        .from('protocol_reviews')
        .select('*')
        .eq('protocol_id', protocolId)
        .eq('user_id', user.id)
        .maybeSingle();

    return data || null;
}

async function openReviewOrderModal(protocolId) {
    const user = window.authService?.getCurrentUser();
    if (!user || !window.supabase) return;

    const { value: formValues } = await Swal.fire({
        title: 'Avaliar Pedido',
        html:
            `<div style="font-size:2rem; margin-bottom:10px;" id="review-stars">
                ${[1, 2, 3, 4, 5].map(n => `<i class="ph-bold ph-star" data-star="${n}" onclick="window._selectedRating=${n}; document.querySelectorAll('#review-stars i').forEach((el,i)=>el.style.color = i < ${n} ? '#f59e0b' : '#cbd5e1');" style="cursor:pointer; color:#cbd5e1;"></i>`).join('')}
            </div>` +
            `<textarea id="review-comment" class="swal2-textarea" placeholder="Como foi o prazo e o atendimento? (opcional)" aria-label="Comentário"></textarea>`,
        showCancelButton: true,
        confirmButtonText: 'Enviar Avaliação',
        cancelButtonText: 'Cancelar',
        didOpen: () => { window._selectedRating = 0; },
        preConfirm: () => {
            const rating = window._selectedRating || 0;
            if (rating < 1) {
                Swal.showValidationMessage('Escolha de 1 a 5 estrelas');
                return false;
            }
            return { rating, comment: document.getElementById('review-comment').value.trim() };
        }
    });

    if (!formValues) return;

    const { error } = await window.supabase.from('protocol_reviews').insert({
        protocol_id: protocolId,
        user_id: user.id,
        rating: formValues.rating,
        comment: formValues.comment || null
    });

    if (error) {
        console.error('Erro ao salvar avaliação:', error);
        Swal.fire('Erro', 'Não foi possível registrar sua avaliação.', 'error');
        return;
    }

    Swal.fire('Obrigado!', 'Sua avaliação foi registrada.', 'success');
}

window.openReviewOrderModal = openReviewOrderModal;



// === WISHLIST LOGIC ===

async function loadWishlist() {
    const container = document.getElementById('wishlist-container');
    if (!container) return;

    if (!window.favoritesService) {
        console.warn("Favorites service not loaded");
        return;
    }

    const favoriteIds = window.favoritesService.getAll();

    if (favoriteIds.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="ph-duotone ph-heart-break" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 10px;"></i>
                <p>Sua lista de desejos está vazia.</p>
                <a href="../pages/index.html" class="btn-primary" style="display:inline-block; margin-top:15px; padding:10px 20px; border-radius:8px; text-decoration:none;">Explorar Produtos</a>
            </div>
        `;
        return;
    }

    try {
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .in('id', favoriteIds);

        if (error) throw error;

        window._wishlistProductsCache = products;

        const addAllBtn = `
            <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
                <button onclick="addAllFavoritesToCart()" style="padding:8px 16px; border-radius:8px; border:none; background:#1e293b; color:white; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="ph-bold ph-shopping-cart-simple"></i> Adicionar todos ao carrinho
                </button>
            </div>
        `;

        container.innerHTML = addAllBtn + products.map(item => `
            <div class="order-item" style="cursor:default; align-items:center;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="width:60px; height:60px; border-radius:8px; background-image:url('${item.image || '../assets/placeholder.jpg'}'); background-size:cover; background-position:center; border:1px solid #e2e8f0;"></div>
                    <div class="order-info">
                        <div class="order-id" style="font-size:1rem;">${item.name}</div>
                        <div class="order-date" style="color:#10b981; font-weight:600; font-size:0.9rem;">R$ ${Number(item.price || 0).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="order-actions" style="display:flex; gap:10px; align-items:center;">
                    <a href="produto.html?id=${item.id}" style="padding:8px 16px; border-radius:8px; border:none; background:#f97316; color:white; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; text-decoration:none; transition:background 0.2s;">
                        Voltar à Cotação
                    </a>
                    <button onclick="removeFromWishlist('${item.id}')" style="padding:8px 12px; border-radius:8px; border:1px solid #e2e8f0; background:white; color:#ef4444; cursor:pointer; transition:all 0.2s;" title="Remover">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error("Error loading wishlist products:", err);
        container.innerHTML = '<div style="color:#ef4444; padding:20px;">Erro ao carregar favoritos.</div>';
    }
}

function removeFromWishlist(id) {
    if (window.favoritesService) {
        window.favoritesService.remove(id).then(() => {
            loadWishlist();
        });
    }
}

function addAllFavoritesToCart() {
    const products = window._wishlistProductsCache || [];
    if (!products.length || !window.cartService) return;

    products.forEach(product => window.cartService.addToCart(product, 1));

    Swal.fire({
        icon: 'success',
        title: 'Adicionados ao carrinho!',
        text: `${products.length} ${products.length === 1 ? 'item foi adicionado' : 'itens foram adicionados'} ao seu orçamento.`,
        confirmButtonText: 'Ver Carrinho',
        showCancelButton: true,
        cancelButtonText: 'Continuar'
    }).then(result => {
        if (result.isConfirmed && window.cartService.toggle) window.cartService.toggle();
    });
}


async function reorderPurchase(orderId) {
    try {
        Swal.fire({ title: 'Adicionando ao carrinho...', didOpen: () => Swal.showLoading() });

        const { data: order, error } = await window.supabase
            .from('protocols')
            .select('*, protocol_items(*)')
            .eq('id', orderId)
            .single();

        if (error) throw error;

        const items = order.protocol_items || [];
        if (items.length === 0) {
            Swal.fire('Aviso', 'Este pedido não contém itens refazíveis.', 'warning');
            return;
        }

        let cartUpdated = false;

        for (const item of items) {
            let details = item.customization_details || {};
            if (typeof details === 'string') { try { details = JSON.parse(details); } catch (e) { } }

            // Construct product-like object for cartService
            const product = {
                id: item.product_id || `reorder-${item.id}`,
                name: item.product_name,
                price: item.unit_price || 0,
                image: details.image || 'assets/placeholder.jpg',
                fileUrl: details.fileUrl,
                fileName: details.fileName,
                configuration: details
            };

            let customText = details.text || 'Sem gravação';
            if (details.printMode) customText += ` (${details.printMode === 'color' ? 'Colorido' : 'P&B'})`;

            if (window.cartService) {
                window.cartService.addToCart(product, item.quantity, customText);
                cartUpdated = true;
            }
        }

        if (cartUpdated) {
            Swal.close();
            // Assuming cartService toggles the sidebar automatically, or redirect
            window.location.href = '../pages/index.html';
            // The sidebar toggle happens inside addToCart
        } else {
            Swal.fire('Erro', 'O serviço de carrinho não está disponível.', 'error');
        }

    } catch (err) {
        console.error("Error reordering:", err);
        Swal.fire('Erro', 'Falha ao processar o refazimento do pedido.', 'error');
    }
}

// === Notificações do Cliente (customer_notifications) ===
// Mesmo padrão do sino do admin (admin/js/admin.js fetchNotifications/
// updateNotificationsBadge/openNotificationsModal), filtrado por user_id.

async function fetchCustomerNotifications() {
    const user = window.authService?.getCurrentUser();
    if (!user || !window.supabase) return [];

    const { data, error } = await window.supabase
        .from('customer_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.warn('Notificações: falha ao buscar.', error);
        return [];
    }
    return data || [];
}

async function updateCustomerNotifBadge() {
    const badge = document.getElementById('customer-notif-badge');
    if (!badge) return;

    const notifications = await fetchCustomerNotifications();
    const unread = notifications.filter(n => !n.is_read).length;

    if (unread > 0) {
        badge.style.display = 'flex';
        badge.textContent = unread > 9 ? '9+' : String(unread);
    } else {
        badge.style.display = 'none';
    }
}

async function openCustomerNotifications() {
    const notifications = await fetchCustomerNotifications();

    const html = notifications.length
        ? notifications.map(n => `
            <div style="text-align:left; padding:10px 12px; border-bottom:1px solid #f1f5f9; ${n.is_read ? 'opacity:0.6;' : ''}">
                <strong style="display:block; font-size:0.9rem;">${n.title}</strong>
                <span style="display:block; font-size:0.82rem; color:#64748b; margin-top:2px;">${n.message || ''}</span>
                <span style="display:block; font-size:0.72rem; color:#94a3b8; margin-top:4px;">${new Date(n.created_at).toLocaleString('pt-BR')}</span>
            </div>
        `).join('')
        : '<div style="padding:20px; text-align:center; color:#94a3b8;">Nenhuma notificação por aqui.</div>';

    await Swal.fire({
        title: 'Notificações',
        html: `<div style="max-height:400px; overflow-y:auto; margin:0 -20px;">${html}</div>`,
        confirmButtonText: 'Fechar'
    });

    if (window.supabase && notifications.length) {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (unreadIds.length) {
            await window.supabase.from('customer_notifications').update({ is_read: true }).in('id', unreadIds);
        }
    }

    updateCustomerNotifBadge();
}

window.openCustomerNotifications = openCustomerNotifications;

// === Programa de Indicação ===
// Cupom pessoal por cliente (RPC get_my_referral_coupon, ver migration
// 2026-08-17_client_area_improvements.sql) — a tabela coupons não é
// legível pelo cliente direto, então o código só sai por essa função.

async function loadReferralCoupon() {
    const codeEl = document.getElementById('referral-code');
    const waLink = document.getElementById('referral-whatsapp-link');
    if (!codeEl || !window.supabase) return;

    try {
        const { data: code, error } = await window.supabase.rpc('get_my_referral_coupon');
        if (error) throw error;

        window._referralCode = code;
        codeEl.textContent = code;

        const texto = `Oi! Estou usando a Marca Viva e quero te indicar 🎁 Use o cupom *${code}* e ganhe 10% de desconto na sua primeira compra: ${window.location.origin}${window.location.pathname.replace('profile.html', 'index.html')}`;
        if (waLink) waLink.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    } catch (err) {
        console.warn('Indicação: não foi possível carregar o cupom.', err);
        codeEl.textContent = 'Indisponível no momento';
    }
}

function copyReferralCode() {
    const code = window._referralCode;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        Swal.fire({ icon: 'success', title: 'Copiado!', text: `Cupom ${code} copiado.`, timer: 1500, showConfirmButton: false });
    }).catch(() => {
        Swal.fire('Cupom', code, 'info');
    });
}

window.copyReferralCode = copyReferralCode;

// === Privacidade / LGPD (Art. 18) ===

async function exportMyData() {
    const user = window.authService?.getCurrentUser();
    if (!user) return;

    try {
        Swal.fire({ title: 'Preparando seus dados...', didOpen: () => Swal.showLoading() });

        const profile = window.currentUserProfile || {};
        let orders = window._classicOrdersCache;

        if (!orders) {
            const { data } = await window.supabase
                .from('protocols')
                .select('*, protocol_items(*)')
                .or(`client_id.eq.${user.id},client_email.eq.${user.email}`);
            orders = data || [];
        }

        const exportData = {
            gerado_em: new Date().toISOString(),
            dados_pessoais: {
                nome: profile.name || user.name,
                email: profile.email || user.email,
                telefone: profile.phone,
                cpf: profile.cpf,
                cnpj: profile.cnpj,
                endereco: profile.address
            },
            pedidos: orders
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meus-dados-marcaviva-${user.id}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        Swal.close();
    } catch (err) {
        console.error('Erro ao exportar dados:', err);
        Swal.fire('Erro', 'Não foi possível gerar a exportação dos seus dados. Tente novamente.', 'error');
    }
}

async function requestAccountDeletion() {
    const user = window.authService?.getCurrentUser();
    if (!user) return;

    const { value: confirmado } = await Swal.fire({
        icon: 'warning',
        title: 'Solicitar exclusão da conta',
        html: `Sua conta e seus dados pessoais serão removidos após análise da nossa equipe (histórico de pedidos pode ser mantido por obrigação fiscal, conforme nossa <a href="legal/politica-privacidade.html" target="_blank">Política de Privacidade</a>).<br><br>Deseja continuar?`,
        showCancelButton: true,
        confirmButtonText: 'Sim, solicitar exclusão',
        confirmButtonColor: '#ef4444',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmado) return;

    try {
        const { error } = await window.supabase.from('account_deletion_requests').insert({
            user_id: user.id,
            email: user.email
        });

        if (error) throw error;

        Swal.fire('Solicitação enviada', 'Recebemos seu pedido de exclusão. Nossa equipe vai analisar e entrar em contato pelo seu e-mail cadastrado.', 'success');
    } catch (err) {
        console.error('Erro ao solicitar exclusão de conta:', err);
        Swal.fire('Erro', 'Não foi possível registrar sua solicitação agora. Tente novamente ou fale com o suporte pelo chat.', 'error');
    }
}

window.exportMyData = exportMyData;
window.requestAccountDeletion = requestAccountDeletion;

document.addEventListener('DOMContentLoaded', loadProfile);
