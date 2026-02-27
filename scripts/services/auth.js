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
        // 0. Limpar sessões de emergência com UUIDs inválidos (legado)
        const INVALID_IDS = ['MASTER-ADMIN-BYPASS', 'undefined', 'null', ''];
        const ADMIN_UUID = '00000000-0000-0000-0000-000000000000';

        ['emergency_user', 'mv_user_cache'].forEach(key => {
            const raw = localStorage.getItem(key);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (INVALID_IDS.includes(parsed.id)) {
                        // Corrige o UUID inválido sem fazer logout
                        parsed.id = ADMIN_UUID;
                        localStorage.setItem(key, JSON.stringify(parsed));
                        console.warn(`Auth: UUID inválido no ${key} corrigido automaticamente.`);
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                }
            }
        });

        // 1. Check Emergency Session
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

        // Helper to Initialize
        const performInit = async () => {
            console.log("AuthService: Supabase detected, initializing...");
            try {
                // Get initial session
                const { data: { session }, error } = await window.supabase.auth.getSession();
                if (error) console.error("Auth: Session error", error);

                if (session) {
                    await authService.fetchProfile(session.user);
                } else {
                    if (!localStorage.getItem('emergency_user')) {
                        // User is Guest
                        console.log("Auth: No active session (Guest Mode)");
                        // Fire event to clear loading states if any
                        authService.notifyStateChange();
                    }
                }

                // Listen for changes
                window.supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log(`Auth Event: ${event}`);
                    if (session) {
                        // Marca que houve login recente (proteção pós-magic link)
                        if (event === 'SIGNED_IN') {
                            localStorage.setItem('mv_last_signin', Date.now().toString());
                        }
                        await authService.fetchProfile(session.user);
                    } else if (event === 'SIGNED_OUT') {
                        if (localStorage.getItem('emergency_user')) {
                            console.warn("Auth: Ignoring Supabase SIGNED_OUT due to Emergency Mode.");
                            return;
                        }

                        // Protege contra SIGNED_OUT espúrio logo após login OTP (primeiros 15s)
                        const lastSignin = parseInt(localStorage.getItem('mv_last_signin') || '0');
                        const secondsSinceLogin = (Date.now() - lastSignin) / 1000;
                        if (secondsSinceLogin < 15) {
                            console.warn("Auth: Ignoring SIGNED_OUT — login recente via magic link (", secondsSinceLogin.toFixed(1), "s atrás)");
                            return;
                        }

                        authService.logout();
                    }
                });

            } catch (err) {
                console.error("AuthService Init Error:", err);
            }
        };

        // 1. Check immediately
        if (window.supabase) {
            performInit();
            return;
        }

        // 2. Retry Logic (Smart Polling)
        // Checks every 50ms for up to 3 seconds. fixing race conditions without infinite loops.
        let attempts = 0;
        const maxAttempts = 60; // 3 seconds
        const waitForSupabase = setInterval(() => {
            attempts++;
            if (window.supabase) {
                clearInterval(waitForSupabase);
                performInit();
            } else if (attempts >= maxAttempts) {
                clearInterval(waitForSupabase);
                console.error("AuthService: Supabase NOT detected after 3s timeout. Check connection.");

                // Force UI update to remove spinners even if failed
                authService.notifyStateChange();

                // Only show alert if it's likely a real user interaction context, otherwise console is enough
                // to avoid spamming alerts on every page load if config is wrong.
                console.warn("AuthService: skipping alert to avoid spam.");
            }
        }, 50);
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
                role: role,
                approved: profile?.approved ?? false // Default to false if not set? Or true? Let's say false for security if we are strict, or true if legacy. User wants to approve NEW users. 
                // DB migration should set default to false for new users.
                // For this code, we just read what is there.
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
        const cleanEmail = email.toLowerCase().trim();

        // 1. Master Admin Bypass
        if (cleanEmail === 'leivinjesus57@gmail.com' && password === '123456') {
            const fakeUser = {
                id: '00000000-0000-0000-0000-000000000000',
                email: 'leivinjesus57@gmail.com',
                name: 'Leivin (Super Admin)',
                role: 'admin',
                approved: true
            };
            authService.user = fakeUser;
            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));

            await Swal.fire({
                icon: 'success',
                title: 'Modo Deus Ativado ⚡',
                text: 'Entrando como Super Admin...',
                timer: 1500,
                showConfirmButton: false
            });
            const getRootPath = () => window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            window.location.href = getRootPath() + "admin.html";
            return true;
        }

        // 1.5. NEW SHORTCUT ADMIN BYPASS (NO EMAIL VERIFICATION NEEDED)
        if (cleanEmail === 'leivin@marcaviva.com.br' && password === 'leivin100') {
            const fakeUser = {
                id: '00000000-0000-0000-0000-000000000009', // Unique ID for shortcut
                email: 'leivin@marcaviva.com.br',
                name: 'Leivin (Admin Teste)',
                role: 'admin',
                approved: true
            };
            authService.user = fakeUser;
            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));

            // To ensure the UI updates if not redirecting immediately
            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Login Mágico!',
                text: 'Acesso rápido liberado (Sem verificação de E-mail).',
                timer: 1500,
                showConfirmButton: false
            });
            const getRootPath = () => window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            window.location.href = getRootPath() + "admin.html";
            return true;
        }

        // 2. Legacy Emergency
        if (email === 'admin@marcaviva.com' && password === '123456') {
            const fakeUser = {
                id: '00000000-0000-0000-0000-000000000001',
                email: 'admin@marcaviva.com',
                name: 'Administrador de Emergência',
                role: 'admin'
            };
            authService.user = fakeUser;
            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));

            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Acesso de Emergência',
                text: 'Entrando como Administrador...',
                timer: 1500,
                showConfirmButton: false
            });
            const getRootPath = () => window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            window.location.href = getRootPath() + "admin.html";
            return true;
        }

        // === CONTA DE TESTE PARA CLIENTES ===
        if (email === 'teste@teste.com' && password === '123') {
            const fakeUser = {
                id: '00000000-0000-0000-0000-000000000003', // UUID válido para compatibilidade com banco
                email: 'teste@teste.com',
                name: 'Maria Santos',
                role: 'customer',
                cpf: '987.654.321-00',
                phone: '(11) 98888-7777',
                address: {
                    cep: '01310-100',
                    street: 'Av. Paulista',
                    number: '1578',
                    complement: 'Apto 42',
                    neighborhood: 'Bela Vista',
                    city: 'São Paulo',
                    uf: 'SP'
                }
            };
            authService.user = fakeUser;

            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));
            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Bem-vindo!',
                text: 'Login realizado com sucesso!',
                timer: 1500,
                showConfirmButton: false
            });
            const getRootPath = () => window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            window.location.href = getRootPath() + "index.html";
            return true;
        }

        // === NOVA CONTA DE TESTE (Cliente) ===
        if (email === 'cliente@teste.com' && password === '123456') {
            const fakeUser = {
                id: '00000000-0000-0000-0000-000000000002', // UUID válido para compatibilidade com banco
                email: 'cliente@teste.com',
                name: 'João Silva',
                role: 'customer',
                cpf: '123.456.789-00',
                phone: '(31) 98765-4321',
                address: {
                    cep: '30130-000',
                    street: 'Av. Afonso Pena',
                    number: '1500',
                    complement: 'Loja 2',
                    neighborhood: 'Centro',
                    city: 'Belo Horizonte',
                    uf: 'MG'
                }
            };
            authService.user = fakeUser;

            localStorage.setItem('emergency_user', JSON.stringify(fakeUser));
            authService.notifyStateChange();

            await Swal.fire({
                icon: 'success',
                title: 'Bem-vindo!',
                text: 'Login realizado com sucesso!',
                timer: 1500,
                showConfirmButton: false
            });
            const getRootPath = () => window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            window.location.href = getRootPath() + "index.html";
            return true;
        }

        // If called explicitly, we expect window.supabase to be there.
        // If not, the catch block will handle 'undefined' access if we try it.
        // But for better UX:
        if (!window.supabase) {
            Swal.fire({
                icon: 'info',
                title: 'Conectando',
                text: 'Sistema ainda conectando... aguarde 2 segundos.',
                timer: 2000,
                showConfirmButton: false
            });
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

            // Helper for redirects
            const getRootPath = () => {
                return window.location.pathname.toLowerCase().includes('/pages/') ? '../' : './';
            };

            // Redirect based on resolved role
            if (authService.user) {
                // SweetAlert Success already shown above

                if (authService.user.role === 'admin') {
                    console.log("Redirecting to Admin Panel...");
                    window.location.href = getRootPath() + "admin.html";
                } else {
                    if (authService.user.approved === false) {
                        await Swal.fire({
                            icon: 'info',
                            title: 'Aprovação Pendente',
                            text: 'Seu cadastro está em análise. Aguarde a aprovação do administrador.',
                            confirmButtonColor: '#3b82f6'
                        });
                        authService.logout(); // Logout if not approved
                        return false;
                    }

                    console.log("Redirecting to Home Page...");
                    window.location.href = getRootPath() + "index.html";
                }
            } else {
                window.location.href = getRootPath() + "index.html";
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

    logout: () => {
        // Limpa todos os dados locais imediatamente
        ['emergency_user', 'mv_user_cache', 'mv_last_order', 'mv_checkout_pending', 'mv_last_signin'].forEach(k => {
            localStorage.removeItem(k);
        });
        if (authService.user && authService.user.id) {
            localStorage.removeItem(`mv_cart_${authService.user.id}`);
        }

        authService.user = null;

        // Dispara signOut sem aguardar (não bloqueia)
        if (window.supabase) {
            window.supabase.auth.signOut().catch(() => { });
        }

        // Redireciona imediatamente
        const loginPath = window.location.pathname.toLowerCase().includes('/pages/')
            ? 'login.html'
            : 'pages/login.html';
        window.location.replace(loginPath);
    },


    isAdmin: () => {
        return authService.user && authService.user.role === 'admin';
    }
};

// Start
document.addEventListener('DOMContentLoaded', authService.init);

// Explicit Export for Admin/Other scripts
window.authService = authService;
