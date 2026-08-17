/**
 * Marca Viva - Widget de chat de suporte (cliente)
 *
 * O Supabase é a fonte da verdade (tabelas support_chats/support_messages,
 * as mesmas que o admin usa). Mensagem enviada aqui grava direto no banco,
 * igual o admin já faz do lado dele.
 *
 * Resposta do admin só aparece aqui para quem está LOGADO: a regra de
 * segurança do banco só libera leitura da própria conversa comparando o
 * e-mail do chat com o e-mail da conta autenticada (ver migration
 * fix_support_chat_client_sync.sql). Visitante anônimo consegue mandar
 * mensagem normalmente (ela chega no admin), mas não tem como ler a
 * resposta aqui no widget — é a mesma limitação que já existia antes,
 * só que agora pelo menos a mensagem dele não se perde.
 */
const ChatManager = {
    POLL_INTERVAL_MS: 10000, // mesmo intervalo usado no lado admin (admin.js)
    BADGE_POLL_INTERVAL_MS: 30000,
    LOCAL_ECHO_LIMIT: 50,

    currentUserInfo: null, // { email, name, type: 'client'|'admin' }
    chatId: null,
    pollHandle: null,
    badgePollHandle: null,
    isOpen: false,

    init() {
        this.renderWidget();
        this.bindEvents();

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

        // Cliente logado: fica de olho em resposta nova mesmo com o widget fechado.
        if (this.isLoggedInCustomer()) {
            this.badgePollHandle = setInterval(() => this.refreshUnreadBadge(), this.BADGE_POLL_INTERVAL_MS);
            this.refreshUnreadBadge();
        }
    },

    isLoggedInCustomer() {
        const info = this.getCurrentUserInfo();
        return !!(info && info.email);
    },

    // --- Identidade do visitante (anônimo ou logado) ---

    resetSession() {
        if (confirm('Deseja encerrar este atendimento e iniciar como outro usuário?')) {
            localStorage.removeItem('mv_anon_email');
            localStorage.removeItem('mv_anon_name');
            localStorage.removeItem(this.localEchoKey());
            location.reload();
        }
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
        return null; // Anônimo
    },

    getUserEmail() {
        const user = this.getCurrentUserInfo();
        if (user) return user.email;
        return localStorage.getItem('mv_anon_email');
    },

    // --- Eco local (só para visitante anônimo continuar vendo o que ele mandou
    //     depois de recarregar a página — nunca guarda resposta do admin aqui) ---

    localEchoKey() {
        const email = this.getUserEmail() || 'anon';
        return `mv_chat_echo_${email}`;
    },

    getLocalEcho() {
        try {
            return JSON.parse(localStorage.getItem(this.localEchoKey())) || [];
        } catch (e) {
            return [];
        }
    },

    pushLocalEcho(text) {
        const echo = this.getLocalEcho();
        echo.push({ text, timestamp: Date.now() });
        localStorage.setItem(this.localEchoKey(), JSON.stringify(echo.slice(-this.LOCAL_ECHO_LIMIT)));
    },

    // --- Leitura/escrita no Supabase ---

    async ensureChatId(email, name) {
        if (!window.supabase) throw new Error('Sem conexão com o servidor.');

        const { data, error } = await window.supabase
            .from('support_chats')
            .upsert({
                email: email,
                user_name: name,
                status: 'open',
                updated_at: new Date().toISOString()
            }, { onConflict: 'email' })
            .select('id')
            .single();

        if (error || !data) throw error || new Error('Não foi possível abrir a conversa.');

        this.chatId = data.id;
        return this.chatId;
    },

    // Chamado a cada mensagem nova de uma conversa já existente: mantém a
    // conversa no topo da lista do admin (ordenada por updated_at DESC),
    // sem precisar refazer o upsert inteiro toda vez.
    async touchChatTimestamp(chatId) {
        try {
            await window.supabase
                .from('support_chats')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', chatId);
        } catch (e) {
            console.warn('Chat: falha ao atualizar timestamp da conversa.', e);
        }
    },

    async fetchThread(chatId) {
        const { data, error } = await window.supabase
            .from('support_messages')
            .select('sender, message, created_at')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true })
            .limit(50);

        if (error) {
            console.warn('Chat: não foi possível carregar a conversa.', error);
            return null;
        }
        return data || [];
    },

    getChatLastRead() {
        return Number(localStorage.getItem(`mv_chat_last_read_${this.getUserEmail() || ''}`) || 0);
    },

    setChatLastRead(when) {
        localStorage.setItem(`mv_chat_last_read_${this.getUserEmail() || ''}`, String(when || Date.now()));
    },

    // --- UI Rendering (Client Widget) ---

    renderWidget() {
        // Admin tem o próprio painel; não duplicar o widget lá.
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
                    position: relative;
                }

                #chat-bubble:hover {
                    transform: scale(1.1);
                }

                #chat-unread-badge {
                    position: absolute;
                    top: -4px;
                    right: -4px;
                    background: #ef4444;
                    color: white;
                    border-radius: 999px;
                    min-width: 20px;
                    height: 20px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0 4px;
                    border: 2px solid white;
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

                .msg.error {
                    align-self: center;
                    background: #fef2f2;
                    color: #b91c1c;
                    border: 1px solid #fecaca;
                    font-size: 0.8rem;
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
        if (this.isOpen) {
            win.style.display = 'none';
            this.isOpen = false;
            this.stopPolling();
        } else {
            win.style.display = 'flex';
            this.isOpen = true;
            void this.loadMessages(); // marca como lido ao carregar (ver dentro de loadMessages)
            setTimeout(() => document.getElementById('chat-input').focus(), 100);

            if (this.isLoggedInCustomer()) {
                this.stopPolling();
                this.pollHandle = setInterval(() => this.loadMessages({ silent: true }), this.POLL_INTERVAL_MS);
            }
        }
    },

    stopPolling() {
        if (this.pollHandle) {
            clearInterval(this.pollHandle);
            this.pollHandle = null;
        }
    },

    async loadMessages({ silent = false } = {}) {
        const container = document.getElementById('chat-messages');
        const userInfo = this.getCurrentUserInfo();

        if (userInfo) {
            document.getElementById('chat-header-title').innerText = `Olá, ${userInfo.name.split(' ')[0]}!`;
            document.getElementById('chat-header-subtitle').innerText = 'Como podemos ajudar?';
        }

        const email = this.getUserEmail();
        if (!email) return; // Ainda não se identificou — fica só a mensagem de boas-vindas.

        if (this.isLoggedInCustomer()) {
            try {
                if (!this.chatId) await this.ensureChatId(email, userInfo.name);
                const thread = await this.fetchThread(this.chatId);
                if (thread) {
                    this.renderMessages(thread.map(m => ({
                        sender: m.sender,
                        text: m.message,
                        timestamp: new Date(m.created_at).getTime()
                    })));
                    // Enquanto a janela está aberta, tudo que chega já foi visto:
                    // mantém o "último lido" andando junto para o badge não
                    // reacusar como não lida uma mensagem que já apareceu na tela.
                    if (this.isOpen) {
                        this.setChatLastRead(Date.now());
                        this.updateBadge(0);
                    }
                    return;
                }
                if (silent) return; // Falha silenciosa no polling: não incomoda o usuário a cada 10s.
            } catch (e) {
                console.warn('Chat: falha ao carregar conversa.', e);
                if (silent) return;
            }
        }

        // Anônimo (ou falha ao consultar o banco): mostra só o eco local.
        const echo = this.getLocalEcho();
        this.renderMessages(echo.map(m => ({ sender: 'client', text: m.text, timestamp: m.timestamp })), { anonymous: true });
    },

    renderMessages(msgs, { anonymous = false } = {}) {
        const container = document.getElementById('chat-messages');
        container.innerHTML = `
            <div class="chat-welcome" style="text-align: center; font-size: 0.8rem; color: #94a3b8; margin-bottom: 20px;">
                <p>Início da conversa recente</p>
            </div>
        `;

        // Visitante sem login manda mensagem normalmente, mas a resposta do
        // admin só é liberada pra quem está autenticado (RLS de
        // support_messages, ver comentário no topo do arquivo). Como não dá
        // pra resolver isso sem exigir login, ao menos avisamos aqui.
        if (anonymous) {
            const notice = document.createElement('div');
            notice.style.cssText = 'align-self:center; text-align:center; font-size:0.78rem; color:#92400e; background:#fef3c7; border:1px solid #fde68a; border-radius:8px; padding:8px 12px; margin-bottom:6px;';
            notice.innerHTML = 'Você não está logado — a resposta pode não aparecer aqui. <a href="login.html" style="color:#92400e; font-weight:600; text-decoration:underline;">Crie uma conta ou faça login</a> para ver a resposta neste chat, ou aguarde contato por e-mail/WhatsApp.';
            container.appendChild(notice);
        }

        msgs.forEach(m => {
            const el = document.createElement('div');
            el.className = `msg ${m.sender}`;
            el.innerText = m.text;
            container.appendChild(el);
        });

        this.scrollToBottom();
    },

    appendMessageBubble(sender, text) {
        const container = document.getElementById('chat-messages');
        const el = document.createElement('div');
        el.className = `msg ${sender}`;
        el.innerText = text;
        container.appendChild(el);
        this.scrollToBottom();
        return el;
    },

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        container.scrollTop = container.scrollHeight;
    },

    handleInput(e) {
        if (e.key === 'Enter') this.sendMessage();
    },

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        let email = this.getUserEmail();
        const user = this.getCurrentUserInfo();
        let name = user ? user.name : (localStorage.getItem('mv_anon_name') || 'Visitante');

        if (!email) {
            const reqName = prompt('Para iniciarmos, como podemos te chamar? (Seu Nome)');
            if (!reqName) return;

            const reqEmail = prompt('E qual seu melhor email para contato?');
            if (!reqEmail) return;

            name = reqName;
            email = reqEmail;

            localStorage.setItem('mv_anon_name', name);
            localStorage.setItem('mv_anon_email', email);
        } else if (!user) {
            const storedName = localStorage.getItem('mv_anon_name');
            if (storedName) name = storedName;
        }

        input.value = '';
        input.disabled = true;
        const bubble = this.appendMessageBubble('client', text);

        try {
            let chatId = this.chatId;
            if (chatId) {
                await this.touchChatTimestamp(chatId);
            } else {
                chatId = await this.ensureChatId(email, name);
            }
            const { error } = await window.supabase.from('support_messages').insert({
                chat_id: chatId,
                sender: 'client',
                message: text
            });
            if (error) throw error;

            if (!user) this.pushLocalEcho(text);

            // Primeira mensagem da conversa: recadinho de boas-vindas, só na tela
            // (nunca gravado no banco — não é uma resposta real do admin).
            const isFirstMessage = this.getLocalEcho().length <= 1 && !user;
            if (isFirstMessage) {
                setTimeout(() => {
                    this.appendMessageBubble('admin', 'Olá! Recebemos sua mensagem. Um consultor já vai te responder. Como você não está logado, crie uma conta ou faça login para ver a resposta aqui — ou aguarde contato por e-mail/WhatsApp.');
                }, 1000);
            }
        } catch (err) {
            console.error('Chat: falha ao enviar mensagem.', err);
            bubble.classList.add('error');
            this.appendMessageBubble('error', 'Não foi possível enviar. Verifique sua conexão e tente de novo, ou fale pelo WhatsApp.');
        } finally {
            input.disabled = false;
            input.focus();
        }
    },

    // --- Sino: contagem de resposta nova sem precisar abrir o widget ---

    async refreshUnreadBadge() {
        if (!this.isLoggedInCustomer() || !window.supabase) return;
        try {
            const email = this.getUserEmail();
            if (!this.chatId) await this.ensureChatId(email, this.getCurrentUserInfo().name);

            const lastRead = this.getChatLastRead();
            const { count } = await window.supabase
                .from('support_messages')
                .select('*', { count: 'exact', head: true })
                .eq('chat_id', this.chatId)
                .eq('sender', 'admin')
                .gt('created_at', new Date(lastRead).toISOString());

            this.updateBadge(count || 0);
        } catch (e) {
            console.warn('Chat: falha ao checar mensagens novas.', e);
        }
    },

    updateBadge(count) {
        const badge = document.getElementById('chat-unread-badge');
        if (!badge) return;
        if (count > 0) {
            badge.style.display = 'flex';
            badge.innerText = count > 9 ? '9+' : String(count);
        } else {
            badge.style.display = 'none';
        }
    },

    bindEvents() {
        // Reservado para eventos futuros; mantido por compatibilidade com init().
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ChatManager.init();
});
