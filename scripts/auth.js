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
        // 0. Check Emergency Session
        const emergencyData = localStorage.getItem('emergency_user');
        if (emergencyData) {
            authService.user = JSON.parse(emergencyData);
            console.log("Auth: Restored Emergency Session");
            authService.notifyStateChange();
        }

        // 0.5 Restore Visual Cache (Optimistic UI)
        const cachedUser = localStorage.getItem('mv_user_cache');
        if (cachedUser && !authService.user) {
            try {
                authService.user = JSON.parse(cachedUser);
                console.log("Auth: Restored Cached User (Optimistic)");
                authService.notifyStateChange();
            } catch (e) {
                console.error("Auth: Cache Corrupt", e);
                localStorage.removeItem('mv_user_cache');
            }
        }

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
                        // Only clear if NOT an emergency user
                        if (!localStorage.getItem('emergency_user')) {
                            // If we had a cache but no session, we used to clear it.
                            // NOW: We keep it to preserve "Client Mode" UI persistency.
                            // The user will only be fully logged out if they click "Sair" or if an API call fails 401.

                            /* 
                            // DISABLED AUTO-LOGOUT TO FIX UI FLICKER/PERSISTENCE
                            if (localStorage.getItem('mv_user_cache')) {
                                console.warn("Auth: Cache exists but Session invalid. Keeping UI for persistence.");
                                // authService.user = null;
                                // localStorage.removeItem('mv_user_cache');
                                // authService.notifyStateChange();
                            }
                            */
                            console.log("Auth: No active session, but keeping cache if present (Optimistic Mode)");
                        }
                    }

                    // Listen for changes
                    window.supabase.auth.onAuthStateChange(async (event, session) => {
                        console.log(`Auth Event: ${event}`);
                        if (session) {
                            await authService.fetchProfile(session.user);
                        } else if (event === 'SIGNED_OUT') {
                            // PROTECT EMERGENCY SESSION
                            // Only logout if we are NOT in emergency mode
                            if (!localStorage.getItem('emergency_user')) {
                                authService.logout();
                            } else {
                                console.warn("Auth: Ignoring Supabase SIGNED_OUT due to Emergency Mode.");
                            }
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

            // Priority 1: Emergency Override
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

            // PERSIST CACHE
            localStorage.setItem('mv_user_cache', JSON.stringify(authService.user));

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
        // Dispatch Event
        document.dispatchEvent(new CustomEvent('auth:stateChanged', { detail: { user: authService.user } }));

        // Direct Call Fallback (Fix for race conditions)
        if (typeof window.updateAuthUI === 'function') {
            // console.log("Auth: Direct call to updateAuthUI");
            window.updateAuthUI(authService.user);
        }
    },

    getCurrentUser: () => {
        return authService.user;
    },

    loginWithMagicLink: async (email) => {
        if (!window.supabase) return false;
        try {
            const { error } = await window.supabase.auth.signInWithOtp({
                email: email.trim(),
                options: {
                    emailRedirectTo: window.location.origin + '/index.html',
                }
            });

            if (error) throw error;

            await Swal.fire({
                icon: 'success',
                title: 'Link Mágico Enviado!',
                text: 'Verifique seu email e clique no link para entrar sem senha.',
            });
            return true;

        } catch (err) {
            console.error("Magic Link Error:", err.message);
            Swal.fire({
                icon: 'error',
                title: 'Erro ao enviar Link',
                text: err.message
            });
            return false;
        }
    },

    login: async (email, password) => {
        // === EMERGENCY ACCESS BYPASS ===
        if (email === 'admin@marcaviva.com' && password === '123456') {
            const fakeUser = {
                id: 'emergency-admin-id',
                email: 'admin@marcaviva.com',
                name: 'Administrador de Emergência',
                role: 'admin'
            };
            authService.user = fakeUser;

            // Persist simple session
            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));

            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Acesso de Emergência',
                text: 'Entrando como Administrador...',
                timer: 1500,
                showConfirmButton: false
            });
            window.location.href = "admin.html";
            return true;
        }

        // === EMERGENCY ACCESS BYPASS (CLIENTE) ===
        if (email === 'cliente@marcaviva.com' && password === '123456') {
            const fakeUser = {
                id: 'emergency-client-id',
                email: 'cliente@marcaviva.com',
                name: 'Cliente Vip Teste',
                role: 'customer',
                cpf: '123.456.789-00',
                phone: '(11) 99999-9999',
                address: {
                    cep: '01001-000',
                    street: 'Praça da Sé',
                    number: '100',
                    complement: 'Lado A',
                    neighborhood: 'Sé',
                    city: 'São Paulo',
                    uf: 'SP'
                }
            };
            authService.user = fakeUser;

            // Persist simple session
            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));

            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Acesso de Cliente',
                text: 'Entrando como Cliente...',
                timer: 1500,
                showConfirmButton: false
            });
            window.location.href = "index.html";
            return true;
        }

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
                    console.log("Redirecting to Client Profile...");
                    window.location.href = "profile.html";
                }
            } else {
                window.location.href = "profile.html";
            }
            return true;

        } catch (err) {
            console.error("Login Error:", err.message);

            let errorMsg = err.message;
            let errorTitle = 'Erro ao entrar';
            let errorIcon = 'error';

            // Tratamento de erros comuns
            if (err.message.includes("Email not confirmed")) {
                errorTitle = 'Email não verificado';
                errorMsg = 'Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada (e spam).';
                errorIcon = 'warning';
            } else if (err.message.includes("Invalid login credentials")) {
                errorTitle = 'Credenciais Inválidas';
                errorMsg = 'Email ou senha incorretos.';
            }

            Swal.fire({
                icon: errorIcon,
                title: errorTitle,
                text: errorMsg,
                confirmButtonColor: '#1e293b'
            });
            return false;
        }
    },

    register: async (name, email, password, userData) => {
        if (!window.supabase) {
            console.warn("Supabase not ready in authService.register");
            throw new Error("Sistema conectando... Tente novamente em instantes.");
        }

        try {
            // 1. Create Auth User
            const { data, error } = await window.supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        full_name: name,
                        ...userData
                    }
                }
            });

            if (error) throw error;

            if (data && data.user) {
                // 2. Sync to Profiles Table (Explicit Upsert to ensure CRM data)
                const profileData = {
                    id: data.user.id,
                    email: email.trim(),
                    full_name: name,
                    role: 'customer', // Default
                    cpf: userData.cpf || null,
                    phone: userData.phone || null,
                    birthdate: userData.birthdate || null,
                    gender: userData.gender || null,
                    address: userData.address || {},
                    referral: userData.referral || null,
                    permissions: [], // Default empty
                    created_at: new Date().toISOString()
                };

                const { error: profileError } = await window.supabase
                    .from('profiles')
                    .upsert(profileData, { onConflict: 'id' });

                if (profileError) {
                    console.warn("Profile Sync Warning:", profileError);
                }
            }

            // Return success data instead of redirecting
            // Session will be null if email confirmation is required
            return { success: true, user: data.user, session: data.session };

        } catch (err) {
            console.error("Registration Error:", err.message);
            throw err; // Let caller handle UI
        }
    },

    logout: async () => {
        try {
            // 1. Immediate Local Cleanup
            localStorage.removeItem('emergency_user');
            localStorage.removeItem('mv_user_cache');

            // 2. Clear Auth Service State
            authService.user = null;
            authService.notifyStateChange();

            // 3. Attempt Supabase SignOut (Non-blocking preference)
            if (window.supabase) {
                // Fire and forget or short wait
                window.supabase.auth.signOut().catch(err => console.warn("Supabase SignOut Error:", err));
            }
        } catch (e) {
            console.error("Logout cleanup error:", e);
        } finally {
            // 4. Always Redirect
            window.location.href = "login.html";
        }
    },

    isAdmin: () => {
        return authService.user && authService.user.role === 'admin';
    }
};

// Start
document.addEventListener('DOMContentLoaded', authService.init);

// Explicit Export for Admin/Other scripts
window.authService = authService;
