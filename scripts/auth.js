/**
 * Marca Viva - Authentication Service (Refactored)
 * Robust Supabase Client Usage & Emergency Admin Override
 */

const authService = {
    user: null,
    EMERGENCY_ADMIN_EMAIL: 'leivinjesus57@gmail.com',

    // Initialize: Listen for Supabase session changes
    isAuthenticated: () => {
        return !!authService.user;
    },

    init: async () => {
        // Wait for window.supabase to be available
        let attempts = 0;
        const waitForSupabase = setInterval(async () => {
            attempts++;
            if (window.supabase) {
                clearInterval(waitForSupabase);
                console.log("AuthService: Supabase detected, initializing...");

                try {
                    // Get initial session
                    const { data: { session }, error } = await window.supabase.auth.getSession();
                    if (error) console.error("Auth: Session error", error);

                    if (session) {
                        await authService.fetchProfile(session.user);
                    } else {
                        // Explicitly nullify and notify
                        authService.user = null;
                        authService.notifyStateChange();
                    }

                    // Listen for changes
                    window.supabase.auth.onAuthStateChange(async (event, session) => {
                        console.log(`Auth Event: ${event}`);
                        if (session) {
                            await authService.fetchProfile(session.user);
                        } else {
                            authService.user = null;
                            authService.notifyStateChange();
                        }
                    });

                } catch (err) {
                    console.error("AuthService Init Error:", err);
                }
            } else if (attempts > 50) { // 5 seconds timeout
                clearInterval(waitForSupabase);
                console.error("AuthService: Supabase not detected after timeout.");
            }
        }, 100);
    },

    // Fetch Profile with Emergency Override
    fetchProfile: async (authUser) => {
        if (!window.supabase) return null;

        try {
            // 1. Try to fetch profile from DB
            const { data: profile, error } = await window.supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            // 2. Determine Role (with Emergency Override)
            let role = 'customer';

            // Priority 1: Emergency Override (The "God Mode" for owner) - Case Insensitive
            const currentEmail = authUser.email ? authUser.email.toLowerCase() : '';
            const adminEmail = authService.EMERGENCY_ADMIN_EMAIL.toLowerCase();

            if (currentEmail === adminEmail) {
                role = 'admin';
                console.log("Auth: Emergency Admin Override Active for Owner.");
            }
            // Priority 2: DB Profile
            else if (profile && profile.role) {
                role = profile.role;
            }

            // 3. Construct User Object
            const name = profile?.full_name || authUser.user_metadata?.full_name || 'Usuário';

            authService.user = {
                id: authUser.id,
                email: authUser.email,
                name: name,
                role: role
            };

            console.log("Auth: User cached:", authService.user);

            // Notify UI
            authService.notifyStateChange();
            return authService.user;

        } catch (err) {
            console.error("Auth: Error fetching profile", err);
            return null;
        }
    },

    notifyStateChange: () => {
        document.dispatchEvent(new CustomEvent('auth:stateChanged', { detail: { user: authService.user } }));
    },

    getCurrentUser: () => {
        return authService.user;
    },

    login: async (email, password) => {
        // If called explicitly, we expect window.supabase to be there.
        // If not, the catch block will handle 'undefined' access if we try it.
        // But for better UX:
        if (!window.supabase) {
            alert("Sistema ainda conectando... aguarde 2 segundos.");
            return false;
        }

        try {
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) throw error;

            console.log("Login successful, fetching profile...");
            await authService.fetchProfile(data.user);

            // Redirect based on resolved role
            if (authService.user) {
                // alert(`Login SUCESSO! \nOlá, ${authService.user.name}.\nSeu nível de acesso é: ${authService.user.role.toUpperCase()}`);

                // SweetAlert Success
                await Swal.fire({
                    icon: 'success',
                    title: 'Login realizado!',
                    text: `Bem-vindo(a), ${authService.user.name}`,
                    timer: 2000,
                    showConfirmButton: false
                });

                if (authService.user.role === 'admin') {
                    console.log("Redirecting to Admin Panel...");
                    window.location.href = "admin.html";
                } else {
                    console.log("Redirecting to Shop...");
                    window.location.href = "index.html";
                }
            } else {
                window.location.href = "index.html";
            }
            return true;

        } catch (err) {
            console.error("Login Error:", err.message);
            // alert("Erro ao entrar: " + err.message);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao entrar',
                text: err.message
            });
            return false;
        }
    },

    register: async (name, email, password, type, doc) => {
        if (!window.supabase) {
            Swal.fire('Sistema conectando...', 'Aguarde alguns segundos.', 'info');
            return false;
        }

        try {
            const { data, error } = await window.supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        full_name: name,
                        user_type: type,
                        document: doc
                    }
                }
            });

            if (error) throw error;

            await Swal.fire({
                icon: 'success',
                title: 'Conta criada!',
                text: 'Redirecionando você...',
                timer: 2000,
                showConfirmButton: false
            });

            window.location.href = "index.html"; // Usually auto-logs in
            return true;

        } catch (err) {
            console.error("Registration Error:", err.message);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao cadastrar',
                text: err.message
            });
            return false;
        }
    },

    logout: async () => {
        if (window.supabase) {
            await window.supabase.auth.signOut();
        }
        window.location.href = "login.html";
    },

    isAdmin: () => {
        return authService.user && authService.user.role === 'admin';
    }
};

// Start
document.addEventListener('DOMContentLoaded', authService.init);

// Explicit Export for Admin/Other scripts
window.authService = authService;
