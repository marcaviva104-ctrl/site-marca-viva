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
        window.location.href = 'login.html';
        return;
    }

    // 2. Populate Hero Section
    document.getElementById('hero-name').textContent = user.name || 'Cliente';
    document.getElementById('hero-email').textContent = user.email || '...';

    const initials = (user.name || 'C').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('hero-avatar').textContent = initials;

    // Badge Logic (Simple for now)
    const isVip = user.role === 'vip'; // Example
    const badge = document.getElementById('hero-badge');
    if (isVip) {
        badge.textContent = 'Cliente VIP 💎';
        badge.style.background = 'linear-gradient(90deg, #8b5cf6, #d946ef)';
    } else {
        badge.textContent = 'Cliente Novo';
        badge.style.background = '#64748b';
    }

    // 3. Fetch Full Profile & Orders
    if (window.supabase) {
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            // Update Address Mini View
            updateAddressView(profile.address);

            // Store profile globally for edits
            window.currentUserProfile = profile;
        }

        // Load Orders (Async)
        loadMyOrders(user.id);
    }
}

function updateAddressView(addressData) {
    const el = document.getElementById('mini-address');
    if (!addressData || Object.keys(addressData).length === 0) {
        el.innerHTML = '<span style="color:#f59e0b">Endereço não cadastrado.</span><br>Clique em "Endereço" para adicionar.';
        return;
    }

    // Parse if string
    const addr = typeof addressData === 'string' ? JSON.parse(addressData) : addressData;

    // Build complete address
    let addressHtml = `<strong>${addr.street || 'Rua não inf.'}, ${addr.number || 'S/N'}</strong>`;
    if (addr.complement) {
        addressHtml += ` - ${addr.complement}`;
    }
    addressHtml += `<br>${addr.neighborhood || ''} - ${addr.city || ''}/${addr.state || ''}<br>CEP: ${addr.zip || ''}`;

    el.innerHTML = addressHtml;
}

async function loadMyOrders(userId) {
    const listEl = document.getElementById('orders-list-container');
    const countEl = document.getElementById('stat-orders-count');

    try {
        const { data: orders, error } = await window.supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId) // RLS must allow this
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        // Count total? Can use count() query or just length if small
        // Let's iterate to calc total spent for Gamification

        let totalSpent = 0;
        // Fetch ALL for total stats? (Expensive, maybe later limit 100)
        // For now just use these 5 for display

        if (!orders || orders.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8;">Você ainda não tem pedidos.</div>';
            if (countEl) countEl.textContent = '0';
            return;
        }

        if (countEl) countEl.textContent = orders.length; // Approximate if limited

        listEl.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('pt-BR');
            // Status Badges
            let statusClass = 'status-pending';
            let statusLabel = order.status || 'Pendente';

            if (statusLabel === 'paid' || statusLabel === 'approved') { statusClass = 'status-paid'; statusLabel = 'Pago'; }
            if (statusLabel === 'shipped') { statusClass = 'status-shipped'; statusLabel = 'Enviado'; }

            return `
            <div class="order-item">
                <div class="order-info">
                    <h4 style="font-weight:600;">Pedido #${order.id.toString().slice(0, 8)}...</h4>
                    <p>${date} • ${order.payment_method ? order.payment_method.toUpperCase() : 'PIX'}</p>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700; color:#1e293b;">R$ ${order.total.toFixed(2)}</div>
                    <span class="order-status ${statusClass}">${statusLabel}</span>
                </div>
            </div>
            `;
        }).join('');

        // Mock Gamification Update based on first order for demo
        // Ideally we sum all approved orders
        updateGamification(orders);

    } catch (err) {
        console.error("Error loading orders:", err);
        listEl.innerHTML = '<div style="color:#ef4444; padding:20px;">Erro ao carregar pedidos.</div>';
    }
}

function updateGamification(orders) {
    // Simple logic: Spent > 1000 = VIP
    const total = orders.reduce((acc, o) => acc + (o.total || 0), 0);
    const goal = 1000;
    const progress = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);

    document.getElementById('loyalty-bar').style.width = `${progress}%`;
    document.getElementById('loyalty-txt').innerText = remaining > 0
        ? `Faltam R$ ${remaining.toFixed(2)}`
        : 'Você é VIP!';

    if (progress >= 100) {
        document.getElementById('hero-badge').textContent = 'VIP MEMBER';
        document.getElementById('hero-badge').style.background = 'linear-gradient(90deg, #8b5cf6, #d946ef)';
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


document.addEventListener('DOMContentLoaded', loadProfile);
