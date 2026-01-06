/**
 * Marca Viva - Internal Chat System
 * Replaces WhatsApp with a real-time (simulated) chat
 */

const ChatManager = {
    STORAGE_KEY: 'mv_chats',
    currentUserInfo: null, // { email, name, type: 'client'|'admin' }

    init() {
        this.renderWidget();
        this.bindEvents();
        // Check for logged user from authService if available
        if (typeof authService !== 'undefined') {
            const user = authService.getCurrentUser();
            if (user) {
                this.currentUserInfo = {
                    email: user.email,
                    name: user.name,
                    type: user.role === 'admin' ? 'admin' : 'client'
                };
            }
        }
    },

    // --- Data Logic ---

    getChats() {
        return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    },

    resetSession() {
        if (confirm('Deseja encerrar este atendimento e iniciar como outro usuário?')) {
            localStorage.removeItem('mv_anon_email');
            localStorage.removeItem('mv_anon_name');
            location.reload();
        }
    },

    saveChats(chats) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(chats));
    },

    addMessage(userEmail, sender, text, userName = 'Visitante') {
        const chats = this.getChats();

        if (!chats[userEmail]) {
            chats[userEmail] = {
                userName: userName,
                messages: [],
                unread: 0,
                lastUpdate: Date.now()
            };
        } else {
            // Update name if valid and not default
            if (userName && userName !== 'Visitante') {
                chats[userEmail].userName = userName;
            }
        }

        const msg = {
            sender: sender, // 'client' or 'admin'
            text: text,
            timestamp: Date.now()
        };

        chats[userEmail].messages.push(msg);
        chats[userEmail].lastUpdate = Date.now();

        if (sender === 'client') {
            chats[userEmail].unread++; // Admin sees unread
        }

        this.saveChats(chats);
        return msg;
    },

    getMessages(userEmail) {
        const chats = this.getChats();
        return chats[userEmail] ? chats[userEmail].messages : [];
    },

    // --- UI Rendering (Client Widget) ---

    renderWidget() {
        // Do not render if Admin (Admin has its own panel)
        // actually, admin might want to chat as a user too, but let's hide it for now if on admin page
        if (window.location.href.includes('admin.html')) return;

        const widget = document.createElement('div');
        widget.id = 'mv-chat-widget';
        widget.innerHTML = `
            <div id="chat-bubble" onclick="ChatManager.toggleChat()">
                <i class="ph-bold ph-chat-teardrop-text"></i>
                <span id="chat-unread-badge" style="display:none">0</span>
            </div>

            <div id="chat-window">
                <div class="chat-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="background: white; border-radius: 50%; padding: 4px; color: var(--accent-orange);">
                            <i class="ph-bold ph-headset" style="font-size: 1.2rem;"></i>
                        </div>
                        <div>
                            <span id="chat-header-title" style="font-weight: 700; font-size: 0.95rem; display: block;">Suporte Marca Viva</span>
                            <span id="chat-header-subtitle" style="font-size: 0.75rem; opacity: 0.8;">Online agora</span>
                        </div>
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button onclick="ChatManager.resetSession()" title="Sair do Chat" style="background:none; border:none; color:white; cursor:pointer;">
                            <i class="ph-bold ph-sign-out"></i>
                        </button>
                        <button onclick="ChatManager.toggleChat()" style="background:none; border:none; color:white; cursor:pointer;">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                </div>

                <div id="chat-messages">
                    <div class="chat-welcome">
                        <p>Olá! Como podemos ajudar você com seus brindes hoje? 🎁</p>
                    </div>
                </div>

                <div id="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Digite sua dúvida..." onkeypress="ChatManager.handleInput(event)">
                    <button onclick="ChatManager.sendMessage()" id="chat-send-btn">
                        <i class="ph-fill ph-paper-plane-right"></i>
                    </button>
                </div>
            </div>

            <style>
                #mv-chat-widget {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    z-index: 9999;
                    font-family: 'Inter', sans-serif;
                }

                #chat-bubble {
                    width: 60px;
                    height: 60px;
                    background: var(--accent-orange, #ea580c);
                    border-radius: 50%;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(234, 88, 12, 0.4);
                    transition: transform 0.2s;
                }

                #chat-bubble:hover {
                    transform: scale(1.1);
                }

                #chat-window {
                    display: none;
                    position: absolute;
                    bottom: 80px;
                    right: 0;
                    width: 350px;
                    height: 500px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }

                #chat-window.open {
                    display: flex;
                }

                .chat-header {
                    background: var(--accent-orange, #ea580c);
                    color: white;
                    padding: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                #chat-messages {
                    flex: 1;
                    padding: 15px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    background: #f8fafc;
                }

                .msg {
                    max-width: 80%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    line-height: 1.4;
                    position: relative;
                }

                .msg.client {
                    align-self: flex-end;
                    background: var(--accent-orange, #ea580c);
                    color: white;
                    border-bottom-right-radius: 2px;
                }

                .msg.admin {
                    align-self: flex-start;
                    background: white;
                    border: 1px solid #e2e8f0;
                    color: #1e293b;
                    border-bottom-left-radius: 2px;
                }

                #chat-input-area {
                    padding: 10px;
                    border-top: 1px solid #e2e8f0;
                    background: white;
                    display: flex;
                    gap: 10px;
                }

                #chat-input {
                    flex: 1;
                    padding: 10px 15px;
                    border: 1px solid #cbd5e1;
                    border-radius: 25px;
                    outline: none;
                    font-family: inherit;
                }

                #chat-send-btn {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: var(--accent-orange, #ea580c);
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
        `;
        document.body.appendChild(widget);
    },

    toggleChat() {
        const win = document.getElementById('chat-window');
        if (win.style.display === 'flex') {
            win.style.display = 'none';
        } else {
            win.style.display = 'flex';
            this.loadMessages();
            // Focus input
            setTimeout(() => document.getElementById('chat-input').focus(), 100);
        }
    },

    loadMessages() {
        const container = document.getElementById('chat-messages');
        const userEmail = this.getUserEmail();
        const userInfo = this.getCurrentUserInfo();

        // Update Header with Name if logged in
        if (userInfo) {
            document.getElementById('chat-header-title').innerText = `Olá, ${userInfo.name.split(' ')[0]}!`;
            document.getElementById('chat-header-subtitle').innerText = 'Como podemos ajudar?';
        }

        if (!userEmail) {
            // If strictly anonymous, maybe just show welcome
            return;
        }

        const msgs = this.getMessages(userEmail);

        // Clear except welcome if needed, or just rebuild
        container.innerHTML = `
            <div class="chat-welcome" style="text-align: center; font-size: 0.8rem; color: #94a3b8; margin-bottom: 20px;">
                <p>Início da conversa</p>
            </div>
        `;

        msgs.forEach(m => {
            const el = document.createElement('div');
            el.className = `msg ${m.sender}`;
            el.innerText = m.text;
            container.appendChild(el);
        });

        this.scrollToBottom();
    },

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    },

    handleInput(e) {
        if (e.key === 'Enter') this.sendMessage();
    },

    getCurrentUserInfo() {
        if (typeof window.authService !== 'undefined') {
            const user = window.authService.getCurrentUser();
            if (user) {
                return {
                    email: user.email,
                    name: user.name,
                    type: user.role === 'admin' ? 'admin' : 'client'
                };
            }
        }
        return null; // Anonymous
    },

    getUserEmail() {
        const user = this.getCurrentUserInfo();
        if (user) return user.email;
        return localStorage.getItem('mv_anon_email');
    },

    sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        let email = this.getUserEmail();
        const user = this.getCurrentUserInfo();
        let name = user ? user.name : (localStorage.getItem('mv_anon_name') || 'Visitante');

        if (!email) {
            // Prompt for email and Name if first time
            const reqName = prompt("Para iniciarmos, como podemos te chamar? (Seu Nome)");
            if (!reqName) return;

            const reqEmail = prompt("E qual seu melhor email para contato?");
            if (!reqEmail) return;

            name = reqName;
            email = reqEmail;

            localStorage.setItem('mv_anon_name', name);
            localStorage.setItem('mv_anon_email', email);
        } else {
            // Recover name if anonymous
            if (!user) {
                const storedName = localStorage.getItem('mv_anon_name');
                if (storedName) name = storedName;
            }
        }

        // Add to local storage
        this.addMessage(email, 'client', text, name);

        // UI Update
        const container = document.getElementById('chat-messages');
        const el = document.createElement('div');
        el.className = 'msg client';
        el.innerText = text;
        container.appendChild(el);

        input.value = '';
        this.scrollToBottom();

        // Simulate Support Auto-Reply if it's the very first message
        const msgs = this.getMessages(email);
        if (msgs.length === 1) {
            setTimeout(() => {
                this.addMessage(email, 'admin', "Olá! Recebemos sua mensagem. Um consultor já vai te responder.", 'Sistema');
                this.loadMessages();
            }, 1000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ChatManager.init();
});
