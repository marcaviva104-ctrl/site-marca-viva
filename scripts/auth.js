/**
 * Marca Viva - Authentication Logic
 * Handles saving users to localStorage and managing sessions.
 */

const STORAGE_KEY_USERS = 'marcaViva_users';
const STORAGE_KEY_SESSION = 'marcaViva_session';

class AuthService {
    constructor() {
        this.users = JSON.parse(localStorage.getItem(STORAGE_KEY_USERS)) || [];
    }

    // Register a new user
    register(name, email, password) {
        // Check if user already exists
        const exists = this.users.find(u => u.email === email);
        if (exists) {
            alert('Este email já está cadastrado!'); // Added alert as per instruction
            return { success: false, message: 'Este email já está cadastrado.' };
        }

        const newUser = {
            id: Date.now().toString(), // Changed to string as per instruction
            name,
            email,
            password, // Note: In a real app, never store passwords as plain text!
            role: email === 'leivinjesus57@gmail.com' ? 'admin' : 'customer' // Admin logic added
        };

        this.users.push(newUser);
        this.saveUsers();

        // Auto-login after register
        this.login(email, password);

        return { success: true, message: 'Conta criada com sucesso!' };
    }

    // Login user
    login(email, password) {
        const user = this.users.find(u => u.email === email && u.password === password);
        if (user) {
            const sessionUser = { ...user };
            delete sessionUser.password; // Don't keep password in session

            // Should be 'admin' if email matches, regardless of old data
            if (email === 'leivinjesus57@gmail.com') {
                sessionUser.role = 'admin';
            }

            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(sessionUser));
            return { success: true, user: sessionUser };
        }
        alert('Email ou senha inválidos!'); // Added alert as per instruction
        return { success: false, message: 'Email ou senha incorretos.' };
    }

    // Logout
    logout() {
        localStorage.removeItem(STORAGE_KEY_SESSION);
        window.location.href = 'login.html';
    }

    // Get current logged user
    getCurrentUser() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_SESSION));
    }

    saveUsers() {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
    }
}

// UI Handling
const authService = new AuthService();

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Toggle between Login and Register views
    window.toggleAuthMode = (mode) => {
        if (mode === 'register') {
            document.getElementById('login-view').classList.add('hidden');
            document.getElementById('register-view').classList.remove('hidden');
            document.getElementById('form-title').innerText = 'Criar Conta';
            document.getElementById('form-subtitle').innerText = 'Junte-se à Marca Viva';
        } else {
            document.getElementById('register-view').classList.add('hidden');
            document.getElementById('login-view').classList.remove('hidden');
            document.getElementById('form-title').innerText = 'Bem-vindo de volta!';
            document.getElementById('form-subtitle').innerText = 'Acesse sua conta';
        }
    };

    // Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('input[type="email"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            const result = authService.login(email, password);

            if (result.success) {
                alert(`Bem-vindo, ${result.user.name}!`);
                window.location.href = 'index.html'; // Redirect to home (we will create this next)
            } else {
                alert(result.message);
            }
        });
    }

    // Handle Register Submit
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = registerForm.querySelector('input[name="name"]').value;
            const email = registerForm.querySelector('input[name="email"]').value;
            const password = registerForm.querySelector('input[name="password"]').value;

            const result = authService.register(name, email, password);

            if (result.success) {
                alert('Conta criada! Redirecionando...');
                window.location.href = 'index.html';
            } else {
                alert(result.message);
            }
        });
    }
});
