/**
 * Marca Viva - Profile Handler
 */

async function loadProfile() {
    // Wait for auth
    let attempts = 0;
    while (!window.authService && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }

    const user = authService.getCurrentUser();
    if (!user) {
        // If not logged in, redirect
        // But maybe wait a bit if authService is still initializing?
        setTimeout(() => {
            if (!authService.getCurrentUser()) window.location.href = 'login.html';
        }, 1000);
        return;
    }

    // Fill Basic Info
    document.getElementById('name').value = user.name || '';
    document.getElementById('email').value = user.email || '';

    // We need to fetch FULL profile data (including address) which might not be in authUser object completely
    // if fetchProfile didn't get everything.
    // Let's refetch from 'profiles' table directly to be sure.

    if (window.supabase) {
        const { data: profile } = await window.supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            document.getElementById('doc').value = profile.cpf || '';
            document.getElementById('phone').value = profile.phone || '';

            if (profile.address) {
                const addr = typeof profile.address === 'string' ? JSON.parse(profile.address) : profile.address;
                document.getElementById('zip').value = addr.zip || '';
                document.getElementById('street').value = addr.street || '';
                document.getElementById('number').value = addr.number || '';
                document.getElementById('complement').value = addr.complement || '';
                document.getElementById('neighborhood').value = addr.neighborhood || '';
                document.getElementById('city').value = addr.city || '';
            }
        }
    } else {
        // Fallback or Emergency User
        if (user.id.includes('emergency')) {
            document.getElementById('doc').value = '000.000.000-00';
            document.getElementById('phone').value = '1199999999';
        }
    }
}

async function saveProfile() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const updates = {
        full_name: document.getElementById('name').value,
        cpf: document.getElementById('doc').value,
        phone: document.getElementById('phone').value,
        address: {
            zip: document.getElementById('zip').value,
            street: document.getElementById('street').value,
            number: document.getElementById('number').value,
            complement: document.getElementById('complement').value,
            neighborhood: document.getElementById('neighborhood').value,
            city: document.getElementById('city').value
        },
        updated_at: new Date()
    };

    try {
        Swal.fire({
            title: 'Salvando...',
            didOpen: () => Swal.showLoading()
        });

        if (window.supabase) {
            const { error } = await window.supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (error) throw error;
        }

        // Update local auth user wrapper if name changed
        if (updates.full_name !== user.name) {
            user.name = updates.full_name;
            // re-cache? authService doesn't expose a 'setUser' but it updates internal state usually on refetch.
            // We can force a reload.
        }

        await Swal.fire({
            icon: 'success',
            title: 'Perfil Atualizado!',
            timer: 1500,
            showConfirmButton: false
        });

    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível salvar os dados.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadProfile);
