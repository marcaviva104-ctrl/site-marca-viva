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
        loadMyProtocols(user.id, email);
    }
}

async function loadMyProtocols(userId, email) {
    const listEl = document.getElementById('protocols-list-container');
    const countEl = document.getElementById('stat-quotes-count');
    try {
        let query = window.supabase
            .from('protocols')
            .select('*')
            .order('created_at', { ascending: false });

        // Filter: client_id OR email
        if (email) {
            query = query.or(`client_id.eq.${userId},client_email.eq.${email}`);
        } else {
            query = query.eq('client_id', userId);
        }

        const { data: protocols, error } = await query;
        if (error) throw error;

        if (!protocols || protocols.length === 0) {
            if (countEl) countEl.textContent = '0';
            listEl.innerHTML = '<div class="empty-state"><i class="ph-duotone ph-file-text"></i><p>Nenhum orçamento encontrado.</p></div>';
            return;
        }

        if (countEl) countEl.textContent = protocols.length;

        listEl.innerHTML = protocols.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('pt-BR');
            let badgeClass = 'badge-pending';
            let statusText = 'Pendente';
            if (p.status === 'approved' || p.status === 'in_production' || p.status === 'production') { badgeClass = 'badge-production'; statusText = 'Em Produção'; }
            if (p.status === 'done' || p.status === 'delivered') { badgeClass = 'badge-done'; statusText = 'Concluído'; }
            if (p.status === 'rejected') { badgeClass = 'badge-default'; statusText = 'Rejeitado'; }

            return `
            <div class="order-item">
                <div class="order-info">
                    <div class="order-id">Orçamento #${p.id.toString().slice(0, 8)}</div>
                    <div class="order-date">${date}</div>
                </div>
                <div class="order-meta">
                    <div class="order-total">R$ ${Number(p.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <span class="order-badge ${badgeClass}">${statusText}</span>
                </div>
            </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Erro loading protocols:", e);
        listEl.innerHTML = '<div style="color:#ef4444; padding:20px;">Erro ao carregar orçamentos.</div>';
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
    const listEl = document.getElementById('orders-list-container');
    const countEl = document.getElementById('stat-orders-count');

    try {
        const userEmail = window.authService?.getCurrentUser()?.email || '';

        // Build safe query (avoid broken OR when email is empty)
        let query = window.supabase
            .from('protocols')
            .select('*, protocol_items(*)')
            .order('created_at', { ascending: false })
            .limit(20);

        if (userEmail) {
            query = query.or(`client_id.eq.${userId},client_email.eq.${userEmail}`);
        } else {
            query = query.eq('client_id', userId);
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        if (!orders || orders.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Você ainda não tem pedidos.</div>';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (countEl) countEl.textContent = orders.length;

        listEl.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('pt-BR');
            let badgeClass = 'badge-default';
            let statusLabel = order.status || 'inquiry';

            if (statusLabel === 'inquiry' || statusLabel === 'pending') { badgeClass = 'badge-pending'; statusLabel = 'Pendente'; }
            else if (statusLabel === 'awaiting_payment') { badgeClass = 'badge-pending'; statusLabel = 'Aguardando Pagamento'; }
            else if (statusLabel === 'in_production' || statusLabel === 'production') { badgeClass = 'badge-production'; statusLabel = 'Em Produção'; }
            else if (statusLabel === 'delivered' || statusLabel === 'done') { badgeClass = 'badge-done'; statusLabel = 'Entregue'; }
            else { badgeClass = 'badge-default'; statusLabel = 'Pendente'; }

            return `
            <div class="order-item" onclick="openOrderDetails('${order.id}')">
                <div class="order-info">
                    <div class="order-id">${order.id}</div>
                    <div class="order-date">${date}</div>
                </div>
                <div class="order-meta">
                    <div class="order-total">R$ ${Number(order.total_amount || 0).toFixed(2)}</div>
                    <span class="order-badge ${badgeClass}">${statusLabel}</span>
                </div>
            </div>
            `;
        }).join('');

        updateGamification(orders.map(o => ({ total: Number(o.total_amount || 0) })));

    } catch (err) {
        console.error("Error loading orders:", err);
        listEl.innerHTML = '<div style="color:#ef4444; padding:20px;">Erro ao carregar pedidos.</div>';
    }
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
            `<input id="swal-name" class="swal2-input" placeholder="Nome Completo" value="${profile.full_name || ''}">` +
            `<input id="swal-phone" class="swal2-input" placeholder="Telefone" value="${profile.phone || ''}">` +
            `<input id="swal-cpf" class="swal2-input" placeholder="CPF" value="${profile.cpf || ''}">`,
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

async function openAddressModal() {
    const profile = window.currentUserProfile || {};
    const addr = typeof profile.address === 'string' ? JSON.parse(profile.address) : (profile.address || {});

    const { value: formValues } = await Swal.fire({
        title: '📍 Editar Endereço',
        html:
            `<input id="swal-zip" class="swal2-input" placeholder="CEP (apenas números)" value="${addr.zip || ''}" maxlength="8">` +
            `<small style="display:block; text-align:left; color:#64748b; margin:-10px 0 10px 0; padding:0 20px;">Digite o CEP e pressione Tab para auto-completar</small>` +
            `<input id="swal-street" class="swal2-input" placeholder="Rua" value="${addr.street || ''}">` +
            `<input id="swal-num" class="swal2-input" placeholder="Número" value="${addr.number || ''}" style="width:48%; display:inline-block;">` +
            `<input id="swal-complement" class="swal2-input" placeholder="Complemento" value="${addr.complement || ''}" style="width:48%; display:inline-block; margin-left:4%;">` +
            `<input id="swal-neighborhood" class="swal2-input" placeholder="Bairro" value="${addr.neighborhood || ''}">` +
            `<input id="swal-city" class="swal2-input" placeholder="Cidade" value="${addr.city || ''}" style="width:70%; display:inline-block;">` +
            `<input id="swal-state" class="swal2-input" placeholder="UF" value="${addr.state || ''}" maxlength="2" style="width:26%; display:inline-block; margin-left:4%; text-transform:uppercase;">`,
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
                address: {
                    zip: document.getElementById('swal-zip').value,
                    street: document.getElementById('swal-street').value,
                    number: document.getElementById('swal-num').value,
                    complement: document.getElementById('swal-complement').value,
                    neighborhood: document.getElementById('swal-neighborhood').value,
                    city: document.getElementById('swal-city').value,
                    state: document.getElementById('swal-state').value.toUpperCase()
                }
            }
        }
    });

    if (formValues) {
        await saveProfileData(formValues);
    }
}

async function openPasswordModal() {
    const { value: formValues } = await Swal.fire({
        title: '🔒 Alterar Senha',
        html:
            `<input type="password" id="swal-current-pw" class="swal2-input" placeholder="Senha Atual" required>` +
            `<input type="password" id="swal-new-pw" class="swal2-input" placeholder="Nova Senha (mín. 6 caracteres)" required>` +
            `<input type="password" id="swal-confirm-pw" class="swal2-input" placeholder="Confirmar Nova Senha" required>` +
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



document.addEventListener('DOMContentLoaded', loadProfile);
