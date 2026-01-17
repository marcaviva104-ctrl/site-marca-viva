// === MODAL AUTH LOGIC ===
window.toggleMainLoginModal = (show) => {
    const overlay = document.getElementById('auth-overlay');
    if (show) {
        overlay.classList.add('active');
        // Reset to login view by default
        switchAuthTab('login');
    } else {
        overlay.classList.remove('active');
    }
}

window.switchAuthTab = (mode) => {
    const indicator = document.getElementById('auth-indicator');
    const btns = document.querySelectorAll('.auth-tabs .tab-btn');
    const loginForm = document.getElementById('modalLoginForm');
    const registerForm = document.getElementById('modalRegisterForm');
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');

    if (mode === 'login') {
        indicator.style.transform = 'translateX(0)';
        if (btns[0]) btns[0].classList.add('active');
        if (btns[1]) btns[1].classList.remove('active');

        loginForm.style.display = 'block';
        registerForm.style.display = 'none';

        title.innerText = "Acesse sua conta";
        subtitle.innerText = "Bem-vindo de volta à Marca Viva";
    } else {
        indicator.style.transform = 'translateX(100%)';
        if (btns[1]) btns[1].classList.add('active');
        if (btns[0]) btns[0].classList.remove('active');

        loginForm.style.display = 'none';
        registerForm.style.display = 'block';

        title.innerText = "Novo por aqui?";
        subtitle.innerText = "Crie sua conta e ganhe 10% off no primeiro kit.";
    }
}

window.submitModalLogin = async () => {
    const email = document.getElementById('modal-login-email').value;
    const pass = document.getElementById('modal-login-password').value;
    const btn = document.querySelector('#modalLoginForm .btn-submit');

    if (!email || !pass) return Swal.fire('Campos vazios', 'Preencha email e senha', 'warning');

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Entrando...';
    btn.disabled = true;

    try {
        const success = await authService.login(email, pass);
        if (success) {
            toggleMainLoginModal(false);
            // SweetAlert is handled in authService.login usually, but we can close modal instantly
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

window.toggleModalRegisterType = () => {
    const typeInput = document.getElementById('modal-reg-type');
    const toggleBtn = document.getElementById('btn-toggle-type');
    const lblSurname = document.getElementById('lbl-surname');
    const lblCpf = document.getElementById('lbl-cpf');
    const inputSurname = document.getElementById('modal-reg-surname');
    const inputCpf = document.getElementById('modal-reg-cpf');

    if (typeInput.value === 'pf') {
        // Switch to PJ
        typeInput.value = 'pj';
        toggleBtn.innerText = 'Criar conta pessoal';
        lblSurname.innerText = 'Razão Social *';
        lblCpf.innerText = 'CNPJ *';
        // inputSurname.placeholder = "Razão Social da empresa"; // Optional
        // inputCpf.placeholder = "00.000.000/0000-00"; // Optional
    } else {
        // Switch to PF
        typeInput.value = 'pf';
        toggleBtn.innerText = 'Criar conta corporativa';
        lblSurname.innerText = 'Sobrenome *';
        lblCpf.innerText = 'CPF *';
        // inputSurname.placeholder = ""; 
        inputCpf.placeholder = "Somente números";
    }
}

window.submitModalRegister = async () => {
    // Extended Register for Modal (Drika Style)
    const type = document.getElementById('modal-reg-type') ? document.getElementById('modal-reg-type').value : 'pf';

    const name = document.getElementById('modal-reg-name').value;
    const surname = document.getElementById('modal-reg-surname').value;
    const cpfOrCnpj = document.getElementById('modal-reg-cpf').value;
    const phone = document.getElementById('modal-reg-phone').value;
    const email = document.getElementById('modal-reg-email').value;
    const pass = document.getElementById('modal-reg-pass').value;

    const btn = document.querySelector('#modalRegisterForm .btn-submit');

    if (!name || !surname || !email || !pass || !cpfOrCnpj || !phone) return Swal.fire('Campos vazios', 'Preencha todos os campos obrigatórios', 'warning');

    const fullName = `${name} ${surname}`.trim();

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Processando...';
    btn.disabled = true;

    try {
        const userData = {
            phone: phone,
            role: 'customer',
            address: {},
            type: type // Save type 'pf' or 'pj'
        };

        if (type === 'pj') {
            userData.cnpj = cpfOrCnpj;
            userData.cpf = ''; // Clear CPF if PJ
        } else {
            userData.cpf = cpfOrCnpj;
            userData.cnpj = ''; // Clear CNPJ if PF
        }

        const success = await authService.register(fullName, email, pass, userData);
        if (success) {
            toggleMainLoginModal(false);
        }
    } catch (e) {
        console.error(e);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
const SidebarManager = {
    init: (user) => {
        if (document.getElementById('user-sidebar')) {
            // Update User Info if already exists
            // But usually safer to re-render or leave as is if names match using explicit update logic
            // For now, let's remove old and re-add if needed, or check if it exists
            document.getElementById('user-sidebar').remove();
            if (document.getElementById('user-sidebar-overlay')) document.getElementById('user-sidebar-overlay').remove();
        }

        const isAdmin = user.role === 'admin';

        const sidebar = document.createElement('div');
        sidebar.id = 'user-sidebar';
        sidebar.className = 'user-sidebar';

        // Content
        sidebar.innerHTML = `
    < button class="sidebar-close" onclick = "SidebarManager.toggle()" > <i class="ph-bold ph-x"></i></button >
            
            <div class="sidebar-header">
                <div class="sidebar-avatar">
                   <i class="ph-duotone ph-user"></i>
                </div>
                <div class="sidebar-user-info">
                    <h3>${user.name.split(' ')[0]}</h3>
                    <!-- Link Removed -->
                </div>
            </div>

            <div class="sidebar-content">
                ${isAdmin ? `
                <div class="sidebar-group">
                    <div class="sidebar-group-title">Gestão</div>
                    <a href="admin.html" class="sidebar-item">
                        <i class="ph-duotone ph-crown"></i> Painel Admin
                    </a>
                </div>
                ` : ''}

                <div class="sidebar-group">
                    <div class="sidebar-group-title">Compras</div>
                    <a href="orders.html" class="sidebar-item">
                        <i class="ph-duotone ph-package"></i> Meus Pedidos
                    </a>
                    <a href="#" onclick="cartService.toggle(); SidebarManager.toggle()" class="sidebar-item">
                        <i class="ph-duotone ph-shopping-cart"></i> Carrinho
                    </a>
                    <a href="index.html#catalogo" class="sidebar-item">
                        <i class="ph-duotone ph-storefront"></i> Catálogo de Produtos
                    </a>
                </div>

                <div class="sidebar-group">
                    <div class="sidebar-group-title">Minha Conta</div>
                    <a href="profile.html" class="sidebar-item">
                        <i class="ph-duotone ph-user-gear"></i> Dados Pessoais
                    </a>
                    <a href="profile.html" class="sidebar-item">
                        <i class="ph-duotone ph-map-pin"></i> Endereços
                    </a>
                </div>
                
                <div class="sidebar-group">
                    <div class="sidebar-group-title">Atendimento</div>
                     <a href="https://wa.me/5511999999999" target="_blank" class="sidebar-item">
                        <i class="ph-duotone ph-whatsapp-logo"></i> Fale Conosco
                    </a>
                </div>
                
                 <div class="sidebar-group" style="border-bottom:none;">
                     <button onclick="authService ? authService.logout() : window.location.reload()" class="sidebar-item" style="width:100%; text-align:left; background:none; border:none; color: #ef4444; cursor: pointer; padding: 12px 15px; display: flex; align-items: center; gap: 10px; font-size: 0.95rem;">
                        <i class="ph-bold ph-sign-out"></i> Sair da Conta
                    </button>
                </div>
            </div>
`;
        document.body.appendChild(sidebar);

        const overlay = document.createElement('div');
        overlay.id = 'user-sidebar-overlay';
        overlay.className = 'user-sidebar-overlay';
        overlay.onclick = () => SidebarManager.toggle();
        document.body.appendChild(overlay);
    },

    toggle: () => {
        const sidebar = document.getElementById('user-sidebar');
        const overlay = document.getElementById('user-sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
    }
};

window.SidebarManager = SidebarManager;

function updateAuthUI(user) {
    try {
        const nav = document.getElementById('user-nav');
        if (!nav) return;

        // FIX: Do not render User/Cart header on the dedicated Login Page to avoid confusion
        if (window.location.pathname.includes('login.html')) {
            return;
        }

        // Sticky Cache Strategy
        if (!user) {
            const cached = localStorage.getItem('mv_user_cache');
            if (cached) {
                try {
                    user = JSON.parse(cached);
                    console.log("UI Auth: Used Sticky Cache");
                } catch (e) {
                    console.warn("UI Auth: Cache parse error", e);
                }
            }
        }

        // Initialize Sidebar if user exists
        if (user) SidebarManager.init(user);

        // Cart Button Logic
        const cartButtonHtml = `
            <button onclick="if(window.cartService) window.cartService.toggle()" class="btn btn-ghost" style="position: relative; margin-right: 10px;">
                <i class="ph-bold ph-shopping-cart" style="font-size: 1.3rem;"></i>
                <span class="cart-count-badge" style="position: absolute; top: 0; right: 0; background: var(--accent-orange); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 0.65rem; display: none; align-items: center; justify-content: center;">0</span>
            </button>
        `;

        if (user) {
            // LOGGED IN VIEW - RESTORED
            nav.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    ${cartButtonHtml}
                    
                    ${user.role === 'admin' ? `
                        <a href="admin.html" class="btn btn-ghost" style="color: var(--accent-orange); font-weight: 600; border: 1px solid rgba(234, 88, 12, 0.4); padding: 6px 12px; border-radius: 6px; text-decoration: none;">
                            <i class="ph-bold ph-crown"></i> Admin
                        </a>
                    ` : ''}
                    
                    <a href="#" onclick="SidebarManager.toggle()" style="text-decoration: none;">
                        <span style="font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 8px;">
                            <i class="ph-duotone ph-user-circle" style="font-size: 1.4rem;"></i>
                            <span style="display: inline-block;">${user.name ? user.name.split(' ')[0] : 'Minha Conta'}</span>
                            <i class="ph-bold ph-caret-down" style="font-size: 0.8rem; color: #94a3b8;"></i>
                        </span>
                    </a>
                </div>
            `;

            if (typeof cartSvc !== 'undefined') {
                setTimeout(() => { try { cartSvc.updateCount() } catch (e) { } }, 100);
            }

        } else {
            // GUEST VIEW (Non-Client)
            // Show "Crie sua conta" and "Entre" links
            nav.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <!-- Separated Links -->
                    <a href="login.html?mode=register" style="color: #64748b; font-weight: 500; text-decoration: none; font-size: 0.9rem;">
                        Crie sua conta
                    </a>
                    <a href="login.html?mode=login" class="btn btn-ghost" style="color: var(--accent-orange); font-weight: 600;">
                        Entre
                    </a>
                </div>
            `;
        }

        // === Navigation Link Logic ===
        // User requested to REMOVE "Meus Pedidos" from main nav (keep only in sidebar)
        const mainNavEntries = document.getElementById('main-nav-links');
        if (mainNavEntries) {
            let ordersLink = mainNavEntries.querySelector('a[href="orders.html"]');
            if (ordersLink) {
                ordersLink.remove();
            }
        }

    } catch (err) {
        console.error("UI Auth Error:", err);
    }
}

// Make it global
window.updateAuthUI = updateAuthUI;

// Listen for auth changes
document.addEventListener('auth:stateChanged', (e) => {
    updateAuthUI(e.detail.user);
});

// Initial Check
document.addEventListener('DOMContentLoaded', () => {
    if (typeof authService !== 'undefined') {
        const user = authService.getCurrentUser();
        if (user) updateAuthUI(user);
        else updateAuthUI(null); // Ensure guest state triggers
    }
});
