// === USERS MANAGEMENT ===
// Add these functions to adminApp object in admin.js

async fetchUsers() {
    try {
        if (!window.supabase) {
            console.error('Supabase not initialized');
            return;
        }

        // Fetch all users from profiles table
        const { data: profiles, error } = await window.supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        this.users = profiles || [];
        this.renderUsersTable();
        this.updateUsersStats();
    } catch (err) {
        console.error('Error fetching users:', err);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao carregar usuários',
            text: err.message
        });
    }
},

renderUsersTable(filteredUsers = null) {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const usersList = filteredUsers || this.users || [];

    if (usersList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="ph-duotone ph-user-circle-x" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
                    Nenhum usuário encontrado
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = usersList.map(user => {
        const createdDate = new Date(user.created_at).toLocaleDateString('pt-BR');
        const lastLogin = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('pt-BR') : 'Nunca';

        const roleColors = {
            'admin': 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;',
            'user': 'background: #e0f2fe; color: #0369a1;'
        };

        const roleLabels = {
            'admin': 'Administrador',
            'user': 'Usuário'
        };

        const roleStyle = roleColors[user.role] || roleColors.user;
        const roleLabel = roleLabels[user.role] || roleLabels.user;

        // Generate avatar from initials
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

        return `
            <tr data-user-id="${user.id}">
                <td>
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem;">
                        ${initials}
                    </div>
                </td>
                <td style="font-weight: 600; color: #1e293b;">${user.name || 'Sem nome'}</td>
                <td style="color: #64748b;">${user.email}</td>
                <td>
                    <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; ${roleStyle}">
                        ${role Label
    }
                    </span >
                </td >
                <td style="color: #64748b; font-size: 0.9rem;">${createdDate}</td>
                <td style="color: #64748b; font-size: 0.9rem;">${lastLogin}</td>
                <td>
                    <button onclick="adminApp.deleteUserConfirm('${user.id}', '${user.email}')" 
                        class="btn-icon-danger" title="Remover usuário"
                        ${user.role === 'admin' ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            </tr >
        `;
    }).join('');
},

updateUsersStats() {
    const users = this.users || [];
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.last_sign_in_at).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    
    // New users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

    document.getElementById('stat-total-users').textContent = totalUsers;
    document.getElementById('stat-active-users').textContent = activeUsers;
    document.getElementById('stat-admin-users').textContent = adminUsers;
    document.getElementById('stat-new-users').textContent = newUsers;
},

filterUsersTable(query) {
    if (!this.users) return;
    
    const filtered = this.users.filter(user => {
        const searchText = query.toLowerCase();
        return (
            (user.name && user.name.toLowerCase().includes(searchText)) ||
            (user.email && user.email.toLowerCase().includes(searchText))
        );
    });
    
    this.renderUsersTable(filtered);
},

async deleteUserConfirm(userId, userEmail) {
    const result = await Swal.fire({
        title: 'Remover Usuário?',
        html: `
        < p style = "color: #64748b; margin-bottom: 16px;" > Você está prestes a remover:</p >
            <p style="font-weight: 600; color: #1e293b; font-size: 1.1rem;">${userEmail}</p>
            <p style="color: #ef4444; margin-top: 16px; font-size: 0.9rem;">
                <i class="ph-fill ph-warning"></i> Esta ação não pode ser desfeita!
            </p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, remover',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b'
    });

    if (result.isConfirmed) {
        await this.deleteUser(userId);
    }
},

async deleteUser(userId) {
    try {
        // Delete from profiles table (user auth will cascade)
        const { error } = await window.supabase
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        Swal.fire({
            icon: 'success',
            title: 'Usuário removido!',
            text: 'O usuário foi removido com sucesso.',
            timer: 2000,
            showConfirmButton: false
        });

        // Refresh list
        await this.fetchUsers();
    } catch (err) {
        console.error('Error deleting user:', err);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao remover usuário',
            text: err.message
        });
    }
},

async refreshUsers() {
    const btn = event.target.closest('button');
    const icon = btn.querySelector('i');
    icon.style.animation = 'spin 0.5s linear';
    
    await this.fetchUsers();
    
    setTimeout(() => {
        icon.style.animation = '';
    }, 500);
},
