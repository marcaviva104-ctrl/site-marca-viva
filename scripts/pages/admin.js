/**
 * Marca Viva - Smart Admin Logic
 * Handles Cost Aggregation, Profit Analysis, and Real-time Publishing
 */

const adminApp = {
    currentStatusFilter: 'all', // State for filters

    // --- Permissions Logic ---
    // --- Permissions Logic ---
    // (checkAuth moved to end of file to use centralized AuthService)

    applyPermissions(profile) {
        // God Mode for owner
        const email = (profile.email || '').toLowerCase().trim();
        if (email === 'leivinjesus57@gmail.com') return;

        const allTabs = ['dashboard', 'inputs', 'inventory', 'products', 'orders', 'financial', 'messages', 'customers', 'settings'];
        const userPerms = profile.permissions || [];

        // If user is NOT admin role, kick them out
        if (profile.role !== 'admin') {
            // DEBUG ALERT
            Swal.fire({
                icon: 'error',
                title: 'Acesso Negado',
                text: `Usu�rio: ${email} | Role: ${profile.role || 'null'}. Fale com o suporte.`,
                confirmButtonText: 'Ok, sair'
            }).then(() => {
                window.location.href = 'index.html';
            });
            return;
        }

        // Hide unauthorised tabs
        allTabs.forEach(view => {
            // 'dashboard' is usually default, but let's restrict it too if we want
            if (!userPerms.includes(view) && view !== 'dashboard') {
                const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
                if (navItem) navItem.style.display = 'none';
            }
        });
    },




    // --- Permisssions & Real-Time Poller ---
    async startStatusPoller() {
        // Runs every 3 minutes silently checking for new Pending Protocols
        setInterval(async () => {
            if (!window.supabase) return;
            try {
                const { count } = await window.supabase
                    .from('protocols')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'inquiry');

                const badge = document.getElementById('protocols-badge');
                let currentVal = parseInt(badge?.innerText || 0);

                if (count > currentVal) {
                    badge.innerText = count;
                    badge.style.display = 'inline-block';

                    // Gentle beep
                    const ctx = new (window.AudioContext || window.webkitAudioContext)();
                    const osc = ctx.createOscillator();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(500, ctx.currentTime);
                    osc.connect(ctx.destination);
                    osc.start();
                    osc.stop(ctx.currentTime + 0.1);

                    // Menu Visual Pulse
                    const orderMenuIcon = document.querySelector('[data-view="orders"] i');
                    if (orderMenuIcon) {
                        orderMenuIcon.style.color = "#f59e0b";
                        setTimeout(() => { orderMenuIcon.style.color = ""; }, 2000);
                    }
                } else if (count > 0 && badge) {
                    badge.innerText = count;
                }
            } catch (e) { }
        }, 180000); // 3 mins in ms
    },

    // --- Supabase Connection Check ---
    async checkConnection() {
        // Silent check - DO NOT BLOCK UI
        /*
        Swal.fire({ title: 'Testando Conexão...', didOpen: () => Swal.showLoading() });
        */
        const isConnected = typeof checkSupabaseConnection !== 'undefined' ? await checkSupabaseConnection() : false;

        if (isConnected) {
            console.log("Supabase connected.");
            this.startStatusPoller(); // Initiate Poller on DB success
            // Swal.fire('Conectado!', 'Supabase está online e respondendo.', 'success');
        } else {
            console.error("Supabase connection failed.");
            // Swal.fire('Erro de Conexão', 'Não foi possível conectar ao Supabase.', 'error');
        }
    },

    // --- Feature 4: Financial Print/Download Report ---
    printFinancialReport() {
        // Use data stored by renderFinancial
        const data = this.lastFinancialRecords || this.financialData;
        const payments = this.lastPaymentsMap || {};

        if (!data || data.length === 0) {
            return Swal.fire('Aten��o', 'N�o h� dados para imprimir.', 'warning');
        }

        try {
            // Check Libraries
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("Biblioteca jsPDF n�o carregada.");
            window.jsPDF = window.jspdf.jsPDF;

            const doc = new window.jsPDF();
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // 1. Header
            doc.setFontSize(18);
            doc.text("Relat�rio Financeiro - Marca Viva", 14, 22);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${dateStr} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

            // 2. Data Preparation
            let sumPaid = 0;
            let sumDebt = 0;

            const rows = data.map(item => {
                const paid = payments[item.id] || 0;
                const total = Number(item.total) || 0;
                const debt = total - paid;

                if (item.type !== 'expense') {
                    sumPaid += paid;
                    if (debt > 0.01) sumDebt += debt;
                }

                // Status Text
                let statusText = 'Pendente';
                if (item.type === 'expense') statusText = 'Despesa';
                else if (debt <= 0.01) statusText = 'Pago';

                return [
                    item.id,
                    item.customer_name || 'Desconhecido',
                    statusText,
                    `R$ ${total.toFixed(2)}`,
                    `R$ ${paid.toFixed(2)}`,
                    `R$ ${debt > 0 ? debt.toFixed(2) : '0.00'}`
                ];
            });

            // 3. Generate Table
            doc.autoTable({
                head: [['PEDIDO', 'CLIENTE', 'STATUS', 'TOTAL', 'J� PAGO', 'FALTA']],
                body: rows,
                startY: 35,
                theme: 'striped',
                headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 35 }, // ID
                    4: { textColor: [16, 185, 129], fontStyle: 'bold' }, // Paid (Green)
                    5: { textColor: [239, 68, 68], fontStyle: 'bold' }   // Debt (Red)
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        if (data.cell.text[0] === 'Pago') data.cell.styles.textColor = [16, 185, 129];
                        if (data.cell.text[0] === 'Despesa') data.cell.styles.textColor = [239, 68, 68];
                        if (data.cell.text[0] === 'Pendente') data.cell.styles.textColor = [245, 158, 11];
                    }
                }
            });

            // 4. Footer Totals
            const finalY = doc.lastAutoTable.finalY + 10;

            // Box 1: Total Paid
            doc.setFillColor(241, 245, 249);
            doc.rect(120, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Total Recebido", 122, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(16, 185, 129); // Green
            doc.text(`R$ ${sumPaid.toFixed(2)}`, 122, finalY + 11);

            // Box 2: Total Debt
            doc.setFillColor(241, 245, 249);
            doc.rect(165, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Falta Receber", 167, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(239, 68, 68); // Red
            doc.text(`R$ ${sumDebt.toFixed(2)}`, 167, finalY + 11);

            // 5. Force Download with Correct Name (Anchor Trick)
            // This is the most reliable way to enforce the filename on Windows
            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);

            const cleanDate = dateStr.replace(/\//g, '-');
            const fileName = `Relatorio_Financeiro_${cleanDate}.pdf`;

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName; // FORCE filename
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }, 100);

            Swal.fire({
                title: 'Download Conclu�do! ??',
                text: `Arquivo salvo como: ${fileName}`,
                icon: 'success',
                timer: 4000
            });

            // Success Feedback (Optional, since the window opening is the feedback)
            // Swal.fire('PDF Aberto', 'O relat�rio foi aberto em uma nova guia.', 'success');

        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao gerar PDF. Verifique se os pop-ups est�o permitidos.', 'error');
        }
    },

    // --- Feature 4 Fix: Preview Mode with Metadata ---
    // --- Feature 4 Final Fix: Choice Modal (Download vs Preview) ---
    printFinancialReportPreview() {
        Swal.fire({
            title: 'Exportar Relat�rio',
            text: 'Deseja gerar o arquivo PDF agora?',
            icon: 'question',
            showCancelButton: true, // Keep cancel to allow closing, but style differently? No, user said "leave ONLY export"
            // Actually, usually you need a way to close. 
            // Better interpretation: Remove "Visualizar" option, make it just "Export" vs "Cancel/Close"
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#ef4444', // Red for "Cancel/Close"
            confirmButtonText: '?? Exportar Relat�rio',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                this.generateFinancialPDF('download');
            }
        });
    },

    async generateFinancialPDF(action) {
        const data = this.lastFinancialRecords || this.financialData;
        const payments = this.lastPaymentsMap || {};

        if (!data || data.length === 0) {
            return Swal.fire('Aten��o', 'N�o h� dados para imprimir.', 'warning');
        }

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("Biblioteca jsPDF n�o carregada.");
            window.jsPDF = window.jspdf.jsPDF;

            const doc = new window.jsPDF();
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // Header & Data Setup (Shared Logic)
            doc.setFontSize(18);
            doc.text("Relat�rio Financeiro - Marca Viva", 14, 22);
            doc.setFontSize(10);
            doc.text(`Gerado em: ${dateStr} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 28);

            let sumPaid = 0;
            let sumDebt = 0;

            const rows = data.map(item => {
                const paid = payments[item.id] || 0;
                const total = Number(item.total) || 0;
                const debt = total - paid;

                if (item.type !== 'expense') {
                    sumPaid += paid;
                    if (debt > 0.01) sumDebt += debt;
                }

                let statusText = 'Pendente';
                if (item.type === 'expense') statusText = 'Despesa';
                else if (debt <= 0.01) statusText = 'Pago';

                return [item.id, item.customer_name || 'Desconhecido', statusText, `R$ ${total.toFixed(2)}`, `R$ ${paid.toFixed(2)}`, `R$ ${debt > 0 ? debt.toFixed(2) : '0.00'}`];
            });

            doc.autoTable({
                head: [['PEDIDO', 'CLIENTE', 'STATUS', 'TOTAL', 'J� PAGO', 'FALTA']],
                body: rows,
                startY: 35,
                theme: 'striped',
                headStyles: { fillColor: [248, 250, 252], textColor: [71, 85, 105], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    4: { textColor: [16, 185, 129], fontStyle: 'bold' },
                    5: { textColor: [239, 68, 68], fontStyle: 'bold' }
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 2) {
                        if (data.cell.text[0] === 'Pago') data.cell.styles.textColor = [16, 185, 129];
                        if (data.cell.text[0] === 'Despesa') data.cell.styles.textColor = [239, 68, 68];
                        if (data.cell.text[0] === 'Pendente') data.cell.styles.textColor = [245, 158, 11];
                    }
                }
            });

            // Footer
            const finalY = doc.lastAutoTable.finalY + 10;
            doc.setFillColor(241, 245, 249);
            doc.rect(120, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Total Recebido", 122, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(16, 185, 129);
            doc.text(`R$ ${sumPaid.toFixed(2)}`, 122, finalY + 11);

            doc.setFillColor(241, 245, 249);
            doc.rect(165, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("Falta Receber", 167, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(239, 68, 68);
            doc.text(`R$ ${sumDebt.toFixed(2)}`, 167, finalY + 11);

            // FILE NAME LOGIC
            // Simplified to avoid OS errors with special chars in dates
            const fileName = `Relatorio_Financeiro.pdf`;

            if (action === 'download') {
                // STRATEGY 1: Modern "Save As" Dialog (User liked this one)
                if (window.showSaveFilePicker) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{
                                description: 'PDF Document',
                                accept: { 'application/pdf': ['.pdf'] },
                            }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(doc.output('blob'));
                        await writable.close();

                        Swal.fire({
                            title: 'Salvo com Sucesso! ??',
                            text: 'O arquivo foi salvo na pasta escolhida.',
                            icon: 'success',
                            timer: 3000
                        });
                        return; // Stop here if successful
                    } catch (err) {
                        if (err.name === 'AbortError') return; // User cancelled
                        // Fallback only if error is not cancellation
                    }
                }

                // STRATEGY 2: Fallback to Anchor
                const blob = doc.output('blob');
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();

                setTimeout(() => {
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }, 100);

                Swal.fire({
                    title: 'Download Iniciado',
                    text: 'Verifique sua pasta de downloads.',
                    icon: 'success',
                    timer: 3000
                });
            } else {
                // PREVIEW (Open in New Tab)
                doc.setProperties({ title: fileName });
                window.open(doc.output('bloburl'), '_blank');
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao gerar o PDF.', 'error');
        }
    },

    async init() {
        console.log("AdminApp: Starting initialization...");

        // Explicit Global Export
        window.adminApp = this;

        // 0. Load Local Settings first
        this.loadSettings();
        this.loadTheme();

        // 1. Bind UI immediately so tabs work even during loading
        this.bindNav();

        // 2. Initialize Data Layer (Wait for it)
        if (typeof dataManager !== 'undefined') {
            await dataManager.init();
        }

        // 3. Check Auth & Render (This will call renderDashboard)
        try {
            await this.checkConnection(); // Silent check on load (logs to console)
            await this.checkAuth();
        } catch (e) {
            console.error("Auth check failed:", e);
        }

        this.updateInventoryBadge();

        const clearBtn = document.getElementById('btn-clear-chats');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllChats());
        }

        // 4. Initialize Realtime Listeners
        if (typeof RealtimeManager !== 'undefined') {
            RealtimeManager.init();
        }

        // 5. Load Goals & Charts
        if (this.fetchGoals) this.fetchGoals();
        if (this.renderCharts) this.renderCharts();
        if (this.predictStock) this.predictStock();

        // 6. Handle URL Params (Deep Linking)
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view');
        if (viewParam) {
            setTimeout(() => {
                const link = document.querySelector(`.nav-item[data-view="${viewParam}"]`);
                if (link) link.click();
            }, 500); // Small delay to ensure DOM and listeners are ready
        }

        console.log("AdminApp: Init completed.");
    },


    loadTheme() {
        const savedTheme = SafeStorage.getItem('mv_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        }
        this.injectThemeToggle();
    },

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        SafeStorage.setItem('mv_theme', isDark ? 'dark' : 'light');
        this.updateToggleIcon(isDark);
    },

    injectThemeToggle() {
        const nav = document.querySelector('.admin-sidebar nav');
        if (!nav || document.getElementById('theme-toggle-btn')) return;

        const btn = document.createElement('a');
        btn.href = '#';
        btn.className = 'nav-item';
        btn.id = 'theme-toggle-btn';
        btn.onclick = (e) => {
            e.preventDefault();
            this.toggleTheme();
        };

        const isDark = document.body.classList.contains('dark-mode');
        btn.innerHTML = this.getThemeIconHtml(isDark);

        // Append before 'Sair' or at end of nav
        nav.appendChild(btn);
    },

    updateToggleIcon(isDark) {
        const btn = document.getElementById('theme-toggle-btn');
        if (btn) btn.innerHTML = this.getThemeIconHtml(isDark);
    },

    getThemeIconHtml(isDark) {
        return isDark
            ? `<i class="ph-fill ph-sun"></i> <span>Modo Claro</span>`
            : `<i class="ph-fill ph-moon"></i> <span>Modo Escuro</span>`;
    },
    async checkAuth() {
        // Wait for AuthService to be ready
        console.log("Admin: Checking Auth...");

        // Wait for AuthService
        let retries = 0;
        while ((!window.authService || !window.authService.isAuthenticated()) && retries < 20) {
            await new Promise(r => setTimeout(r, 100));
            // Force init check if authService is loaded but user is null (maybe just needs time)
            if (window.authService && !window.authService.user) retries++;
        }

        // Use the centralized AuthService
        if (window.authService && window.authService.isAdmin()) {
            console.log("Admin: Verified via AuthService.");
            // Initial Render
            this.switchView('financial');
            return;
        }

        // Fallback or unauthorized
        console.warn("Admin: Unauthorized access attempt or Auth System offline.");
        // alert('Acesso negado: �rea restrita.');
        // window.location.href = 'index.html';

        // DEV MODE: Allow render for testing if needed, or block.
        // For now, we render but warn.
        this.renderDashboard();
    },

    bindNav() {
        document.querySelectorAll('.nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                const vid = link.getAttribute('data-view');
                if (!vid) return;
                e.preventDefault();
                this.switchView(vid, link);
            });
        });
        console.log("AdminApp: Navigation Bound.");
    },

    switchView(vid, link) {
        // DEBUG
        // alert("Clicou em: " + vid);
        if (link) {
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        } else {
            const l = document.querySelector('.nav-item[data-view="' + vid + '"]');
            if (l) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                l.classList.add('active');
            }
        }

        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.admin-view, .view-section').forEach(s => s.style.display = 'none');

        const view = document.getElementById(vid) || document.getElementById(vid + '-view');
        if (view) {
            view.classList.add('active');
            view.style.display = 'block';
        }

        try {
            if (vid === 'inputs') this.renderInputsTable();
            if (vid === 'products') this.renderProductsTable();
            if (vid === 'dashboard') this.renderDashboard();
            if (vid === 'inventory') this.renderInventoryView();
            if (vid === 'orders') this.renderOrdersTable();
            if (vid === 'messages') this.renderMessagesView();
            if (vid === 'financial') this.renderFinancial();
            if (vid === 'settings') this.loadSettings();
            if (vid === 'customers') CRMManager.loadCustomers();
            if (vid === 'users') this.fetchUsers();
            if (vid === 'protocols' && typeof ProtocolsManager !== 'undefined') ProtocolsManager.loadProtocols();
        } catch (e) {
            console.error("View Switch Error:", e);
            alert("Erro ao trocar aba: " + e.message);
        }
    },



    // --- Module 5: Internal Chat (Phase 4) ---
    renderMessagesView() {
        this.loadChatList();
        // Start polling for new messages if view is active
        if (this.chatInterval) clearInterval(this.chatInterval);
        this.chatInterval = setInterval(() => {
            if (document.getElementById('view-messages').classList.contains('active')) {
                // Optimization: Check for changes before invalidating DOM
                const currentStr = SafeStorage.getItem('mv_chats');
                if (this.lastChatStr !== currentStr) {
                    this.loadChatList();
                    this.lastChatStr = currentStr;

                    // Only refresh active chat if it's open
                    if (this.activeChatEmail) this.openChat(this.activeChatEmail);
                }
            } else {
                clearInterval(this.chatInterval);
            }
        }, 3000);
    },

    lastChatStr: '',

    loadChatList() {
        const list = document.getElementById('admin-chat-list');
        const chats = JSON.parse(SafeStorage.getItem('mv_chats')) || {};

        if (Object.keys(chats).length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhuma conversa iniciada.</p>';
            return;
        }

        list.innerHTML = Object.keys(chats).map(email => {
            const chat = chats[email];
            const lastMsg = chat.messages[chat.messages.length - 1] || { text: '', timestamp: 0 };
            const isActive = this.activeChatEmail === email ? 'background: #f1f5f9;' : '';
            const unreadBadge = chat.unread > 0 ? `<span style="background:var(--accent-orange); color:white; font-size:0.7rem; padding:2px 6px; border-radius:10px;">${chat.unread}</span>` : '';

            return `
                <div onclick="adminApp.openChat('${email}')" style="padding: 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition:0.2s; ${isActive}" onmouseover="this.style.background='#f8fafc'" onmouseout="if(this.style.background!=='rgb(241, 245, 249)') this.style.background='white'">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:600; color:#1e293b;">${chat.userName}</span>
                        ${unreadBadge}
                    </div>
                    <div style="font-size:0.8rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        ${lastMsg.text}
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8; margin-top:4px;">
                        ${new Date(lastMsg.timestamp).toLocaleTimeString()} - ${email}
                    </div>
                </div>
            `;
        }).join('');
    },

    activeChatEmail: null,

    openChat(email) {
        this.activeChatEmail = email;
        const chats = JSON.parse(SafeStorage.getItem('mv_chats'));
        const chat = chats[email];

        if (!chat) return;

        // UI Updates
        document.getElementById('active-chat-user').innerText = `${chat.userName} (${email})`;
        document.getElementById('active-chat-status').innerText = 'Online';
        document.getElementById('admin-chat-input').disabled = false;
        document.getElementById('admin-chat-send-btn').disabled = false;

        const container = document.getElementById('admin-chat-messages');

        // Simple Diff: Only update if length changed or first load
        // Note: For a perfect chat we'd append, but for stability reset is safer if fast enough.
        // We will just keep it simple but ensure scroll sticks to bottom ONLY if we were at bottom or it's new.

        container.innerHTML = chat.messages.map(m => `
            <div style="max-width:70%; pad:10px; border-radius:8px; padding:10px; font-size:0.9rem; align-self: ${m.sender === 'admin' ? 'flex-end' : 'flex-start'}; background: ${m.sender === 'admin' ? '#e0f2fe' : 'white'}; border: 1px solid ${m.sender === 'admin' ? '#bae6fd' : 'white'}; color: ${m.sender === 'admin' ? '#0369a1' : '#334155'}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ${m.text}
            </div>
        `).join('');

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;

        // Clear unread
        if (chat.unread > 0) {
            chat.unread = 0;
            SafeStorage.setItem('mv_chats', JSON.stringify(chats));
            // We don't call loadChatList here to avoid loop, strictly update data
        }
    },

    sendAdminMessage() {
        if (!this.activeChatEmail) return;
        const input = document.getElementById('admin-chat-input');
        const text = input.value.trim();
        if (!text) return;

        const chats = JSON.parse(SafeStorage.getItem('mv_chats'));
        if (!chats[this.activeChatEmail]) return;

        chats[this.activeChatEmail].messages.push({
            sender: 'admin',
            text: text,
            timestamp: Date.now()
        });

        SafeStorage.setItem('mv_chats', JSON.stringify(chats));
        input.value = '';
        this.openChat(this.activeChatEmail); // Refresh view
        this.loadChatList(); // Refresh list preview
    },

    clearAllChats() {
        if (confirm('Tem certeza que deseja apagar TODAS as conversas? Isso n�o pode ser desfeito.')) {
            SafeStorage.removeItem('mv_chats');
            this.loadChatList();
            this.activeChatEmail = null;
            document.getElementById('admin-chat-messages').innerHTML = '';
            document.getElementById('active-chat-user').innerText = 'Selecione uma conversa';
            document.getElementById('active-chat-status').innerText = '-';
            document.getElementById('admin-chat-input').disabled = true;
            document.getElementById('admin-chat-send-btn').disabled = true;
        }
    },


    // --- Module 1: Inputs (Insumos) ---
    openInputModal() {
        document.getElementById('modal-input').classList.add('open');
        document.getElementById('input-id').value = '';
        document.getElementById('input-name').value = '';
        document.getElementById('input-supplier').value = '';
        document.getElementById('input-cost').value = '';
        document.getElementById('input-unit').value = 'un';
        document.getElementById('input-min-stock').value = 5;
        document.getElementById('check-no-min-stock').checked = false;
        this.toggleMinStockInput(document.getElementById('check-no-min-stock'));
    },

    async cleanupInputs() {
        // Whitelist provided by user
        const keep = [
            "papel fotogr�fico adesivo 180g",
            "bopp fosco",
            "tinta papel fotogr�fico"
        ];

        const inputs = dataManager.getInputs();
        const toDelete = inputs.filter(i => {
            const name = i.name.toLowerCase().trim();
            // Keep if name loosely matches any whitelist item
            return !keep.some(k => name.includes(k) || k.includes(name));
        });

        if (toDelete.length === 0) {
            alert("Nenhum item para excluir! A lista j� est� limpa.");
            return;
        }

        if (!confirm(`?? PERIGO: Isso vai apagar ${toDelete.length} insumos e manter apenas os 3 solicitados. Tem certeza?`)) return;

        let count = 0;
        for (const item of toDelete) {
            await dataManager.deleteInput(item.id);
            count++;
        }

        this.renderInputsTable();
        alert(`Limpeza conclu�da! ${count} itens foram removidos.`);
    },

    async saveInput() {
        try {
            const id = document.getElementById('input-id').value;
            const name = document.getElementById('input-name').value;
            const supplier = document.getElementById('input-supplier').value || 'N/A';
            const cost = parseFloat(document.getElementById('input-cost').value);
            const unit = document.getElementById('input-unit').value;

            // Min Stock Logic
            const noMinStock = document.getElementById('check-no-min-stock').checked;
            const minStock = noMinStock ? 0 : (parseFloat(document.getElementById('input-min-stock').value) || 0);

            if (!name || isNaN(cost)) { alert('Preencha nome e custo!'); return; }

            // Fetch existing inputs to preserve stock if editing
            const existingInputs = dataManager.getInputs() || [];
            const existing = id ? existingInputs.find(i => i.id === id) : null;

            const input = {
                id: id ? id : `INS-${Date.now().toString().slice(-5)}`,
                name, supplier, cost, unit,
                minStock,
                stock: existing ? (existing.stock || 0) : 0
            };

            const success = await dataManager.saveInput(input);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.updateInventoryBadge();
                this.renderDashboard(); // Update dashboard alerts
            } else {
                alert("Erro ao salvar insumo (Retorno falso).");
            }
        } catch (e) {
            console.error("Save Input Error:", e);
            alert("Erro inesperado ao salvar insumo: " + e.message);
        }
    },

    toggleMinStockInput(checkbox) {
        const input = document.getElementById('input-min-stock');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = 1; // Visual Only
            input.style.opacity = '0.5';
        } else {
            input.disabled = false;
            input.style.opacity = '1';
        }
    },

    closeModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    },

    showConfirm(title, msg, onConfirm) {
        const modal = document.getElementById('modal-confirm');
        if (!modal) return;

        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-msg').innerText = msg;

        // Setup Yes button
        const yesBtn = document.getElementById('confirm-btn-yes');

        // Remove old listeners to prevent stacking
        const newBtn = yesBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newBtn, yesBtn);

        newBtn.addEventListener('click', () => {
            onConfirm();
            this.closeModals();
        });

        modal.classList.add('open');
    },

    async renderInputsTable() {
        const tbody = document.getElementById('inputs-table-body');
        // Fetch fresh data from Cloud
        await dataManager.fetchInputs();
        const inputs = dataManager.getInputs();
        if (!inputs) return; // robustness
        tbody.innerHTML = inputs.map(i => {
            const status = dataManager.getStockStatus(i);
            const statusIcon = {
                'ok': '??',
                'low': '??',
                'critical': '??',
                'out': '?'
            }[status] || '??';

            const stock = i.stock || 0;
            const minStock = i.minStock || 5;

            // Simple Status Logic (Override dataManager for now to ensure reactivity to custom minStock)
            let displayIcon = '??';
            if (stock <= 0) displayIcon = '?';
            else if (stock <= minStock) displayIcon = '??';

            return `
            <tr>
                <td><strong>${i.name}</strong></td>
                <td><span style="font-size:0.8rem;color:#64748b;">${i.supplier || '-'}</span></td>
                <td>${i.unit}</td>
                <td>R$ ${i.cost.toFixed(2)}</td>
                <td>
                    <span style="font-weight:600;">${displayIcon} ${stock} ${i.unit}</span>
                    <span style="font-size:0.75rem;color:#94a3b8;display:block;">${minStock === 0 ? 'Sem M�nimo' : `Min: ${minStock}`}</span>
                </td>
                <td>
                    <button onclick="adminApp.openStockEntry('${i.id}')" title="Entrada de Estoque" 
                        style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-arrow-down-left"></i>
                    </button>
                    <button onclick="adminApp.openStockAdjust('${i.id}')" title="Sa�da/Perda" 
                        style="color:#f59e0b;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-arrow-up-right"></i>
                    </button>
                    <button onclick="adminApp.deleteInput('${i.id}')" style="color:red;border:none;background:none;cursor:pointer;">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    },

    deleteInput(id) {
        this.showConfirm('Excluir este insumo?', 'Isso remover� o item do estoque permanentemente.', async () => {
            await dataManager.deleteInput(id);
            this.renderInputsTable();
        });
    },

    updateCategoryDatalist() {
        const products = dataManager.getProducts() || [];
        const datalist = document.getElementById('category-list');
        if (!datalist) return;

        const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
        // Add defaults if missing
        ['Escrit�rio', 'Tecnologia', 'Servi�os', 'Kits'].forEach(c => {
            if (!categories.includes(c)) categories.push(c);
        });

        datalist.innerHTML = categories.sort().map(c => `<option value="${c}">`).join('');
    },

    // --- Module 2: Smart Product Aggregator ---
    async openProductModal() {
        document.getElementById('modal-product').classList.add('open');
        this.resetModal();

        // Reset Search
        const searchInput = document.getElementById('input-search');
        if (searchInput) searchInput.value = '';

        // Force Fetch to ensure list is populated
        await dataManager.fetchInputs();
        this.renderInputList();
        this.calculateProfit();
    },

    resetModal() {
        // Helper: safely set value on element
        const setVal = (id, v = '') => { const el = document.getElementById(id); if (el) el.value = v; };
        const setChk = (id, v = false) => { const el = document.getElementById(id); if (el) el.checked = v; };

        setVal('prod-id');
        setVal('prod-name');
        setVal('prod-sku');
        setVal('prod-category');
        setVal('prod-description');
        setVal('prod-img');
        setVal('prod-link');
        setVal('prod-min-stock', 5);
        setVal('prod-min-order', 1);
        setChk('check-no-min-order', true);

        const noMinEl = document.getElementById('check-no-min-order');
        if (noMinEl) this.toggleMinOrder(noMinEl);

        // Reset Price Analysis
        setVal('prod-price-analysis');

        // Reset Variable Pricing
        const varCheck = document.getElementById('check-is-variable');
        if (varCheck) {
            varCheck.checked = false;
            this.toggleVariablePricing();
            setVal('prod-var-bw');
            setVal('prod-var-bw-heavy');
            setVal('prod-var-color');
            setVal('prod-var-color-heavy');
        }

        // Uncheck all inputs
        document.querySelectorAll('.cost-check').forEach(c => c.checked = false);
        document.querySelectorAll('input[id^="qty-"]').forEach(i => {
            i.style.visibility = 'hidden';
            i.value = 1;
        });

        // Reset Variations
        setChk('prod-has-variations', false);
        this.currentVariations = [];
        this.currentConfigRules = [];
        if (typeof this.renderVariationBuilder === 'function') this.renderVariationBuilder();
        if (typeof this.toggleVariations === 'function') this.toggleVariations();
        if (typeof this.renderVariations === 'function') this.renderVariations();

        setVal('prod-stock', 0);
        setVal('prod-min-stock', 5);

        // Reset Recipe State
        if (this.tempRecipeState) this.tempRecipeState.clear();

        // Reset Image preview
        if (typeof this.removeImage === 'function') this.removeImage();

        // Reset Gallery
        this.galleryFiles = [];
        this.galleryUrls = [];
    },

    toggleMinOrder(checkbox) {
        const input = document.getElementById('prod-min-order');
        if (input) {
            input.disabled = checkbox.checked;
            if (checkbox.checked) input.value = 1;
        }
    },

    toggleVariations() {
        const isChecked = document.getElementById('prod-has-variations').checked;
        const container = document.getElementById('variations-container'); // Correct ID
        const simpleStock = document.getElementById('simple-stock-row');

        if (container) {
            container.style.display = isChecked ? 'block' : 'none';
        }

        // Use CSS Transition Class
        if (simpleStock) {
            if (isChecked) {
                simpleStock.classList.add('hidden');
            } else {
                simpleStock.classList.remove('hidden');
            }
        }
    },

    toggleVariablePricing() {
        const isChecked = document.getElementById('check-is-variable').checked;
        const group = document.getElementById('var-pricing-group');
        if (group) {
            group.style.display = isChecked ? 'block' : 'none';
        }
    },

    async saveInput() {
        const name = document.getElementById('input-name').value;
        const supplier = document.getElementById('input-supplier').value;
        const cost = parseFloat(document.getElementById('input-cost').value) || 0;
        const unit = document.getElementById('input-unit').value;

        const noMinStock = document.getElementById('check-no-min-stock').checked;
        const minStockVal = parseFloat(document.getElementById('input-min-stock').value) || 0;
        const minStock = noMinStock ? 0 : minStockVal;

        if (!name) {
            Swal.fire('Erro', 'Nome do insumo � obrigat�rio!', 'error');
            return;
        }

        const input = {
            id: 'input-' + Date.now(), // Simple ID generation
            name,
            supplier,
            cost,
            unit,
            stock: 0, // Initial stock 0
            min_stock: minStock
        };

        try {
            await window.productService.saveInput(input);
            Swal.fire({
                icon: 'success',
                title: 'Insumo Salvo!',
                text: `${name} foi adicionado com sucesso.`,
                timer: 1500,
                showConfirmButton: false
            });
            this.closeModals();
            this.renderInputList(); // Refresh list if open
        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Falha ao salvar insumo.', 'error');
        }
    },

    // State for Recipe (Map of ID -> Qty)
    tempRecipeState: new Map(),

    renderInputList(filterText = '') {
        const inputs = dataManager.getInputs() || [];
        const listContainer = document.getElementById('input-selection-list');

        const filtered = inputs.filter(i => i.name.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:10px;">Nenhum insumo encontrado.</div>';
            return;
        }

        listContainer.innerHTML = filtered.map(i => {
            const safeCost = parseFloat(i.cost) || 0;

            // Check state
            const isSelected = this.tempRecipeState.has(i.id);
            const currentQty = isSelected ? this.tempRecipeState.get(i.id) : 1;

            return `
            <div class="comp-item" data-id="${i.id}" data-cost="${safeCost}">
                <div style="display:flex;align-items:center;justify-content:flex-start;text-align:left;gap:8px;flex:1;">
                    <input type="checkbox" class="cost-check" onchange="adminApp.toggleCompItem(this, '${i.id}')" ${isSelected ? 'checked' : ''}>
                    <label style="font-size:0.9rem;cursor:pointer;color:#334155;text-align:left;" onclick="this.previousElementSibling.click()">${i.name} (${i.unit})</label>
                </div>
                
                <div style="display:flex;align-items:center;gap:10px;">
                    <input type="number" class="qty-input" value="${currentQty}" min="0.01" step="0.01" placeholder="Qtd"
                           style="width:70px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;visibility:${isSelected ? 'visible' : 'hidden'};font-size:0.8rem;" 
                           oninput="adminApp.updateCompQty(this, '${i.id}')" onclick="event.stopPropagation()">
                    <span style="font-size:0.8rem;color:#64748b;min-width:70px;text-align:right;">R$ ${safeCost.toFixed(2)}</span>
                </div>
            </div>
            `;
        }).join('');
    },

    toggleCompItem(checkbox, id) {
        try {
            const row = checkbox.closest('.comp-item');
            const qtyInput = row.querySelector('.qty-input');

            if (checkbox.checked) {
                // Add to state
                const qty = parseFloat(qtyInput.value) || 1;
                this.tempRecipeState.set(id, qty);

                qtyInput.style.visibility = 'visible';
                qtyInput.focus();
            } else {
                // Remove from state
                this.tempRecipeState.delete(id);

                qtyInput.style.visibility = 'hidden';
                qtyInput.value = 1;
            }
            // Force recalculation
            this.calculateProfit();
        } catch (e) {
            console.error(e);
        }
    },

    updateCompQty(input, id) {
        const qty = parseFloat(input.value) || 0;
        if (this.tempRecipeState.has(id)) {
            this.tempRecipeState.set(id, qty);
        }
        this.calculateProfit();
    },

    // Legacy support alias
    toggleQty(id) { this.calculateProfit(); },

    filterInputs(val) {
        this.renderInputList(val);
    },

    calculateProfit() {
        try {
            let totalCost = 0;
            let breakdownHtml = ''; // Build list string
            const allInputs = dataManager.getInputs();

            // Iterate State (not DOM)
            this.tempRecipeState.forEach((qty, id) => {
                const input = allInputs.find(i => i.id === id);
                if (input) {
                    const cost = parseFloat(input.cost) || 0;
                    const itemTotal = cost * qty;
                    totalCost += itemTotal;

                    // Add to breakdown list
                    breakdownHtml += `
                        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:2px;">
                            <span>${input.name} <span style="font-size:0.75rem; color:#94a3b8;">x${qty}</span></span>
                            <span>R$ ${itemTotal.toFixed(2)}</span>
                        </div>
                    `;
                }
            });

            // Update Breakdown UI
            const breakdownContainer = document.getElementById('profit-breakdown-list');
            if (breakdownContainer) {
                if (breakdownHtml) {
                    breakdownContainer.innerHTML = '<div style="font-weight:600; margin-bottom:5px; font-size:0.75rem;">COMPOSI��O:</div>' + breakdownHtml;
                    breakdownContainer.style.display = 'flex';
                } else {
                    breakdownContainer.innerHTML = '';
                    breakdownContainer.style.display = 'none';
                }
            }

            // ALERT TOTAL
            // alert(`Total Custo Produ��o: R$ ${totalCost.toFixed(2)}`);

            const priceInput = document.getElementById('prod-price-analysis'); // Using Analysis Input
            let price = 0;
            if (priceInput) {
                price = parseFloat(priceInput.value);
                if (isNaN(price)) price = 0;
            }

            // Suggested Price (Markup 2.5x -> 60% margin)
            const suggested = totalCost * 2.5;

            // Profit & Margin
            const profit = price - totalCost;
            let markup = 0;
            if (price > 0) {
                markup = (profit / price) * 100; // Margin on Revenue
            }

            // Update UI
            const setTxt = (id, val) => {
                const els = document.querySelectorAll(`[id="${id}"]`);
                els.forEach(el => el.innerText = val);
            };

            setTxt('calc-cost', `R$ ${totalCost.toFixed(2)}`);
            setTxt('calc-price', `R$ ${price.toFixed(2)}`);
            setTxt('calc-suggested', `R$ ${suggested.toFixed(2)}`);
            setTxt('calc-profit', `R$ ${profit.toFixed(2)}`);

            const pEls = document.querySelectorAll(`[id="calc-profit"]`);
            pEls.forEach(el => el.className = profit >= 0 ? 'profit-positive' : 'profit-negative');

            setTxt('calc-margin', `${markup.toFixed(0)}% (Margem)`); // Changed to Margem

            // Alert Logic
            const alertBox = document.getElementById('margin-alert');
            if (alertBox) {
                if (markup < 30 && price > 0) {
                    alertBox.style.display = 'block';
                    alertBox.innerHTML = `? Margem muito baixa (< 30%). Cuidado!`;
                } else {
                    alertBox.style.display = 'none';
                }
            }

            return { totalCost, margin: markup };
        } catch (e) {
            console.error("Calculate Profit Error:", e);
            // alert("Erro no c�lculo: " + e.message);
            return { totalCost: 0, margin: 0 };
        }
    },


    async saveProduct() {
        const id = document.getElementById('prod-id').value;
        const { totalCost } = this.calculateProfit();

        // 1. Upload New Files being saved
        if (this.galleryFiles && this.galleryFiles.length > 0 && window.StorageManager) {
            for (const file of this.galleryFiles) {
                const url = await window.StorageManager.uploadFile(file);
                if (url) this.galleryUrls.push(url);
            }
        }

        // 2. Determine Main Image (Capa)
        const mainImage = this.galleryUrls && this.galleryUrls.length > 0 ? this.galleryUrls[0] : 'https://via.placeholder.com/500';

        // Helper: safely get element value
        const val = (elId, def = '') => {
            const el = document.getElementById(elId);
            return el ? el.value : def;
        };
        const checked = (elId) => {
            const el = document.getElementById(elId);
            return el ? el.checked : false;
        };

        const payload = {
            name: val('prod-name'),
            category: val('prod-category'),
            price: 0,
            description: val('prod-description'),
            image: mainImage,
            min_qty: parseInt(val('prod-min-stock', '0')) || 0,
            cost: totalCost,

            weight: parseFloat(val('prod-weight', '0.3')) || 0.3,
            height: parseFloat(val('prod-height', '10')) || 10,
            width: parseFloat(val('prod-width', '10')) || 10,
            length: parseFloat(val('prod-length', '15')) || 15,

            recipe: [],

            pricing_type: checked('check-is-variable') ? 'variable' : 'fixed',
            variable_price: parseFloat(val('prod-var-bw', '0')) || 0,
            variable_price_heavy: parseFloat(val('prod-var-bw-heavy', '0')) || 0,
            variable_price_color: parseFloat(val('prod-var-color', '0')) || 0,
            variable_price_heavy_color: parseFloat(val('prod-var-color-heavy', '0')) || 0,
            base_price: parseFloat(val('prod-price-analysis', '0')) || 0
        };

        // Recipe Logic (From State)
        if (this.tempRecipeState) {
            this.tempRecipeState.forEach((qty, inputId) => {
                payload.recipe.push({ inputId: inputId, quantity: qty });
            });
        }

        if (!payload.name || !payload.name.trim()) {
            Swal.fire('Atenção', 'Nome do produto é obrigatório!', 'warning');
            return;
        }

        try {
            if (id) payload.id = id;

            // Upsert product and get the returned ID (important for new products)
            const { data: savedProduct, error } = await window.supabase
                .from('products')
                .upsert(payload)
                .select('id')
                .single();

            if (error) throw error;

            // Use the ID returned by Supabase (for new products it's auto-generated)
            const savedId = (savedProduct && savedProduct.id) || payload.id;

            // --- Save Tiers (only if we have the product ID) ---
            if (savedId) {
                const tiers = this.getTiersData ? this.getTiersData() : [];
                await window.supabase.from('product_tiers').delete().eq('product_id', savedId);

                if (tiers && tiers.length > 0) {
                    const tiersPayload = tiers.map(t => ({
                        product_id: savedId,
                        min_quantity: t.min_quantity,
                        unit_price: t.unit_price
                    }));
                    const { error: tierError } = await window.supabase.from('product_tiers').insert(tiersPayload);
                    if (tierError) console.error('Error saving tiers:', tierError);
                }
            }

            Swal.fire({
                icon: 'success',
                title: 'Produto salvo!',
                text: `"${payload.name}" publicado com sucesso.`,
                timer: 2000,
                showConfirmButton: false
            });
            this.closeModals();
            this.renderProductsTable();

        } catch (err) {
            console.error('saveProduct error:', err);
            Swal.fire('Erro', `Erro ao salvar produto: ${err.message || err}`, 'error');
        }
    },

    editProd(id) {
        const products = dataManager.getProducts();
        const prod = products.find(p => p.id === id);
        if (!prod) return;

        document.getElementById('modal-product').classList.add('open');
        this.resetModal(); // Clear previous state first

        // Helper: safely set value
        const setVal = (elId, v = '') => { const el = document.getElementById(elId); if (el) el.value = v; };
        const setChk = (elId, v) => { const el = document.getElementById(elId); if (el) el.checked = v; };

        // Fill Data
        setVal('prod-id', prod.id);
        setVal('prod-name', prod.name);
        setVal('prod-sku', prod.sku || '');
        setVal('prod-category', prod.category);

        // Trigger Subcategory Load
        if (prod.category) {
            this.loadSubcategories(prod.category).then(() => {
                setVal('prod-subcategory', prod.subcategory || '');
            });
        }

        setVal('prod-description', prod.description || '');
        setVal('prod-price-analysis', prod.price);
        setVal('prod-img', prod.image || '');
        setVal('prod-link', prod.validLink || '');
        setVal('prod-min-stock', prod.minStock || 5);

        // Variable Pricing (Apostilas)
        const isVariable = prod.pricing_type === 'variable';
        const varCheck = document.getElementById('check-is-variable');
        if (varCheck) {
            varCheck.checked = isVariable;
            setVal('prod-var-bw', prod.variable_price || '');
            setVal('prod-var-bw-heavy', prod.variable_price_heavy || '');
            setVal('prod-var-color', prod.variable_price_color || '');
            setVal('prod-var-color-heavy', prod.variable_price_heavy_color || '');
            this.toggleVariablePricing();
        }

        // Enterprise Configurator Load
        this.currentConfigRules = prod.configuration_rules || [];
        if (typeof this.renderVariationBuilder === 'function') this.renderVariationBuilder();

        // Show Image Preview if valid
        if (prod.image && prod.image.startsWith('http')) {
            const preview = document.getElementById('img-preview');
            const previewContainer = document.getElementById('img-preview-container');
            const dropZone = document.getElementById('drop-zone');
            if (preview) preview.src = prod.image;
            if (previewContainer) previewContainer.style.display = 'block';
            if (dropZone) dropZone.style.display = 'none';
        }

        // Load Min Order
        const minOrder = prod.minOrder || 1;
        setVal('prod-min-order', minOrder);
        setChk('check-no-min-order', minOrder === 1);
        const noMinEl = document.getElementById('check-no-min-order');
        if (noMinEl) this.toggleMinOrder(noMinEl);

        // Load Shipping Dimensions
        setVal('prod-weight', prod.weight || 0.3);
        setVal('prod-height', prod.height || 10);
        setVal('prod-width', prod.width || 10);
        setVal('prod-length', prod.length || 15);

        // Initialize Gallery
        this.galleryFiles = [];
        this.galleryUrls = prod.gallery || (prod.image ? [prod.image] : []);
        if (typeof this.renderGalleryPreview === 'function') this.renderGalleryPreview();

        // Load Tiers
        if (prod.id) {
            this.loadTiers(prod.id);
        } else {
            const tiersBody = document.getElementById('tiers-list-body');
            if (tiersBody) tiersBody.innerHTML = '';
        }

        // Variations Logic
        if (prod.variations && prod.variations.length > 0) {
            setChk('prod-has-variations', true);
            this.currentVariations = [...prod.variations];
            setVal('prod-stock', 0);
        } else {
            setChk('prod-has-variations', false);
            this.currentVariations = [];
            setVal('prod-stock', prod.stock || 0);
        }
        if (typeof this.toggleVariations === 'function') this.toggleVariations();
        if (typeof this.renderVariations === 'function') this.renderVariations();

        // Restore BOM (recipe)
        if (this.tempRecipeState) this.tempRecipeState.clear();
        if (prod.recipe && prod.recipe.length > 0) {
            prod.recipe.forEach(recipeItem => {
                this.tempRecipeState.set(recipeItem.inputId, parseFloat(recipeItem.quantity) || 1);
            });
        }
        if (typeof this.renderInputList === 'function') this.renderInputList();
        if (typeof this.calculateProfit === 'function') this.calculateProfit();
    },

    // --- Tiers Logic (Wholesale) ---


    addTierRow(min = 10, price = 0) {
        const tbody = document.getElementById('tiers-list-body');
        const tr = document.createElement('tr');

        // Calculate estimated profit/margin for display
        const { totalCost } = this.calculateProfit(); // Recalculate base cost
        const profit = price - totalCost;
        const margin = price > 0 ? ((profit / price) * 100) : 0;

        const totalRevenue = price * min; // NEW: Total Transaction Value

        tr.innerHTML = `
            <td>
                <input type="number" class="tier-min modal-input" value="${min}" style="padding:5px;" onchange="adminApp.updateTierCalculations(this)">
            </td>
            <td>
                <input type="number" class="tier-price modal-input" value="${price.toFixed(2)}" step="0.01" style="padding:5px;" onchange="adminApp.updateTierCalculations(this)">
            </td>
            <td class="tier-profit" style="color:${profit >= 0 ? '#10b981' : '#ef4444'}; font-size:0.85rem; padding-top:12px;">
                <div>Unit: R$ ${profit.toFixed(2)} (${margin.toFixed(0)}%)</div>
            </td>
            <td class="tier-total" style="font-size:0.85rem; color:#0f172a; padding-top:12px; font-weight:600;">
                 R$ ${totalRevenue.toFixed(2)}
            </td>
            <td>
                <button onclick="this.closest('tr').remove()" style="color:#ef4444; background:none; border:none; cursor:pointer;">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    },

    updateTierCalculations(input) {
        const tr = input.closest('tr');
        const min = parseInt(tr.querySelector('.tier-min').value) || 0;
        const price = parseFloat(tr.querySelector('.tier-price').value) || 0;
        const { totalCost } = this.calculateProfit(); // Recalculate base cost

        const profit = price - totalCost;
        const margin = price > 0 ? ((profit / price) * 100) : 0; // Margin on Revenue logic

        const totalRevenue = price * min; // NEW: Total Transaction Value

        const profitEl = tr.querySelector('.tier-profit');
        profitEl.innerHTML = `
            <div>Unit: R$ ${profit.toFixed(2)} (${margin.toFixed(0)}%)</div>
        `;
        profitEl.style.color = profit >= 0 ? '#10b981' : '#ef4444';

        // Update Total Column
        const totalEl = tr.querySelector('.tier-total');
        if (totalEl) {
            totalEl.innerText = `R$ ${totalRevenue.toFixed(2)}`;
        }
    },

    generateSuggestedTiers() {
        // Clear existing
        document.getElementById('tiers-list-body').innerHTML = '';

        const basePrice = parseFloat(document.getElementById('prod-price-analysis').value) || 0;
        if (basePrice <= 0) { Swal.fire('Erro', 'Defina um pre�o de venda base primeiro.', 'warning'); return; }

        const tiers = [];

        // 10 to 100 (Step 10)
        for (let q = 10; q <= 100; q += 10) tiers.push(q);
        // 200 to 900 (Step 100) - Stops at 900
        for (let q = 200; q <= 900; q += 100) tiers.push(q);
        // 1000 to 5000 (Step 1000) - Starts at 1000
        for (let q = 1000; q <= 5000; q += 1000) tiers.push(q);

        tiers.forEach(qty => {
            // Progressive Discount Logic (Curve)
            // 10 -> ~5%
            // 100 -> ~15%
            // 1000 -> ~25%
            // 5000 -> ~35%
            let discount = 0;
            if (qty <= 100) discount = 0.05 + ((qty - 10) / 90) * 0.10; // 5% to 15%
            else if (qty <= 1000) discount = 0.15 + ((qty - 200) / 800) * 0.10; // 15% to 25%
            else discount = 0.25 + ((qty - 2000) / 3000) * 0.10; // 25% to 35%

            // Round to sensible price (nice numbers? no, just math for now)
            let price = basePrice * (1 - discount);
            // Round to 2 decimals
            price = Math.round(price * 100) / 100;

            this.addTierRow(qty, price);
        });
    },

    // Save Tiers (Called inside saveProduct)
    getTiersData() {
        const tiers = [];
        document.querySelectorAll('#tiers-list-body tr').forEach(tr => {
            const min = parseInt(tr.querySelector('.tier-min').value) || 0;
            const price = parseFloat(tr.querySelector('.tier-price').value) || 0;
            if (min > 0 && price > 0) {
                tiers.push({ min_quantity: min, unit_price: price });
            }
        });
        return tiers;
    },

    async loadTiers(productId) {
        const tbody = document.getElementById('tiers-list-body');
        tbody.innerHTML = ''; // Clear

        if (!window.supabase) return;

        const { data } = await window.supabase.from('product_tiers')
            .select('*')
            .eq('product_id', productId)
            .order('min_quantity', { ascending: true });

        if (data) {
            data.forEach(t => this.addTierRow(t.min_quantity, t.unit_price));
        }
    },

    // --- Image Handling (Gallery Support) ---
    handleFileSelect(input) {
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    this.galleryFiles.push(file);
                }
            });
            this.renderGalleryPreview();
        }
    },

    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        document.getElementById('drop-zone').classList.remove('dragover');

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            Array.from(event.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    this.galleryFiles.push(file);
                }
            });
            this.renderGalleryPreview();
        }
    },

    removeGalleryItem(index, type) {
        if (type === 'url') {
            this.galleryUrls.splice(index, 1);
        } else {
            this.galleryFiles.splice(index, 1);
        }
        this.renderGalleryPreview();
    },

    renderGalleryPreview() {
        const container = document.getElementById('gallery-preview-grid');
        if (!container) return;
        container.innerHTML = '';

        // 1. Existing URLs
        this.galleryUrls.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.cssText = 'position:relative; height:120px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;';
            div.innerHTML = `
                <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
                <button onclick="adminApp.removeGalleryItem(${index}, 'url')" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
                ${index === 0 && this.galleryFiles.length === 0 ? '<span style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.6); color:white; font-size:0.7rem; text-align:center;">Capa Principal</span>' : ''}
            `;
            container.appendChild(div);
        });

        // 2. New Files (Previews)
        this.galleryFiles.forEach((file, index) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.cssText = 'position:relative; height:120px; border-radius:8px; overflow:hidden; border:1px solid #e2e8f0;';

            const reader = new FileReader();
            reader.onload = (e) => {
                div.innerHTML = `
                    <img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">
                    <button onclick="adminApp.removeGalleryItem(${index}, 'file')" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;">&times;</button>
                    ${index === 0 && this.galleryUrls.length === 0 ? '<span style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.6); color:white; font-size:0.7rem; text-align:center;">Nova Capa</span>' : ''}
                `;
            };
            reader.readAsDataURL(file);
            container.appendChild(div);
        });

        // Update Shim Input (Main Image)
        const mainUrl = this.galleryUrls.length > 0 ? this.galleryUrls[0] : '';
        document.getElementById('prod-img').value = mainUrl;
    },

    // Legacy Support (Se precisar)
    removeImage(e) { if (e) e.stopPropagation(); },

    async renderProductsTable() {
        const tbody = document.getElementById('products-table-body');
        // Fetch fresh data from Cloud
        await dataManager.fetchProducts();
        const products = dataManager.getProducts() || [];

        tbody.innerHTML = products.map(p => {
            // Feature Status Icons
            const hasGallery = (p.gallery && p.gallery.length > 0) || (p.image && p.image.startsWith('http'));
            const hasTiers = false; // Need to fetch tiers count or store it. For now, we assume false or check later.
            // Otimiza��o: No futuro, carregar tiers junto. Por enquanto, �cone est�tico ou check r�pido se der.

            // Calculate available stock
            const availableStock = dataManager.calculateAvailableStock(p);
            const minStock = p.minStock || 0;
            let stockIcon = '??';
            if (availableStock === 0) stockIcon = '?';
            else if (availableStock <= minStock) stockIcon = '??';

            return `
            <tr>
                <td>
                    <div style="font-weight:600;">${p.name}</div>
                    <div style="font-size:0.75rem;color:#94a3b8;">${p.category || '-'}</div>
                </td>
                <td>
                    <span style="font-size:0.85rem; color:#475569;">${p.subcategory || '-'}</span>
                </td>
                <td>
                    ${hasGallery ? '<span style="color:#10b981; font-weight:600;"><i class="ph-bold ph-check"></i> Sim</span>' : '<span style="color:#d1d5db;">-</span>'}
                </td>
                <td>
                    <!-- Tiers Status placeholder -->
                    <span style="color:#64748b; font-size:0.8rem;">Ver Detalhes</span>
                </td>
                <td>
                    <span style="font-weight:700;font-size:0.95rem;">${stockIcon} ${availableStock === Infinity ? '8' : availableStock} un</span>
                </td>
                <td>
                    <button onclick="adminApp.editProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:#0ea5e9;margin-right:10px;"><i class="ph-bold ph-pencil-simple"></i></button>
                    <button onclick="adminApp.deleteProd('${p.id}')" style="background:none;border:none;cursor:pointer;color:red;"><i class="ph-bold ph-trash"></i></button>
                </td>
            </tr>
            `;
        }).join('');
    },

    // --- Subcategory Logic ---
    async loadSubcategories(categoryName) {
        const subSelect = document.getElementById('prod-subcategory');
        subSelect.innerHTML = '<option value="">Carregando...</option>';
        subSelect.disabled = true;

        if (!categoryName) {
            subSelect.innerHTML = '<option value="">Selecione Categoria...</option>';
            return;
        }

        try {
            // 1. Find Category ID by Name (since 'prod-category' value is Name)
            // Isso assume que o value do option S�O NOMES. Se forem IDs, melhor.
            // Vamos checar como 'renderCategories' preenche.
            // Se for nome, precisamos buscar o ID da tabela categories.

            const { data: catData } = await window.supabase.from('categories').select('id').eq('name', categoryName).single();
            if (!catData) {
                subSelect.innerHTML = '<option value="">Categoria n�o encontrada</option>';
                return;
            }

            const { data: subs } = await window.supabase.from('categories')
                .select('name')
                .eq('parent_id', catData.id)
                .order('name');

            if (subs && subs.length > 0) {
                subSelect.innerHTML = '<option value="">Selecione...</option>' +
                    subs.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
                subSelect.disabled = false;
            } else {
                subSelect.innerHTML = '<option value="">Sem subcategorias</option>';
            }
        } catch (e) {
            console.error("Error loading subcategories", e);
            subSelect.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    },

    deleteProd(id) {
        this.showConfirm('Excluir produto?', 'O produto ser� removido da loja e do painel.', async () => {
            await dataManager.deleteProduct(id);
            this.renderProductsTable();
        });
    },

    switchProductTab(tabId) {
        // Hide All
        ['general', 'gallery', 'tiers', 'configurator'].forEach(t => {
            const el = document.getElementById(`prod-tab-${t}`);
            const btn = document.getElementById(`btn-tab-${t}`);
            if (el) el.style.display = 'none';
            if (btn) btn.classList.remove('active');
        });

        // Show Current
        const target = document.getElementById(`prod-tab-${tabId}`);
        const btnSuccess = document.getElementById(`btn-tab-${tabId}`);

        if (target) {
            target.style.display = (tabId === 'general') ? 'flex' : 'block';
        }
        if (btnSuccess) btnSuccess.classList.add('active');
    },

    async renderDashboard() {
        // 1. Date (Consolidated Fix)
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const dateEl = document.getElementById('dash-date');
        if (dateEl) dateEl.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        // 2. Data Fetching
        if (!window.supabase) return;

        // Parallel Fetch for Speed
        const [productsHelper, inputsHelper, financialHelper, lowStock] = await Promise.all([
            window.dataManager?.fetchProducts(),
            window.dataManager?.fetchInputs(),
            window.supabase.from('financial_records').select('*'),
            window.dataManager?.getLowStockInputs() || []
        ]);

        const products = window.dataManager?.getProducts() || [];
        const financials = financialHelper.data || [];

        // 3. Financial Calculations (Realtime)
        const todayStr = now.toISOString().split('T')[0];
        const monthStr = now.toISOString().slice(0, 7); // YYYY-MM

        let salesToday = 0;
        let profitMonth = 0;
        let salesHistory = {}; // For Forecast

        financials.forEach(rec => {
            const val = parseFloat(rec.total) || 0;
            const date = rec.created_at.split('T')[0];
            const month = rec.created_at.slice(0, 7);

            // Sales Today
            if (rec.type === 'income' && date === todayStr) {
                salesToday += val;
            }

            // Profit Month (Income - Expense)
            if (month === monthStr) {
                if (rec.type === 'income') profitMonth += val;
                if (rec.type === 'expense') profitMonth -= val;
            }

            // Aggregate for Forecast (Daily Totals)
            if (rec.type === 'income') {
                salesHistory[date] = (salesHistory[date] || 0) + val;
            }
        });

        // 4. Update Stats UI
        const elSales = document.getElementById('stat-sales-today');
        if (elSales) elSales.innerText = salesToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elProfit = document.getElementById('stat-profit-month');
        if (elProfit) {
            elProfit.innerText = profitMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elProfit.style.color = profitMonth >= 0 ? '#10b981' : '#ef4444';
        }

        const elLowStock = document.getElementById('stat-low-stock');
        if (elLowStock) elLowStock.innerText = lowStock.length;

        // 5. AI Forecast Logic (Simple Moving Average)
        const daysWithSales = Object.values(salesHistory);
        let forecast = 0;
        if (daysWithSales.length > 0) {
            const sum = daysWithSales.reduce((a, b) => a + b, 0);
            const avgDaily = sum / Math.max(daysWithSales.length, 1);
            forecast = avgDaily * 30; // Project next 30 days
        }

        const elForecast = document.getElementById('stat-forecast');
        if (elForecast) {
            elForecast.innerText = forecast.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            // Add subtle pulse if forecast is high
            elForecast.style.animation = forecast > 5000 ? 'pulse 2s infinite' : 'none';
        }

        // 6. Populate Alerts Table
        const tbody = document.getElementById('dash-alerts-body');
        if (tbody) {
            if (lowStock.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">Tudo certo por aqui! ?? Estoque saud�vel.</td></tr>';
            } else {
                tbody.innerHTML = lowStock.map(item => `
                    <tr>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary)">${item.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary)">${item.supplier || '-'}</div>
                        </td>
                        <td>${item.stock} ${item.unit}</td>
                        <td><span class="status-badge status-error">Baixo</span></td>
                    </tr>
                `).join('');
            }
        }

        // Refresh Goals Widget too
        this.renderFinancialGoals();
        this.renderCharts();
    },

    // --- Inventory Management ---
    openStockEntry(inputId) {
        const inputs = dataManager.getInputs();
        const input = inputs.find(i => i.id === inputId);
        if (!input) return;

        const modal = document.getElementById('modal-stock-entry');
        modal.classList.add('open');
        document.getElementById('stock-entry-input-id').value = inputId;
        document.getElementById('stock-entry-name').innerText = input.name;
        document.getElementById('stock-entry-qty').value = '';
        document.getElementById('stock-entry-supplier').value = input.supplier || '';
        document.getElementById('stock-entry-cost').value = input.cost || '';
        document.getElementById('stock-entry-note').value = '';
    },

    // Helper to prevent double clicks
    // --- Stock Logic ---
    toggleMinStock(checkbox) {
        const input = document.getElementById('prod-min-stock');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = '';
            input.placeholder = 'Sem alerta';
        } else {
            input.disabled = false;
            input.value = 5;
            input.placeholder = 'Qtd';
        }
    },

    toggleMinOrder(checkbox) {
        const input = document.getElementById('prod-min-order');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = '';
            input.placeholder = 'Livre';
        } else {
            input.disabled = false;
            input.value = 1;
            input.placeholder = 'Qtd';
        }
    },

    setLoading(btnSelector, isLoading) {
        const btn = document.querySelector(btnSelector);
        if (!btn) return;
        btn.disabled = isLoading;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Processando...';
        } else {
            btn.innerHTML = btn.dataset.originalText || 'Salvar';
        }
    },

    async saveStockEntry() {
        try {
            this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', true);
            const inputId = document.getElementById('stock-entry-input-id').value;
            const qty = parseFloat(document.getElementById('stock-entry-qty').value);
            const supplier = document.getElementById('stock-entry-supplier').value;
            const note = document.getElementById('stock-entry-note').value;

            if (!qty || qty <= 0) {
                alert('Informe uma quantidade v�lida!');
                this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', false);
                return;
            }

            const reason = `Entrada de estoque${supplier ? ` - ${supplier}` : ''}${note ? ` (${note})` : ''}`;

            const success = await dataManager.adjustStock(inputId, qty, 'entrada', reason);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.renderProductsTable(); // Update available stock
                this.renderDashboard();
                this.updateInventoryBadge(); // Update badge
                alert('Entrada registrada com sucesso!');
            } else {
                alert('Erro ao registrar entrada (retorno falso).');
            }
        } catch (e) {
            console.error(e);
            alert('Erro inesperado: ' + e.message);
        } finally {
            this.setLoading('#modal-stock-entry button[onclick*="saveStockEntry"]', false);
        }
    },

    openStockAdjust(inputId) {
        const inputs = dataManager.getInputs();
        const input = inputs.find(i => i.id === inputId);
        if (!input) return;

        const modal = document.getElementById('modal-stock-adjust');
        modal.classList.add('open');
        document.getElementById('stock-adjust-input-id').value = inputId;
        document.getElementById('stock-adjust-name').innerText = input.name;
        document.getElementById('stock-adjust-current').innerText = `Estoque atual: ${input.stock || 0} ${input.unit}`;
        document.getElementById('stock-adjust-qty').value = '';
        document.getElementById('stock-adjust-type').value = 'perda';
        document.getElementById('stock-adjust-reason').value = '';
    },

    async saveStockAdjust() {
        try {
            this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', true);
            const inputId = document.getElementById('stock-adjust-input-id').value;
            const qty = parseFloat(document.getElementById('stock-adjust-qty').value);
            const type = document.getElementById('stock-adjust-type').value;
            const reason = document.getElementById('stock-adjust-reason').value;

            if (!qty || qty <= 0) {
                alert('Informe uma quantidade v�lida!');
                this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
                return;
            }

            if (!reason) {
                alert('Informe um motivo para o ajuste!');
                this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
                return;
            }

            // Negative quantity for loss/usage
            const success = await dataManager.adjustStock(inputId, -qty, type, reason);
            if (success) {
                this.closeModals();
                this.renderInputsTable();
                this.renderProductsTable(); // Update available stock
                this.renderDashboard();
                this.updateInventoryBadge(); // Update badge
                alert('Ajuste registrado com sucesso!');
            } else {
                alert('Erro ao registrar ajuste (retorno falso).');
            }
        } catch (e) {
            console.error(e);
            alert('Erro inesperado: ' + e.message);
        } finally {
            this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', false);
        }
    },

    // --- Inventory Control View ---
    async renderInventoryView() {
        await dataManager.fetchInputs(); // Ensure stock is fresh
        await dataManager.fetchHistory(); // Ensure history is fresh
        this.renderInventoryOverview();
        this.renderInventoryHistory('all');
        this.updateInventoryStats();
    },

    renderInventoryOverview() {
        const tbody = document.getElementById('inventory-overview-body');
        const inputs = dataManager.getInputs();

        tbody.innerHTML = inputs.map(input => {
            const stock = input.stock || 0;
            const minStock = input.minStock || 0;
            const status = dataManager.getStockStatus(input);
            const totalValue = stock * (input.cost || 0);

            const statusConfig = {
                'ok': { icon: '??', label: 'OK', color: '#10b981' },
                'low': { icon: '??', label: 'Baixo', color: '#f59e0b' },
                'critical': { icon: '??', label: 'Cr�tico', color: '#ef4444' },
                'out': { icon: '?', label: 'Esgotado', color: '#64748b' }
            }[status];

            return `
                <tr style="background: ${status === 'critical' || status === 'out' ? '#fef2f2' : 'white'}">
                    <td>
                        <strong>${input.name}</strong>
                        <div style="font-size:0.75rem;color:#94a3b8;">${input.supplier || 'Sem fornecedor'}</div>
                    </td>
                    <td>
                        <span style="font-weight:600;font-size:1.1rem;">${stock} ${input.unit}</span>
                    </td>
                    <td>
                        <span style="color:#64748b;">${minStock} ${input.unit}</span>
                    </td>
                    <td>
                        <span style="color:${statusConfig.color};font-weight:600;">
                            ${statusConfig.icon} ${statusConfig.label}
                        </span>
                    </td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>
                        <button onclick="adminApp.openStockEntry('${input.id}')" 
                            style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;" title="Entrada">
                            <i class="ph-bold ph-plus-circle"></i>
                        </button>
                        <button onclick="adminApp.openStockAdjust('${input.id}')" 
                            style="color:#ef4444;border:none;background:none;cursor:pointer;" title="Sa�da">
                            <i class="ph-bold ph-minus-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    renderInventoryHistory(filter = 'all') {
        const tbody = document.getElementById('inventory-history-body');
        let history = dataManager.getInventoryHistory(50);

        if (filter !== 'all') {
            history = history.filter(h => h.type === filter);
        }

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">
                        Nenhuma movimenta��o encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = history.map(h => {
            const date = new Date(h.date);
            const typeConfig = {
                'entrada': { icon: '??', label: 'Entrada', color: '#10b981' },
                'venda': { icon: '??', label: 'Venda', color: '#3b82f6' },
                'perda': { icon: '??', label: 'Perda', color: '#ef4444' },
                'uso_interno': { icon: '??', label: 'Uso Interno', color: '#f59e0b' },
                'manual': { icon: '??', label: 'Ajuste', color: '#64748b' }
            }[h.type] || { icon: '??', label: h.type, color: '#64748b' };

            const quantityColor = h.quantity > 0 ? '#10b981' : '#ef4444';
            const quantitySign = h.quantity > 0 ? '+' : '';

            return `
                <tr>
                    <td>
                        <div style="font-weight:600;font-size:0.85rem;">${date.toLocaleDateString('pt-BR')}</div>
                        <div style="font-size:0.75rem;color:#94a3b8;">${date.toLocaleTimeString('pt-BR')}</div>
                    </td>
                    <td>
                        <span style="color:${typeConfig.color};font-weight:600;">
                            ${typeConfig.icon} ${typeConfig.label}
                        </span>
                    </td>
                    <td>${h.inputName}</td>
                    <td style="color:${quantityColor};font-weight:700;">
                        ${quantitySign}${h.quantity}
                    </td>
                    <td style="font-size:0.85rem;">${h.reason || '-'}</td>
                    <td style="color:#64748b;font-size:0.85rem;">${h.user || 'Sistema'}</td>
                </tr>
            `;
        }).join('');
    },

    updateInventoryStats() {
        const inputs = dataManager.getInputs();
        const lowStock = dataManager.getLowStockInputs();
        const history = dataManager.getInventoryHistory();

        // Count movements today
        const today = new Date().toDateString();
        const movementsToday = history.filter(h => {
            const date = new Date(h.date);
            return date.toDateString() === today;
        }).length;

        document.getElementById('critical-stock-count').innerText = lowStock.length;
        document.getElementById('total-inputs-count').innerText = inputs.length;
        document.getElementById('movements-today-count').innerText = movementsToday;
    },

    refreshInventoryView() {
        this.renderInventoryView();
    },

    filterHistory(type) {
        this.renderInventoryHistory(type);
    },

    showLowStockOnly() {
        const inputs = dataManager.getLowStockInputs();
        const tbody = document.getElementById('inventory-overview-body');

        if (inputs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#10b981;">
                        ? Nenhum item com estoque cr�tico!
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = inputs.map(input => {
            const stock = input.stock || 0;
            const minStock = input.minStock || 0;
            const status = dataManager.getStockStatus(input);
            const totalValue = stock * (input.cost || 0);

            const statusConfig = {
                'low': { icon: '??', label: 'Baixo', color: '#f59e0b' },
                'critical': { icon: '??', label: 'Cr�tico', color: '#ef4444' },
                'out': { icon: '?', label: 'Esgotado', color: '#64748b' }
            }[status];

            return `
                <tr style="background:#fef2f2">
                    <td>
                        <strong>${input.name}</strong>
                        <div style="font-size:0.75rem;color:#94a3b8;">${input.supplier || 'Sem fornecedor'}</div>
                    </td>
                    <td><span style="font-weight:600;font-size:1.1rem;">${stock} ${input.unit}</span></td>
                    <td><span style="color:#64748b;">${minStock} ${input.unit}</span></td>
                    <td>
                        <span style="color:${statusConfig.color};font-weight:600;">
                            ${statusConfig.icon} ${statusConfig.label}
                        </span>
                    </td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>
                        <button onclick="adminApp.openStockEntry('${input.id}')" 
                            style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;">
                            <i class="ph-bold ph-plus-circle"></i>
                        </button>
                        <button onclick="adminApp.openStockAdjust('${input.id}')" 
                            style="color:#ef4444;border:none;background:none;cursor:pointer;">
                            <i class="ph-bold ph-minus-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    showAllStock() {
        this.renderInventoryOverview();
    },

    showInventoryHistory() {
        // Scroll to history section
        const historyTable = document.getElementById('inventory-history-table');
        if (historyTable) {
            historyTable.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // Update Inventory Badge
    updateInventoryBadge() {
        const lowStock = dataManager.getLowStockInputs();
        const badge = document.getElementById('inventory-badge');
        if (badge) {
            if (lowStock.length > 0) {
                badge.style.display = 'inline-block';
                badge.innerText = lowStock.length;
            } else {
                badge.style.display = 'none';
            }
        }
    },

    // --- Module 4: Order Management ---
    // --- Module 4: Order Management ---
    // --- Module 4: Order Management (Protocols) ---
    renderOrdersTable() {
        // Delegate to the new Protocols Manager
        if (typeof ProtocolsManager !== 'undefined') {
            ProtocolsManager.loadProtocols();
        } else {
            console.error("ProtocolsManager not loaded.");
            document.getElementById('orders').innerHTML = '<div style="padding:20px; color:red;">Erro: Gerenciador de Protocolos no carregado.</div>';
        }
    },

    // Legacy Kanban - REMOVED


    // --- Module 5: Financial Control (New Tab) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---

    // Helper to calculate dates
    filterFinancial(rangeType) {
        const now = new Date();
        let start, end;

        if (rangeType === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day
        } else if (rangeType === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (rangeType === 'custom') {
            const sVal = document.getElementById('fin-date-start').value;
            const eVal = document.getElementById('fin-date-end').value;
            if (!sVal || !eVal) { alert('Selecione as datas de in�cio e fim!'); return; }
            start = new Date(sVal);
            end = new Date(eVal);
            // End of the selected day
            end.setHours(23, 59, 59, 999);
        }

        // Set inputs to match
        const fmt = d => d.toISOString().split('T')[0];
        if (start) document.getElementById('fin-date-start').value = fmt(start);
        if (end) document.getElementById('fin-date-end').value = fmt(end);

        this.renderFinancial({ startDate: start, endDate: end });
    },

    // State for filtering
    currentStatusFilter: 'all', // 'all', 'pending', 'paid'

    filterStatus(status) {
        this.currentStatusFilter = status;
        this.renderFinancial();

        // Update visual state (optional but nice)
        // For now, let's keep it simple.
    },

    async renderFinancial(options = { isBackground: false, startDate: null, endDate: null }) {
        console.log("Admin: renderFinancial Init", options);
        const tbody = document.getElementById('financial-table-body');
        if (!tbody) { console.error("Admin: Tbody missing"); return; }

        if (!options.isBackground) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;"><i class="ph-duotone ph-spinner-gap ph-spin" style="font-size:2rem;"></i><br>Carregando dados...</td></tr>';
            // Trigger Goals Render
            if (this.renderFinancialGoals) this.renderFinancialGoals();
        }
        // Trigger Goals Render (Safe)
        if (this.renderFinancialGoals) this.renderFinancialGoals();

        try {
            // Default to This Month if no dates provided
            let { startDate, endDate } = options;
            if (!startDate) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);

                // Set inputs initial state
                const fmt = d => d.toISOString().split('T')[0];
                const iS = document.getElementById('fin-date-start');
                const iE = document.getElementById('fin-date-end');
                if (iS && !iS.value) iS.value = fmt(startDate);
                if (iE && !iE.value) iE.value = fmt(endDate);
            }

            // 1. Array de Pedidos (Removido busca duplicada, agora os protocolos vêm todos no passo 2)
            let orders = [];

            // 2. Fetch Manual Data (Supabase 'financial') - FILTERED BY DB
            let cloudManualOrders = [];
            if (window.supabase) {
                try {
                    let query = window.supabase
                        .from('protocols')
                        .select('*')
                        .gte('created_at', startDate.toISOString())
                        .lte('created_at', endDate.toISOString())
                        .order('created_at', { ascending: false });

                    const { data, error } = await query;

                    if (error) {
                        console.error("Admin: Manual fetch failed", error);
                    } else if (data) {
                        console.log(`Admin: Loaded ${data.length} protocols from DB (filtered)`);

                        // Map protocols to financial format
                        // Protocols structure: id, client_id, total_amount, created_at, status, etc
                        cloudManualOrders = data.map(r => ({
                            id: r.id,
                            customer_name: r.client_name || `Cliente #${r.client_id || 'N/A'}`,
                            total: Number(r.total_amount) || 0,
                            date: r.created_at,
                            status: r.status || 'pending',
                            items: [{ name: r.official_id || `Protocolo #${r.id}`, quantity: 1 }],
                            type: 'income',
                            category: 'protocol',
                            isManual: false,
                            source: 'cloud'
                        }));
                    }
                } catch (err) {
                    console.error("Admin: Manual fetch failed", err);
                    Swal.fire({
                        title: 'Erro de Dados',
                        text: 'Falha ao buscar protocolos: ' + (err.message || 'Erro desconhecido'),
                        icon: 'error'
                    });
                }
            } else {
                console.warn("Admin: Supabase client is missing during fetch.");
            }

            // DEBUG: Show count
            console.log(`Debug: ${cloudManualOrders.length} protocols found.`);
            if (cloudManualOrders.length === 0) {
                // Toast to warn user if truly empty (debug mode)
                // Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Nenhum protocolo encontrado no período.' });
            }

            // 3. Load Local Manual Orders (Secondary)
            let localManualOrders = [];
            try {
                const local = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
                if (local.length > 0) {
                    console.log(`Admin: Loaded ${local.length} local manual records`);
                    localManualOrders = local.map(l => ({ ...l, isManual: true, source: 'local' }));
                }
            } catch (e) { console.error(e); }

            // Merge and Deduplicate (CLOUD WINS)
            // Strategy: Add Cloud first, then add Local only if ID not present
            const manualMap = new Map();

            // 1. Add Cloud (The Truth)
            cloudManualOrders.forEach(o => manualMap.set(o.id, o));

            // 2. Add Local (Only if missing in Cloud)
            localManualOrders.forEach(o => {
                if (!manualMap.has(o.id)) {
                    manualMap.set(o.id, o);
                }
            });

            let manualOrders = Array.from(manualMap.values());

            // ⚠️ CHECK IF SUPABASE IS MISSING
            if (!window.supabase) {
                console.warn("Admin: Supabase client not found.");
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        title: 'Aviso de Sistema',
                        text: 'O cliente Supabase não foi carregado. Você pode estar vendo apenas dados locais (antigos). Verifique sua conexão.',
                        icon: 'warning',
                        toast: true, position: 'top-end', showConfirmButton: false, timer: 5000
                    });
                }
            }

            // ⚠️ CHECK FOR EMPTY DATA and SHOW FEEDBACK
            if (manualOrders.length === 0 && orders.length === 0) {
                console.log("Admin: No records found for this period.");
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:40px;color:#64748b;">
                            <i class="ph-duotone ph-magnifying-glass" style="font-size:2rem;margin-bottom:10px;"></i><br>
                            <strong>Nenhum registro encontrado.</strong><br>
                            <span style="font-size:0.9em">Tente alterar o filtro de data acima ou verifique a conexão.</span>
                        </td>
                    </tr>`;
                // Update Dashboard Cards to 0 (Visual Reset)
                if (!options.isBackground && this.updateFinancialCards) this.updateFinancialCards([], {});
                return;
            }

            // 3. Payments (Moved Up for dependencies)
            let paymentsMap = {};
            let totalAccount = 0;
            let totalCash = 0;

            if (window.supabase) {
                try {
                    const { data: pay, error: payError } = await window.supabase
                        .from('order_payments')
                        .select('order_id, amount, payment_method');

                    if (!payError && pay) {
                        pay.forEach(p => {
                            const amt = Number(p.amount);
                            paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + amt;

                            // Split Totals
                            if (p.payment_method === 'cash') totalCash += amt;
                            else totalAccount += amt; // Default to Account
                        });
                    }
                } catch (e) {
                    console.error("Payment fetch error", e);
                }
            } else {
                paymentsMap = JSON.parse(SafeStorage.getItem('mv_payments') || '{}');
            }

            // --- EMPTY STATE / EMERGENCY MOCK DATA ---
            if (manualOrders.length === 0 && orders.length === 0) {
                console.warn("Admin: No data found. Injecting Mock Data for Demo.");
                manualOrders = [
                    { id: 'mock-1', customer_name: 'Cliente Exemplo 1', total: 150.00, date: new Date().toISOString(), status: 'paid', items: [{ name: 'Cart�o de Visita' }], type: 'income', isManual: true },
                    { id: 'mock-2', customer_name: 'Cliente Exemplo 2', total: 350.50, date: new Date(Date.now() - 86400000).toISOString(), status: 'pending', items: [{ name: 'Banner 100x100' }], type: 'income', isManual: true },
                    { id: 'mock-3', customer_name: 'Fornecedor Papel', total: 89.90, date: new Date(Date.now() - 172800000).toISOString(), status: 'paid', items: [{ name: 'Papel A4' }], type: 'expense', isManual: true },
                    { id: 'mock-4', customer_name: 'Cliente Balc�o', total: 45.00, date: new Date().toISOString(), status: 'paid', items: [{ name: 'Xerox e Impress�o' }], type: 'income', isManual: true }
                ];
                // Inject Mock Payments so they show as Paid/Green
                paymentsMap['mock-1'] = 150.00;
                paymentsMap['mock-3'] = 89.90;
                paymentsMap['mock-4'] = 45.00;
                // Update Header Totals Mock
                totalCash = 45.00;
                totalAccount = 150.00;
            }
            // --------------------------------

            // 4. Merge All Records (Fix Duplicates)
            let allRecords = [...orders, ...manualOrders];

            // Apply Status Filter
            if (this.currentStatusFilter !== 'all') {
                allRecords = allRecords.filter(r => {
                    // Logic fixed to use paymentsMap correctly
                    const status = (r.status || 'pending').toLowerCase();
                    const filter = this.currentStatusFilter.toLowerCase();

                    const paid = paymentsMap[r.id] || 0;
                    const total = Number(r.total) || 0;
                    const debt = total - paid;
                    const isPaid = debt <= 0.01;

                    if (filter === 'pending') {
                        return debt > 0.01;
                    }
                    if (filter === 'paid') {
                        return isPaid;
                    }
                    return true;
                });
            }

            // Apply Search Filter (if any)
            const searchTerm = document.getElementById('financial-search') ? document.getElementById('financial-search').value.toLowerCase() : '';
            if (searchTerm) {
                allRecords = allRecords.filter(r =>
                    (r.customer_name && r.customer_name.toLowerCase().includes(searchTerm)) ||
                    (r.id && r.id.toLowerCase().includes(searchTerm))
                );
            }

            // Store for details lookup & Export
            this.lastFinancialRecords = allRecords;
            this.lastPaymentsMap = paymentsMap; // Exposed for Print/Export

            // Sort by Date Descending
            allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            let totalReceivable = 0;
            let totalPaid = 0;
            // 4. Render Main Table
            let html = '';

            // ... (rest of renderFinancial) ...

            // --- NEW: DEBTOR WALLET AGGREGATION ---
            const debtors = {}; // { 'ClientName': { totalDebt: 0, orders: [] } }

            // --- CRM: VIP & RISK RADAR (Pre-Calculate Stats) ---
            const customerStats = {};
            allRecords.forEach(r => {
                if (r.type !== 'expense' && r.customer_name) {
                    const paid = paymentsMap[r.id] || 0;
                    const total = Number(r.total);
                    const name = r.customer_name;
                    if (!customerStats[name]) customerStats[name] = { spent: 0, debt: 0 };
                    customerStats[name].spent += total;
                    if (total - paid > 0.01) customerStats[name].debt += (total - paid);
                }
            });

            allRecords.forEach(order => {
                const isExpense = order.type === 'expense'; // Defined early
                const paid = paymentsMap[order.id] || 0;
                const total = Number(order.total);
                const debt = total - paid;

                // Only count if debt exists
                if (debt > 0.01 && !isExpense) {
                    const name = order.customer_name || 'Desconhecido';
                    if (!debtors[name]) debtors[name] = { totalDebt: 0, count: 0 };
                    debtors[name].totalDebt += debt;
                    debtors[name].count++;
                }

                if (isExpense) {
                    // Expenses subtract from Cash (if we consider them paid)
                    // Since saveExpense sets status='paid', we assume it's money out.
                    // We directly subtract the expense total from the "Total Paid" (Cash Flow)
                    totalPaid -= total;
                } else {
                    if (debt > 0.01) totalReceivable += debt;
                    totalPaid += paid;
                }

                const isPaid = debt <= 0.01;
                const trClass = isPaid ? 'opacity-50' : '';
                const btnLabel = isPaid ? '✔ Quitado' : 'Registrar Pagamento';
                const btnClass = isPaid ? 'btn-ghost' : 'btn-primary';
                const btnDisabled = isPaid ? 'disabled title="Pedido já está quitado"' : '';
                const btnStyle = isPaid ? 'padding:4px 12px; font-size:0.8rem; opacity:0.5; cursor:not-allowed;' : 'padding:4px 12px; font-size:0.8rem;';
                const isManual = order.isManual || order.id.toString().startsWith('M-') || order.id.toString().startsWith('EXP-');

                const typeBadge = isExpense
                    ? '<span class="status-badge" style="background:#fee2e2;color:#ef4444;">Despesa</span>'
                    : (isManual
                        ? '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;">Avulso</span>'
                        : `<span class="status-badge">${order.status || 'pending'}</span>`);

                // Style logic for Expense
                const rowStyle = isExpense ? 'border-left: 3px solid #ef4444;' : '';
                const amountColor = isExpense ? '#ef4444' : '#1e293b';
                const amountPrefix = isExpense ? '- ' : '';

                // Adjust Debt/Receivable Logic for Expense
                // Expenses are "outputs", so if 'paid' (default), it means money LEFT the account.
                // We don't usually track "receivable" expenses unless it's a debt WE owe.
                // For simplicity: If expense is created, it affects CASH immediately (if paid).
                // If it's pending (unpaid bill), it's a "Account Payable" (Future Feature).
                // Current Implementation assumes Expenses are PAID.

                // --- CONFIGURA��O DO RADAR CRM (Ver scripts/config/config.js) ---
                const { VIP_THRESHOLD, VIP_ICON, DEBT_ICON } = window.CRM_CONFIG || { VIP_THRESHOLD: 1000, VIP_ICON: '??', DEBT_ICON: '??' };

                // CRM Badges
                let crmBadges = '';
                if (!isExpense && order.customer_name) {
                    const stats = customerStats[order.customer_name] || { spent: 0, debt: 0 };

                    // Regra: Cliente VIP
                    if (stats.spent > VIP_THRESHOLD) {
                        crmBadges += `<span title="Cliente VIP (> R$ ${VIP_THRESHOLD})" style="cursor:help; margin-left:4px;">${VIP_ICON}</span>`;
                    }

                    // Regra: Cliente Devedor
                    if (stats.debt > 0) {
                        crmBadges += `<span title="Possui D�vidas" style="cursor:help; margin-left:4px;">${DEBT_ICON}</span>`;
                    }
                }

                html += `
            <tr class="${trClass}" style="cursor:pointer; transition:background 0.2s; ${rowStyle}" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'" onclick="adminApp.openOrderDetails('${order.id}')">
                <td style="font-weight:bold;">${isExpense ? '??' : (isManual ? '??' : '#')} ${order.id}</td>
                <td>
                    <div style="font-weight:600;">
                        ${order.customer_name || (isExpense ? order.description : 'Cliente')}
                        ${crmBadges}
                    </div>
                    <div style="font-size:0.8rem;color:#64748b;">${new Date(order.date).toLocaleDateString('pt-BR')} ${order.category ? `� ${order.category}` : ''}</div>
                </td>
                <td>${typeBadge}</td>
                <td style="font-weight:700; color:${amountColor};">${amountPrefix}R$ ${total.toFixed(2)}</td>
                <td style="color:#10b981;">R$ ${paid.toFixed(2)}</td>
                <td style="font-weight:700; color:${debt > 0.01 ? '#ef4444' : '#94a3b8'};">R$ ${Math.max(0, debt).toFixed(2)}</td>
                <td onclick="event.stopPropagation()">
                    <button onclick="${isPaid ? '' : `adminApp.openPaymentModal('${order.id}', ${total}, ${paid})`}" class="${btnClass}" style="${btnStyle}" ${btnDisabled}>
                        ${btnLabel} <i class="ph-bold ph-money"></i>
                    </button>
                    ${isManual ? `
                        <button onclick="adminApp.openEditDebtModal('${order.id}')" style="background:none;border:none;color:#64748b;cursor:pointer;margin-left:5px;" title="Editar"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button onclick="adminApp.deleteManualDebt('${order.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;margin-left:2px;" title="Excluir"><i class="ph-bold ph-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
            `;
            });

            // Render Debtor Wallet Widget
            const walletContainer = document.getElementById('debtor-wallet-widget');
            if (walletContainer) {
                const sortedDebtors = Object.entries(debtors)
                    .sort(([, a], [, b]) => b.totalDebt - a.totalDebt); // Highest debt first

                if (sortedDebtors.length === 0) {
                    walletContainer.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:10px;">Ningu�m devendo! ??</div>`;
                } else {
                    walletContainer.innerHTML = `
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead style="position: sticky; top: 0; background: white;">
                                <tr style="border-bottom: 2px solid #f1f5f9; text-align: left; color: #64748b;">
                                    <th style="padding: 8px;">Cliente</th>
                                    <th style="padding: 8px;">Qtd Pendente</th>
                                    <th style="padding: 8px;">Total Devido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedDebtors.map(([name, data]) => `
                                    <tr style="border-bottom: 1px solid #f8fafc;">
                                        <td style="padding: 8px; font-weight: 600; color: #1e293b;">${name}</td>
                                        <td style="padding: 8px; color: #64748b;">${data.count} itens</td>
                                        <td style="padding: 8px; color: #ef4444; font-weight: 700;">R$ ${data.totalDebt.toFixed(2)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                }
            }


            if (allRecords.length === 0) {
                html += `<tr><td colspan="7" style="text-align:center; padding:20px;">Nenhum registro financeiro.</td></tr>`;
            }

            tbody.innerHTML = html;

            // Big Stats
            const elReceivable = document.getElementById('fin-total-receivable');
            if (elReceivable) elReceivable.innerText = `R$ ${totalReceivable.toFixed(2)}`;

            const elPaid = document.getElementById('fin-total-paid');
            if (elPaid) elPaid.innerText = `R$ ${totalPaid.toFixed(2)}`;

            const elAccount = document.getElementById('fin-total-account');
            if (elAccount) elAccount.innerText = `R$ ${totalAccount.toFixed(2)}`;

            const elCash = document.getElementById('fin-total-cash');
            if (elCash) elCash.innerText = `R$ ${totalCash.toFixed(2)}`;
        } catch (fatalError) {
            console.error("Critical Error in renderFinancial:", fatalError);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ef4444;">
                <i class="ph-bold ph-warning-circle" style="font-size:1.5rem;"></i><br>
                Erro ao carregar dados. Tente recarregar a p�gina.
            </td></tr>`;
        }
    },

    // --- FINANCIAL HISTORY LOGIC ---

    async logFinancialAction(actionType, entityId, description, extraData = {}) {
        if (!window.supabase) return; // Only log if online

        try {
            await window.supabase.from('financial_history').insert({
                action_type: actionType,
                entity_type: 'manual_debt', // Default for now
                entity_id: entityId,
                description: description,
                new_value: extraData
            });
            console.log(`Admin: Action logged (${actionType})`);
        } catch (e) {
            console.error("Admin: Failed to log action", e);
        }
    },

    async openFinancialHistory() {
        // Show Modal
        document.getElementById('modal-financial-history').classList.add('open');
        const tbody = document.getElementById('financial-history-body');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Carregando...</td></tr>';

        if (!window.supabase) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Hist�rico dispon�vel apenas online.</td></tr>';
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Nenhum hist�rico encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(log => {
                const date = new Date(log.created_at).toLocaleString('pt-BR');
                let badgeColor = '#64748b';
                let actionLabel = log.action_type;

                if (log.action_type === 'payment') { badgeColor = '#10b981'; actionLabel = 'Pagamento'; }
                if (log.action_type === 'create') { badgeColor = '#3b82f6'; actionLabel = 'Cria��o'; }
                if (log.action_type === 'delete') { badgeColor = '#ef4444'; actionLabel = 'Exclus�o'; }

                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px; font-size:0.9rem; color:#64748b;">${date}</td>
                        <td style="padding:10px;">
                            <span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${actionLabel}</span>
                        </td>
                        <td style="padding:10px; font-size:0.95rem; color:#334155;">${log.description || '-'}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:red;">Erro ao carregar hist�rico.</td></tr>';
        }
    },

    async filterStatus(status) {
        this.currentStatusFilter = status;

        // Visual Feedback
        document.querySelectorAll('.filter-btn-action, .filter-btn-ghost').forEach(btn => {
            // Check if this button corresponds to the clicked status
            const onclick = btn.getAttribute('onclick');
            if (onclick && onclick.includes(`'${status}'`)) {
                btn.style.opacity = '1';
                btn.style.boxShadow = '0 0 0 2px #6366f1'; // Focus ring
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.opacity = '0.6';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        });

        this.renderFinancial();
        // Toast feedback
        const map = { 'all': 'Todos', 'pending': 'A Receber', 'paid': 'Pagos' };
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        Toast.fire({ icon: 'info', title: `Filtro: ${map[status]}` });
    },

    async openPaymentModal(orderId, total, currentPaid) {
        const remaining = total - currentPaid;

        // Custom HTML for SweetAlert with Radios + Observação
        const { value: formValues } = await Swal.fire({
            title: 'Registrar Pagamento',
            html: `
                <div style="text-align:left; font-size:0.9rem; color:#64748b; margin-bottom:15px;">
                    Restante a Receber: <b style="color:#ef4444; font-size:1.1rem;">R$ ${remaining.toFixed(2)}</b>
                </div>

                <div style="margin-bottom:15px; text-align:left;">
                    <label style="display:block; font-weight:600; margin-bottom:5px; color:#334155;">Valor a Pagar (R$)</label>
                    <input id="swal-input-amount" type="number" step="0.01" value="${remaining.toFixed(2)}"
                        style="width:100%; padding:12px; font-size:1.1rem; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border 0.2s;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'">
                </div>

                <div style="margin-bottom:15px; text-align:left;">
                    <label style="display:block; font-weight:600; margin-bottom:5px; color:#334155;">Observação (opcional)</label>
                    <input id="swal-input-notes" type="text" placeholder="Ex: 50% de entrada, restante na entrega..."
                        style="width:100%; padding:10px; font-size:0.95rem; border:1px solid #cbd5e1; border-radius:8px; outline:none; transition:border 0.2s;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'">
                </div>

                <label style="display:block; text-align:left; font-weight:600; margin-bottom:10px; color:#334155;">Forma de Pagamento</label>
                <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="pix" checked style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;" 
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-pix-logo" style="color:#22c55e; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Pix</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="cash" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-money" style="color:#16a34a; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Dinheiro</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="credit_card" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-credit-card" style="color:#3b82f6; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Crédito</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="debit_card" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-credit-card" style="color:#64748b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Débito</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="account" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-bank" style="color:#f59e0b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Conta</span>
                        </div>
                    </label>
                    <label class="payment-option" style="cursor:pointer; position:relative;">
                        <input type="radio" name="swal-method" value="boleto" style="position:absolute; opacity:0;"> 
                        <div style="padding:12px; border:1px solid #cbd5e1; border-radius:8px; display:flex; align-items:center; gap:8px; transition:all 0.2s;"
                             onmouseover="this.style.borderColor='#6366f1';this.style.background='#f8fafc'" 
                             onmouseout="this.style.borderColor='#cbd5e1';this.style.background='white'">
                            <i class="ph-bold ph-barcode" style="color:#1e293b; font-size:1.2rem;"></i> 
                            <span style="font-weight:500; font-size:0.95rem;">Boleto</span>
                        </div>
                    </label>
                </div>
                <style>
                    /* Custom visual selection */
                    input[type="radio"]:checked + div {
                        border-color: #6366f1 !important;
                        background-color: #e0e7ff !important;
                        box-shadow: 0 0 0 2px #6366f1;
                    }
                </style>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            confirmButtonColor: '#10b981',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    amount: document.getElementById('swal-input-amount').value,
                    method: document.querySelector('input[name="swal-method"]:checked').value,
                    notes: document.getElementById('swal-input-notes').value || ''
                }
            }
        });

        if (formValues && formValues.amount) {
            this.processPayment(orderId, parseFloat(formValues.amount), formValues.method, formValues.notes);
        }
    },

    async openOrderDetails(orderId) {
        // Find in cached records
        const record = this.lastFinancialRecords ? this.lastFinancialRecords.find(r => r.id === orderId) : null;

        if (!record) {
            Swal.fire('Ops', 'Detalhes não encontrados (tente recarregar).', 'info');
            return;
        }

        // Fetch Real Items and Payment History
        let realItems = [];
        let paymentHistoryHtml = '<p style="color:#94a3b8; font-size:0.85rem;">Nenhum pagamento registrado.</p>';
        const paid = this.lastPaymentsMap ? (this.lastPaymentsMap[orderId] || 0) : 0;

        if (window.supabase) {
            try {
                // Fetch Items
                const { data: dbItems, error: itemsErr } = await window.supabase
                    .from('protocol_items')
                    .select('*')
                    .eq('protocol_id', orderId);

                if (!itemsErr && dbItems) {
                    realItems = dbItems;
                }

                // First try with all columns (new schema with notes + paid_at)
                let payments = null;
                const { data: paymentsNew, error: errNew } = await window.supabase
                    .from('order_payments')
                    .select('amount, payment_method, notes, paid_at, created_at')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: false });

                if (errNew) {
                    // Fallback: query only base columns (old schema without notes/paid_at)
                    const { data: paymentsOld } = await window.supabase
                        .from('order_payments')
                        .select('amount, payment_method, created_at')
                        .eq('order_id', orderId)
                        .order('created_at', { ascending: false });
                    payments = paymentsOld;
                } else {
                    payments = paymentsNew;
                }

                if (payments && payments.length > 0) {
                    const methodNames = { pix: 'Pix', cash: 'Dinheiro', credit_card: 'Crédito', debit_card: 'Débito', account: 'Conta', boleto: 'Boleto' };
                    paymentHistoryHtml = payments.map(p => {
                        const dateStr = new Date(p.paid_at || p.created_at).toLocaleString('pt-BR');
                        const method = methodNames[p.payment_method] || p.payment_method || 'Conta';
                        return `
                        <div style="display:flex; justify-content:space-between; align-items:start; padding:8px; background:#f8fafc; border-radius:6px; margin-bottom:6px; border-left:3px solid #10b981;">
                            <div>
                                <span style="font-weight:700; color:#10b981;">R$ ${Number(p.amount).toFixed(2)}</span>
                                <span style="color:#64748b; font-size:0.8rem; margin-left:8px;">${method}</span>
                                ${p.notes ? `<div style="font-size:0.8rem; color:#475569; margin-top:3px;"><i>"${p.notes}"</i></div>` : ''}
                            </div>
                            <span style="font-size:0.75rem; color:#94a3b8; white-space:nowrap; margin-left:10px;">${dateStr}</span>
                        </div>`;
                    }).join('');
                }
            } catch (e) { console.warn('Fetch failed', e); }
        }

        const total = Number(record.total);
        const debt = total - paid;

        let itemsListHtml = '';
        if (realItems.length > 0) {
            itemsListHtml = realItems.map(item => {
                const subT = (item.quantity * item.unit_price) || 0;
                return `
                <div style="border-bottom: 1px dashed #cbd5e1; padding: 6px 0; display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <div>
                        <strong>${item.product_name || 'Item'}</strong><br>
                        <span style="color: #64748b;">${item.quantity}x de R$ ${(item.unit_price || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-weight: 600; color: #1e293b; display: flex; align-items: center;">
                        R$ ${subT.toFixed(2)}
                    </div>
                </div>`;
            }).join('');
        } else {
            itemsListHtml = record.items && record.items.length
                ? record.items.map(i => `<li>${i.quantity || 1}x ${i.name}</li>`).join('')
                : '<li>' + (record.description || 'Sem descrição') + '</li>';
        }

        // Keep real items and payments in the record for PDF generation
        record.realItems = realItems;
        record.payments = payments;
        record.paidAmount = paid;
        this.currentViewingRecord = record; // Temporarily store for PDF

        Swal.fire({
            title: `📋 Pedido #${orderId}`,
            html: `
                <div style="text-align:left; font-size:0.95rem;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
                        <h3 style="margin:0; color:#334155;">${record.customer_name || 'Cliente Desconhecido'}</h3>
                        <p style="margin:0; color:#64748b; font-size:0.85rem;">Data do pedido: ${new Date(record.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                    
                    <p style="font-weight:600; color:#334155; margin-bottom:5px;">Itens / Descrição:</p>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px; margin-bottom:15px; max-height:150px; overflow-y:auto;">
                        ${itemsListHtml}
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-bottom:15px; text-align:center;">
                        <div style="background:#f1f5f9; padding:10px; border-radius:8px;">
                            <div style="font-size:0.75rem; color:#64748b;">Total</div>
                            <div style="font-weight:700; color:#1e293b;">R$ ${total.toFixed(2)}</div>
                        </div>
                        <div style="background:#dcfce7; padding:10px; border-radius:8px;">
                            <div style="font-size:0.75rem; color:#166534;">Já Pago</div>
                            <div style="font-weight:700; color:#16a34a;">R$ ${paid.toFixed(2)}</div>
                        </div>
                        <div style="background:${debt > 0.01 ? '#fee2e2' : '#dcfce7'}; padding:10px; border-radius:8px;">
                            <div style="font-size:0.75rem; color:${debt > 0.01 ? '#991b1b' : '#166534'};">Restante</div>
                            <div style="font-weight:700; color:${debt > 0.01 ? '#ef4444' : '#16a34a'};">R$ ${Math.max(0, debt).toFixed(2)}</div>
                        </div>
                    </div>

                    <p style="font-weight:600; color:#334155; margin-bottom:8px;">📅 Histórico de Pagamentos:</p>
                    ${paymentHistoryHtml}
                    
                    <div style="margin-top: 15px;">
                        <button class="btn-primary" onclick="adminApp.downloadFinancialQuotePDF('${orderId}')" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 10px; font-size: 0.95rem; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border: none; border-radius: 6px; cursor: pointer; color: white; font-weight: 600;">
                            <i class="ph-bold ph-file-pdf" style="font-size: 1.1rem;"></i> Baixar Orçamento em PDF
                        </button>
                    </div>
                </div>
            `,
            width: '550px',
            showConfirmButton: true,
            confirmButtonText: 'Fechar',
            confirmButtonColor: '#10b981'
        });
    },

    async downloadFinancialQuotePDF(orderId) {
        const record = this.lastFinancialRecords ? this.lastFinancialRecords.find(r => r.id === orderId) : null;
        if (!record) {
            Swal.fire('Erro', 'Registro não encontrado.', 'error');
            return;
        }

        try {
            // Always fetch payments fresh from DB to ensure accuracy
            let payments = [];
            let paidAmount = 0;
            let realItems = [];

            if (window.supabase) {
                // Fetch payment history
                const { data: paymentsNew, error: errNew } = await window.supabase
                    .from('order_payments')
                    .select('amount, payment_method, notes, paid_at, created_at')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: false });

                if (errNew) {
                    // Fallback without notes/paid_at columns
                    const { data: paymentsOld } = await window.supabase
                        .from('order_payments')
                        .select('amount, payment_method, created_at')
                        .eq('order_id', orderId)
                        .order('created_at', { ascending: false });
                    payments = paymentsOld || [];
                } else {
                    payments = paymentsNew || [];
                }

                // Sum up total paid
                paidAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

                // Fetch real items from protocol_items
                const { data: dbItems } = await window.supabase
                    .from('protocol_items')
                    .select('*')
                    .eq('protocol_id', orderId);
                if (dbItems) realItems = dbItems;
            }

            // Build complete record for PDF
            const printData = {
                ...record,
                payments,
                paidAmount,
                realItems: realItems.length > 0 ? realItems : (record.realItems || []),
            };

            // Save the data to local storage so the quote template page can read it
            localStorage.setItem('mv_admin_print_data', JSON.stringify(printData));

            // Open the HTML quote page in admin mode
            window.open('pages/quote.html?source=admin', '_blank');
        } catch (e) {
            console.error("Error setting admin print data", e);
            Swal.fire('Erro', 'Não foi possível gerar o PDF.', 'error');
        }
    },

    async processPayment(orderId, amount, method = 'account', notes = '') {
        if (isNaN(amount) || amount <= 0) return;

        if (window.supabase) {
            const { error } = await window.supabase.from('order_payments').insert({
                order_id: orderId,
                amount: amount,
                payment_method: method,
                notes: notes || null,
                paid_at: new Date().toISOString()
            });

            if (error) {
                // Retry without 'notes'/'paid_at' if column doesn't exist
                const { error: error2 } = await window.supabase.from('order_payments').insert({
                    order_id: orderId,
                    amount: amount,
                    payment_method: method
                });
                if (error2) {
                    console.error("Payment Save Error:", error2);
                    await Swal.fire('Erro', 'Falha ao salvar pagamento no banco.', 'error');
                    return;
                }
            }
        } else {
            // Local fallback (legacy)
            const paymentData = JSON.parse(SafeStorage.getItem('mv_payments') || '{}');
            paymentData[orderId] = (paymentData[orderId] || 0) + amount;
            SafeStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }

        const methodNames = { pix: 'Pix', cash: 'Dinheiro', credit_card: 'Crédito', debit_card: 'Débito', account: 'Conta', boleto: 'Boleto' };
        await Swal.fire({
            icon: 'success',
            title: 'Pagamento Registrado!',
            html: `<b>R$ ${amount.toFixed(2)}</b> via ${methodNames[method] || method}${notes ? `<br><small style="color:#64748b;">Obs: ${notes}</small>` : ''}`,
            timer: 2500,
            showConfirmButton: false
        });

        await this.renderFinancial();

        // Also refresh Gestão/Protocols view if visible
        const ordersView = document.getElementById('orders');
        if (ordersView && ordersView.style.display !== 'none' && typeof ProtocolsManager !== 'undefined') {
            ProtocolsManager.loadProtocols();
        }

        // Log Action
        const logDesc = `Pagamento de R$ ${amount.toFixed(2)} (${method})${notes ? ` — ${notes}` : ''}`;
        this.logFinancialAction('payment', orderId, logDesc);
    },

    openManualDebtModal() {
        document.getElementById('modal-manual-debt').classList.add('open');
        ['manual-debt-client', 'manual-debt-desc', 'manual-debt-total', 'manual-debt-paid', 'manual-debt-edit-id'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const title = document.querySelector('#modal-manual-debt h3');
        if (title) title.innerText = '📋 Novo Lançamento';
    },

    openEditDebtModal(id) {
        const record = this.lastFinancialRecords ? this.lastFinancialRecords.find(r => r.id === id) : null;
        if (!record) return;

        document.getElementById('modal-manual-debt').classList.add('open');
        document.querySelector('#modal-manual-debt h3').innerText = '?? Editar Lan�amento';

        document.getElementById('manual-debt-edit-id').value = record.id;
        document.getElementById('manual-debt-client').value = record.customer_name;
        document.getElementById('manual-debt-desc').value = record.items?.[0]?.name || record.description || '';
        document.getElementById('manual-debt-total').value = record.total;

        // Don't pre-fill paid for edits usually, or calculate it? 
        // For simplicity in edit, let's leave paid logic alone or set it to what it was? 
        // Actually editing payment inputs is complex. Let's just allow editing the DEBT details (Name, Desc, Total).
        // Payments are separate transaction records.
        document.getElementById('manual-debt-paid').value = '';
    },

    async saveManualDebt() {
        const editId = document.getElementById('manual-debt-edit-id').value;
        const client = document.getElementById('manual-debt-client').value;
        const desc = document.getElementById('manual-debt-desc').value;
        const totalVal = document.getElementById('manual-debt-total').value;
        const amount = parseFloat(totalVal);
        const paidVal = parseFloat(document.getElementById('manual-debt-paid').value) || 0;

        // Installment Logic
        const isInstallment = document.getElementById('manual-debt-is-installment').checked;
        const installmentsCount = parseInt(document.getElementById('manual-debt-installments-count').value) || 1;
        const periodicity = document.getElementById('manual-debt-periodicity').value;

        // Validation
        if (!desc || !client || isNaN(amount)) {
            Swal.fire('Erro', 'Preencha cliente, descri��o e valor total.', 'warning');
            return;
        }

        if (isInstallment && installmentsCount < 2) {
            Swal.fire('Erro', 'Para parcelar, digite 2 ou mais parcelas.', 'warning');
            return;
        }

        const baseDate = new Date();
        const parentGroupId = isInstallment ? crypto.randomUUID() : null;
        let recordsToSave = [];

        // Generate Records (1 or N)
        const count = isInstallment ? installmentsCount : 1;

        for (let i = 0; i < count; i++) {
            let recordId = editId && i === 0 ? editId : `manual-${Date.now()}-${i}`; // Preserve ID for first/single if editing

            // Calculate Due Date
            let dueDate = new Date(baseDate);
            if (i > 0) {
                if (periodicity === 'monthly') dueDate.setMonth(dueDate.getMonth() + i);
                if (periodicity === 'weekly') dueDate.setDate(dueDate.getDate() + (i * 7));
                if (periodicity === 'biweekly') dueDate.setDate(dueDate.getDate() + (i * 15));
            }

            // Description adjustment for installments
            let finalDesc = desc;
            if (isInstallment) {
                finalDesc = `${desc} (${i + 1}/${count})`;
            }

            recordsToSave.push({
                id: recordId,
                customer_name: client,
                description: finalDesc,
                total: isInstallment ? (amount / count) : amount, // Split amount if installment
                total: isInstallment ? (amount / count) : amount,
                status: (paidVal >= amount) ? 'paid' : 'pending', // Auto-pay if amount covers it
                created_at: dueDate.toISOString(), // Use Due Date as main date

                // Advanced Metadata
                installment_number: isInstallment ? (i + 1) : 1,
                installments_total: isInstallment ? count : 1,
                parent_group_id: parentGroupId
            });
        }

        // 1. Save to Cloud (Batch Insert/Upsert)
        if (window.supabase) {
            const { error } = await window.supabase.from('financial_records').upsert(recordsToSave);
            if (error) {
                console.error("Manual Save Error:", error);
                // If in emergency mode or error, we continue to local save instead of blocking
                // Swal.fire('Aten��o', 'Erro ao salvar na nuvem (Offline?). Salvando localmente.', 'warning');
            } else {
                // Success Cloud actions
                // --- COFRINHO AUTOMATION ---
                // If the entry is immediately PAID, add to Cofrinho
                if (paidVal >= amount) {
                    const revenue = amount;
                    this.minarCofrinho(revenue, client || finalDesc);
                }
            }

            // --- COFRINHO AUTOMATION ---
            // If the entry is immediately PAID, add to Cofrinho
            if (paidVal >= amount) {
                const revenue = amount;
                this.minarCofrinho(revenue, client || finalDesc);
            }
        }

        // 2. Local Fallback (Only saves first record to avoid cluttering local storage with 48 records)
        // Or we could save all. Let's save all for consistency if local usage is key.
        let local = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');

        recordsToSave.forEach(rec => {
            // Remove existing if updating
            local = local.filter(o => o.id !== rec.id);
            local.push({
                id: rec.id,
                items: [{ name: rec.description }],
                customer_name: rec.customer_name,
                total: rec.total,
                date: rec.created_at,
                status: rec.status
            });
        });
        SafeStorage.setItem('mv_manual_orders', JSON.stringify(local));


        // Handle Initial Payment (Only for first installment)
        if (paidVal > 0) {
            const method = document.querySelector('input[name="manual-payment-method"]:checked')?.value || 'account';
            // Pay only the first record ID
            await this.processPayment(recordsToSave[0].id, paidVal, method);
        }

        Swal.fire('Sucesso', isInstallment ? `${count} Lan�amentos gerados!` : 'Lan�amento salvo!', 'success');
        this.closeModals();
        this.renderFinancial();

        // Log Action
        const logMsg = isInstallment
            ? `Gerado Carn�/Parcelamento: ${client} - ${count}x de R$ ${(amount / count).toFixed(2)}`
            : `${editId ? 'Atualiza��o' : 'Novo'} lan�amento: ${client} - R$ ${amount.toFixed(2)}`;

        this.logFinancialAction('create', recordsToSave[0].id, logMsg);
    },



    saveManualDebtLocally(id, client, desc, total, paid) {
        const entry = {
            id: id,
            customer_name: client,
            total: total,
            description: desc, // Ensure description is saved
            date: new Date().toISOString(),
            status: 'manual',
            items: [{ name: desc || 'Cobran�a Avulsa', quantity: 1 }]
        };
        const manualOrders = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
        manualOrders.push(entry);
        SafeStorage.setItem('mv_manual_orders', JSON.stringify(manualOrders));

        // Save Payment locally if needed for basic stats
        if (paid > 0) {
            const paymentData = JSON.parse(SafeStorage.getItem('mv_payments') || '{}');
            paymentData[id] = (paymentData[id] || 0) + paid;
            SafeStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }
    },

    toggleManualMethodVisibility() {
        const paid = parseFloat(document.getElementById('manual-debt-paid').value) || 0;
        const row = document.getElementById('manual-method-row');
        if (row) row.style.display = paid > 0 ? 'block' : 'none';
    },
    async logFinancialAction(actionType, entityId, description, extraData = {}) {
        if (!window.supabase) return;
        const user = window.currentUser?.email || 'admin';
        // Fire and forget
        window.supabase.from('financial_history').insert({
            action_type: actionType,
            entity_type: 'financial_record',
            entity_id: entityId,
            description: description,
            changed_by: user,
            old_value: extraData.old ? JSON.stringify(extraData.old) : null,
            new_value: extraData.new ? JSON.stringify(extraData.new) : null
        }).then(({ error }) => {
            if (error) console.error("History Log Error:", error);
        });
    },

    async openFinancialHistory() {
        if (!window.supabase) {
            Swal.fire('Erro', 'Hist�rico dispon�vel apenas online.', 'info');
            return;
        }

        const modal = document.getElementById('modal-financial-history');
        modal.classList.add('open');
        const tbody = document.getElementById('financial-history-body');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">? Carregando hist�rico...</td></tr>';

            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error(error);
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--accent-orange);">Erro ao carregar dados.</td></tr>';
                return;
            }

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">Nenhum hist�rico encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(log => `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td><span class="status-badge status-process">${log.action_type.toUpperCase()}</span></td>
                    <td>
                        <div style="font-weight:600; color:var(--text-primary)">${log.description}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary)">?? ${log.changed_by}</div>
                    </td>
                </tr>
            `).join('');
        }
    },

    async deleteManualDebt(id) {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: "Excluir este lan�amento permanentemente?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sim, excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        // 1. Try Supabase Delete
        if (window.supabase) {
            const { error } = await window.supabase.from('financial_records').delete().eq('id', id);
            if (error) {
                console.error("Cloud Delete Error (ignoring)", error);
            }
            // Clean payments too
            await window.supabase.from('order_payments').delete().eq('order_id', id);
        }

        // 2. ALWAYS Delete Local (Cleanup)
        let manualOrders = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
        manualOrders = manualOrders.filter(o => o.id !== id);
        SafeStorage.setItem('mv_manual_orders', JSON.stringify(manualOrders));

        // Cleanup local payments
        const paymentData = JSON.parse(SafeStorage.getItem('mv_payments') || '{}');
        if (paymentData[id]) {
            delete paymentData[id];
            SafeStorage.setItem('mv_payments', JSON.stringify(paymentData));
        }

        await Swal.fire('Exclu�do', 'Lan�amento removido.', 'success');
        await this.renderFinancial();
        // Log Action
        this.logFinancialAction('delete', id, `Exclus�o de lan�amento: ${id}`);
    },



    async syncLocalDataToSupabase() {
        const result = await Swal.fire({
            title: 'Sincronizar com a Nuvem?',
            text: "Isso enviar� todos os dados locais (Produtos, Financeiro) para o banco de dados.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sim, Sincronizar!',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: 'Sincronizando...',
            text: 'Enviando produtos, insumos e financeiro...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const promises = [];

            // 1. Inputs (Insumos)
            const localInputs = JSON.parse(SafeStorage.getItem('mv_inputs') || '[]');
            if (localInputs.length > 0) {
                const inputPromise = (async () => {
                    for (const item of localInputs) {
                        await window.supabase.from('inventory_items').upsert({
                            id: item.id,
                            name: item.name,
                            supplier: item.supplier,
                            cost: item.cost,
                            unit: item.unit,
                            stock: item.stock || 0
                        });
                    }
                })();
                promises.push(inputPromise);
            }

            // 2. Financial (Financial Records)
            const localManual = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
            if (localManual.length > 0) {
                const financialPromise = (async () => {
                    for (const order of localManual) {
                        // Only insert if ID doesn't exist to prevent overwrite of newer cloud data or duplicates
                        const { count } = await window.supabase.from('financial_records').select('id', { count: 'exact', head: true }).eq('id', order.id);
                        if (count === 0) {
                            await window.supabase.from('financial_records').insert({
                                id: order.id,
                                customer_name: order.customer_name,
                                description: order.items[0]?.name,
                                total: order.total,
                                status: order.status,
                                created_at: order.date
                            });
                        }
                    }
                })();
                promises.push(financialPromise);
            }

            // 3. Products (Meus Produtos)
            const localProducts = JSON.parse(SafeStorage.getItem('products') || '[]');
            if (localProducts.length > 0) {
                const productsPromise = (async () => {
                    for (const p of localProducts) {
                        // Avoid overwrite unless necessary. Upsert by ID.
                        // Need to map structure carefully if local differs from DB
                        await window.supabase.from('products').upsert({
                            id: p.id,
                            name: p.name,
                            category: p.category,
                            price: p.price,
                            cost: p.cost || 0,
                            image: p.image,
                            description: p.description || '',
                            status: p.status || 'active',
                            stock: 100, // Default stock logic if local is simple
                            recipe: p.recipe || []
                        });
                    }
                })();
                promises.push(productsPromise);
            }

            await Promise.all(promises);

            // Optional: Backup local before clearing? Or just keep it as cache?
            // Clearing acts as "migrated".
            SafeStorage.removeItem('mv_manual_orders');
            // SafeStorage.removeItem('products'); // Maybe don't clear products yet, as they are master data.

            await Swal.fire({
                icon: 'success',
                title: 'Sincroniza��o Conclu�da!',
                text: 'Todos os seus dados agora est�o seguros na nuvem.'
            });
            window.location.reload();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Falha na sincroniza��o parcial: ' + e.message, 'error');
        }
    },



    async syncBackground(localItems) {
        if (!window.supabase) return;
        console.log("Admin: Attempting background sync...");

        let syncedCount = 0;
        for (const order of localItems) {
            // Check if already in DB
            const { count } = await window.supabase.from('financial_records').select('id', { count: 'exact', head: true }).eq('id', order.id);
            if (count > 0) continue; // Already there

            // Try insert
            const { error } = await window.supabase.from('financial_records').insert({
                id: order.id,
                customer_name: order.customer_name,
                description: order.items[0]?.name,
                total: order.total,
                status: order.status,
                created_at: order.date
            });

            if (!error) syncedCount++;
        }

        if (syncedCount > 0) {
            console.log(`Admin: Background sync successful for ${syncedCount} items.`);
            // Optional: Clean local storage? keeping it for safety for now.
        }
    },

    toggleDebtorWallet() {
        const body = document.getElementById('debtor-wallet-widget');
        const chevron = document.getElementById('wallet-chevron');

        if (body.style.display === 'none' || body.style.display === '') {
            body.style.display = 'block';
            if (chevron) chevron.style.transform = 'rotate(180deg)';
        } else {
            body.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        }
    },

    toggleMinOrder(checkbox) {
        const input = document.getElementById('prod-min-order');
        if (checkbox.checked) {
            input.disabled = true;
            input.value = 1;
            input.style.opacity = '0.5';
        } else {
            input.disabled = false;
            input.style.opacity = '1';
        }
    },

    forceClearChats() {
        if (confirm('Tem certeza que deseja apagar TODAS as conversas?')) {
            SafeStorage.removeItem('mv_chats');
            alert('Limpo!');
            window.location.reload();
        }
    },

    openExpenseModal() {
        this.closeModals();
        const modal = document.getElementById('modal-expense');
        if (modal) {
            modal.classList.add('open');
            // Reset fields
            document.getElementById('exp-desc').value = '';
            document.getElementById('exp-category').value = '';
            document.getElementById('exp-amount').value = '';
            document.getElementById('exp-date').value = new Date().toISOString().split('T')[0];
        }
    },

    async saveExpense() {
        const desc = document.getElementById('exp-desc').value;
        const category = document.getElementById('exp-category').value;
        const amountVal = document.getElementById('exp-amount').value;
        const dateVal = document.getElementById('exp-date').value;
        const installmentsStore = document.getElementById('exp-installments');
        const installments = installmentsStore ? parseInt(installmentsStore.value) : 1;

        if (!desc || !amountVal) {
            Swal.fire('Erro', 'Preencha descri��o e valor.', 'warning');
            return;
        }

        const amount = parseFloat(amountVal);
        const parentId = 'GRP-' + Date.now(); // Group ID for creating siblings
        const baseDate = dateVal ? new Date(dateVal) : new Date();

        // INSTALLMENT LOOP
        for (let i = 0; i < installments; i++) {
            const currentId = 'EXP-' + Date.now() + '-' + i;

            // Calculate Next Month Date
            const nextDate = new Date(baseDate);
            nextDate.setMonth(baseDate.getMonth() + i);

            // Format Description (e.g. "Notebook 1/12")
            const finalDesc = installments > 1
                ? `${desc} (${i + 1}/${installments})`
                : desc;

            const record = {
                id: currentId,
                description: finalDesc,
                category: category,
                total: (amount / installments).toFixed(2), // Split total or full? Usually user enters TOTAL purchase value.
                // Correction: If user enters 1200 for 12x, it should be 100/mo.
                // Assuming Input is TOTAL value.
                type: 'expense',
                status: 'pending', // Future installments start as pending
                created_at: nextDate.toISOString(),
                installment_number: i + 1,
                installments_total: installments,
                parent_group_id: parentId
            };

            // First installment might be paid if date is today/past? 
            // Let's keep all 'pending' for "Accounts Payable" logic unless user explicitly marks paid.
            // For now, default to 'pending' for safety. Dashboard will show them.
            if (i === 0 && new Date(record.created_at) <= new Date()) {
                record.status = 'paid'; // Assume first one is paid if today
            }

            // Save to Cloud
            if (window.supabase) {
                const { error } = await window.supabase.from('financial_records').insert(record);
                if (error) console.error("Expense Save Error (Installment " + (i + 1) + "):", error);
            }
        }

        Swal.fire('Sucesso', `${installments}x Despesas agendadas!`, 'success');
        this.closeModals();
        this.renderFinancial();
        this.renderFinancialGoals(); // Refresh Goals
        this.logFinancialAction('create', parentId, `Despesa Parcelada: ${desc} (${installments}x)`);
    },

    async renderFinancialGoals() {
        if (!window.supabase) return;
        const container = document.getElementById('goals-container');
        if (!container) return;

        const { data: goals } = await window.supabase.from('financial_goals').select('*');

        if (!goals || goals.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:20px; color:#94a3b8; width:100%; cursor:pointer;" onclick="adminApp.openNewGoalModal()">
                    <i class="ph-duotone ph-plus-circle" style="font-size:2rem; color:#d946ef;"></i><br>
                    Criar sua primeira meta
                </div>`;
            return;
        }

        container.innerHTML = goals.map(g => {
            const percent = Math.min(100, (g.current_amount / g.target_amount) * 100).toFixed(1);
            return `
                <div class="stat-card" style="min-width: 220px; padding: 15px; border-left: 4px solid #d946ef; position: relative; group">
                    <div style="position:absolute; top:8px; right:8px; display:flex; gap:8px;">
                        <button onclick="adminApp.editGoal('${g.id}')" style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:50%; width:32px; height:32px; color:#64748b; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Editar">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button onclick="adminApp.deleteGoal('${g.id}')" style="background:#fef2f2; border:1px solid #fee2e2; border-radius:50%; width:32px; height:32px; color:#ef4444; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;" title="Excluir">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                    <div style="font-size: 0.9rem; font-weight: 600; color: #475569; padding-right: 80px;">${g.name}</div>
                    <div style="font-size: 1.2rem; font-weight: 700; color: #1e293b;">R$ ${g.current_amount} <span style="font-size:0.8rem; color:#94a3b8;">/ ${g.target_amount}</span></div>
                    <div style="font-size:0.75rem; color:#d946ef; font-weight:600; margin-top:2px;">Guardando: ${g.retention_rate || 5}%</div>
                    <div style="background:#e2e8f0; height:6px; border-radius:3px; margin-top:8px; overflow:hidden;">
                        <div style="background: linear-gradient(90deg, #d946ef, #a855f7); width:${percent}%; height:100%;"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // === COFRINHO AUTOMATION ===
    async minarCofrinho(revenue, source = 'Venda') {
        if (!window.supabase || !revenue || revenue <= 0) return;

        try {
            // Fetch active goals
            const { data: goals } = await window.supabase
                .from('financial_goals')
                .select('*')
                .eq('status', 'active');

            if (!goals || goals.length === 0) return; // No active goals

            // For each goal, deduct percentage and update
            for (const goal of goals) {
                const retentionRate = goal.retention_rate || 5; // Default 5%
                const slice = (revenue * retentionRate) / 100;
                const newAmount = (goal.current_amount || 0) + slice;

                // Check if goal is completed
                const newStatus = newAmount >= goal.target_amount ? 'completed' : 'active';

                const { error } = await window.supabase
                    .from('financial_goals')
                    .update({
                        current_amount: newAmount,
                        status: newStatus
                    })
                    .eq('id', goal.id);

                if (error) {
                    console.error('Cofrinho update error:', error);
                } else {
                    console.log(`?? Cofrinho atualizado: ${goal.name} +R$ ${slice.toFixed(2)}`);
                }
            }

            // Refresh goals display
            this.renderFinancialGoals();

        } catch (err) {
            console.error('minarCofrinho error:', err);
        }
    },

    async openNewGoalModal() {
        const { value: formValues } = await Swal.fire({
            title: 'Nova Meta ??',
            html:
                '<input id="swal-goal-name" class="swal2-input" placeholder="Nome (ex: Notebook)" maxlength="20">' +
                '<input id="swal-goal-target" type="number" class="swal2-input" placeholder="Valor Alvo (R$)">' +
                '<label style="display:block; margin-top:15px; color:#64748b; font-size:0.9rem;">Quanto guardar de cada venda?</label>' +
                '<div style="display:flex; align-items:center; justify-content:center; gap:10px;">' +
                '<input id="swal-goal-percent" type="range" class="swal2-range" min="1" max="50" value="5" oninput="document.getElementById(\'percent-val\').innerText = this.value + \'%\'">' +
                '<span id="percent-val" style="font-weight:bold; color:#d946ef; font-size:1.2rem; min-width:50px;">5%</span>' +
                '</div>',
            focusConfirm: false,
            preConfirm: () => {
                return [
                    document.getElementById('swal-goal-name').value,
                    document.getElementById('swal-goal-target').value,
                    document.getElementById('swal-goal-percent').value
                ]
            }
        });

        if (formValues) {
            const [name, target, percent] = formValues;
            if (name && target) {
                await window.supabase.from('financial_goals').insert({
                    name: name,
                    target_amount: target,
                    current_amount: 0,
                    retention_rate: percent,
                    status: 'active'
                });
                Swal.fire('Criado!', `Meta definida! Guardaremos ${percent}% de cada venda.`, 'success');
                this.renderFinancialGoals();
            }
        }
    },

    async editGoal(id) {
        if (!window.supabase) return;
        const { data: goal } = await window.supabase.from('financial_goals').select('*').eq('id', id).single();
        if (!goal) return;

        const { value: formValues } = await Swal.fire({
            title: 'Editar Meta ??',
            html:
                `
                <label style="display:block; text-align:left; color:#64748b; margin-bottom:5px;">Nome</label>
                <input id="swal-edit-name" class="swal2-input" value="${goal.name}" style="margin: 0 0 15px 0;">
                
                <label style="display:block; text-align:left; color:#64748b; margin-bottom:5px;">Valor Alvo (R$)</label>
                <input id="swal-edit-target" type="number" class="swal2-input" value="${goal.target_amount}" style="margin: 0 0 15px 0;">
                
                <label style="display:block; text-align:left; color:#64748b; margin-bottom:5px;">J� guardado (R$)</label>
                <input id="swal-edit-current" type="number" class="swal2-input" value="${goal.current_amount}" style="margin: 0 0 15px 0;">

                <label style="display:block; text-align:left; color:#64748b; margin-top:10px;">Taxa de Reten��o (%)</label>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input id="swal-edit-percent" type="range" class="swal2-range" min="1" max="50" value="${goal.retention_rate || 5}" 
                        oninput="document.getElementById('edit-percent-val').innerText = this.value + '%'">
                    <span id="edit-percent-val" style="font-weight:bold; color:#d946ef;">${goal.retention_rate || 5}%</span>
                </div>
                `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                return {
                    name: document.getElementById('swal-edit-name').value,
                    target_amount: document.getElementById('swal-edit-target').value,
                    current_amount: document.getElementById('swal-edit-current').value,
                    retention_rate: document.getElementById('swal-edit-percent').value
                };
            }
        });

        if (formValues) {
            const { error } = await window.supabase.from('financial_goals').update(formValues).eq('id', id);
            if (error) {
                Swal.fire('Erro', 'N�o foi poss�vel atualizar.', 'error');
            } else {
                Swal.fire('Atualizado!', 'Meta reconfigurada com sucesso.', 'success');
                this.renderFinancialGoals();
            }
        }
    },

    async deleteGoal(id) {
        const result = await Swal.fire({
            title: 'Tem certeza?',
            text: "Voc� vai perder todo o progresso desta meta!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            if (window.supabase) {
                await window.supabase.from('financial_goals').delete().eq('id', id);
                Swal.fire('Exclu�do!', 'Sua meta foi removida.', 'success');
                this.renderFinancialGoals();
            }
        }
    },

    // --- SMART PIGGY BANK LOGIC (COFRINHO) ---
    async minarCofrinho(revenueAmount, sourceDescription) {
        if (!window.supabase) return;

        // 1. Get Active Goal
        const { data: goals } = await window.supabase
            .from('financial_goals')
            .select('*')
            .eq('status', 'active')
            .limit(1);

        if (!goals || goals.length === 0) return; // No active goal

        const goal = goals[0];
        const percent = goal.retention_rate || 5; // Default 5% if missing

        // 2. Calculate Cut
        const cut = (revenueAmount * (percent / 100));
        if (cut <= 0) return;

        // 3. Update Goal
        const newTotal = parseFloat(goal.current_amount || 0) + cut;

        // Prevent Floating Point weirdness
        const finalTotal = Math.round(newTotal * 100) / 100;

        await window.supabase
            .from('financial_goals')
            .update({ current_amount: finalTotal })
            .eq('id', goal.id);

        // 4. Notify (Optional) - non-intrusive toast
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
        Toast.fire({
            icon: 'success',
            title: `?? + R$ ${cut.toFixed(2)} para ${goal.name}`
        });

        // 5. Refresh UI
        this.renderFinancialGoals();
    },

    async logFinancialAction(action, entityId, details) {
        if (!window.supabase) return;
        try {
            await window.supabase.from('financial_history').insert({
                action_type: action,
                entity_type: entityId.startsWith('EXP') ? 'expense' : 'manual_debt',
                entity_id: entityId,
                description: details
            });
        } catch (e) {
            console.error("Log History Error:", e);
        }
    },

    async openFinancialHistory() {
        const modal = document.getElementById('modal-financial-history');
        const tbody = document.getElementById('financial-history-body');
        if (!modal || !tbody) return;

        modal.classList.add('open');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Carregando...</td></tr>';

        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('financial_history')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data) {
                tbody.innerHTML = data.map(row => `
                    <tr>
                        <td>${new Date(row.created_at).toLocaleString('pt-BR')}</td>
                        <td>${row.action_type.toUpperCase()}</td>
                        <td>${row.description || '-'}</td>
                    </tr>
                `).join('');
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Sem hist�rico.</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Hist�rico dispon�vel apenas Online.</td></tr>';
        }
    },

    // --- FEATURE: FUTURE SIMULATOR ---
    openSimulator() {
        document.getElementById('modal-simulator').classList.add('open');

        let totalRevenue = 0;
        if (this.lastFinancialRecords) {
            const now = new Date();
            const lastMonth = new Date();
            lastMonth.setDate(now.getDate() - 30);

            this.lastFinancialRecords.forEach(r => {
                if (r.type !== 'expense' && new Date(r.date) >= lastMonth) {
                    totalRevenue += parseFloat(r.total);
                }
            });
        }

        if (totalRevenue === 0) totalRevenue = 1000; // Mock base if empty

        document.getElementById('sim-base').value = totalRevenue.toFixed(2);
        this.updateSimulator();
    },

    updateSimulator() {
        const base = parseFloat(document.getElementById('sim-base').value) || 0;
        const growth = parseInt(document.getElementById('sim-growth').value) || 0;

        document.getElementById('sim-growth-val').innerText = growth;

        // Scenario: Cumulative growth over months? 
        // Simplest: "If your monthly revenue grows by X%"
        const newMonthly = base * (1 + growth / 100);

        const total3 = newMonthly * 3;
        const total6 = newMonthly * 6;
        const total12 = newMonthly * 12;

        document.getElementById('sim-result-3').innerText = 'R$ ' + total3.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('sim-result-6').innerText = 'R$ ' + total6.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.getElementById('sim-result-12').innerText = 'R$ ' + total12.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    },

    // --- FEATURE: SETTINGS TAB ---
    loadSettings() {
        const config = window.CRM_CONFIG || {};
        const saved = JSON.parse(SafeStorage.getItem('crm_settings')) || {};

        // Merge defaults with saved
        const finalConfig = { ...config, ...saved };

        // Update global config
        window.CRM_CONFIG = finalConfig;

        // Fill Form
        const vipInput = document.getElementById('conf-vip-threshold');
        const marginInput = document.getElementById('conf-margin-threshold');
        const vipIconInput = document.getElementById('conf-vip-icon');
        const debtIconInput = document.getElementById('conf-debt-icon');

        if (vipInput) vipInput.value = finalConfig.VIP_THRESHOLD || 1000;
        if (marginInput) marginInput.value = finalConfig.MARGIN_THRESHOLD || 30; // Default 30%
        if (vipIconInput) vipIconInput.value = finalConfig.VIP_ICON || '??';
        if (debtIconInput) debtIconInput.value = finalConfig.DEBT_ICON || '??';

        // Load Theme Colors
        const primary = finalConfig.THEME_PRIMARY || '#4f46e5';
        const accent = finalConfig.THEME_ACCENT || '#f97316';

        const pPicker = document.getElementById('conf-theme-primary');
        const pText = document.getElementById('conf-theme-primary-text');
        const aPicker = document.getElementById('conf-theme-accent');
        const aText = document.getElementById('conf-theme-accent-text');

        if (pPicker) { pPicker.value = primary; pText.value = primary; }
        if (aPicker) { aPicker.value = accent; aText.value = accent; }

        this.applyTheme(primary, accent);
    },

    saveSettings() {
        const newThreshold = parseFloat(document.getElementById('conf-vip-threshold').value);
        const newMargin = parseFloat(document.getElementById('conf-margin-threshold').value);
        const newVipIcon = document.getElementById('conf-vip-icon').value;
        const newDebtIcon = document.getElementById('conf-debt-icon').value;

        // Theme
        const primary = document.getElementById('conf-theme-primary').value;
        const accent = document.getElementById('conf-theme-accent').value;

        if (!newThreshold) {
            Swal.fire('Erro', 'Informe um valor para o VIP.', 'error');
            return;
        }

        const newConfig = {
            VIP_THRESHOLD: newThreshold,
            MARGIN_THRESHOLD: newMargin || 30,
            VIP_ICON: newVipIcon,
            DEBT_ICON: newDebtIcon,
            THEME_PRIMARY: primary,
            THEME_ACCENT: accent
        };

        // Save to LocalStorage
        SafeStorage.setItem('crm_settings', JSON.stringify(newConfig));

        // Update Global Runtime Config
        window.CRM_CONFIG = newConfig;

        // Apply immediately
        this.applyTheme(primary, accent);

        Swal.fire({
            title: 'Configura��es Salvas!',
            text: 'Tema e CRM atualizados.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });

        // Refresh lists to apply new icons immediatey
        this.renderFinancial();
    },

    applyTheme(primary, accent) {
        document.documentElement.style.setProperty('--primary-hero', primary);
        document.documentElement.style.setProperty('--accent-orange', accent);
    },

    toggleThemeSettings() {
        const content = document.getElementById('theme-settings-content');
        const icon = document.getElementById('theme-chevron');

        if (content.style.display === 'none') {
            content.style.display = 'grid';
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    },

    async renderCharts() {
        if (!window.Chart) return;

        // 1. Data Processing
        const today = new Date();
        const dates = [];
        const revenues = [];

        // Generate last 30 days labels
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            dates.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            revenues.push(0); // Initialize with 0
        }

        // Fetch Financial Data
        let financialData = [];
        if (window.supabase) {
            const { data } = await window.supabase.from('financial_records')
                .select('total, created_at, status')
                .eq('status', 'paid')
                .gte('created_at', new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
            if (data) financialData = data;
        } else {
            // Local Stub
            financialData = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]').filter(o => o.status === 'paid');
        }

        // Aggregate Revenue by Date
        financialData.forEach(rec => {
            const d = new Date(rec.created_at || rec.date);
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const index = dates.indexOf(label);
            if (index !== -1) {
                revenues[index] += parseFloat(rec.total);
            }
        });

        // 2. Render Revenue Chart
        const ctxRev = document.getElementById('chart-revenue');
        if (ctxRev) {
            if (this.revChart) this.revChart.destroy(); // Prevent double render
            this.revChart = new Chart(ctxRev, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Receita (R$)',
                        data: revenues,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 3. Category Data (Mock/Real Mix)
        // Ideally we fetch from orders => items => products => categories.
        // For now, simpler approximation or sample data if empty.
        const categories = { 'Kits': 0, 'Avulso': 0, 'Servi�os': 0 };
        financialData.forEach(rec => {
            // Basic heuristic
            if (rec.description?.toLowerCase().includes('kit')) categories['Kits']++;
            else categories['Avulso']++;
        });

        const ctxCat = document.getElementById('chart-categories');
        if (ctxCat) {
            if (this.catChart) this.catChart.destroy();
            this.catChart = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categories),
                    datasets: [{
                        data: Object.values(categories),
                        backgroundColor: ['#f97316', '#10b981', '#3b82f6'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true } }
                    }
                }
            });
        }
    },

    async predictStock() {
        if (!window.OrderManager) return;
        const orders = await OrderManager.getAllOrders();
        const now = new Date();

        let revLast14 = 0;
        let revPrev14 = 0;

        orders.forEach(o => {
            const d = new Date(o.date);
            const diffDays = (now - d) / (1000 * 60 * 60 * 24);

            if (diffDays <= 14) revLast14 += o.total;
            else if (diffDays <= 28) revPrev14 += o.total;
        });

        // Avoid division by zero
        if (revPrev14 === 0) revPrev14 = 1;

        const growth = (revLast14 - revPrev14) / revPrev14;

        // Baseline run rate (last 14 days annualized to 30)
        const baseline30 = (revLast14 / 14) * 30;

        // Apply trend
        const forecast = baseline30 * (1 + (growth * 0.5));

        const el = document.getElementById('stat-forecast');
        if (el) {
            el.innerText = 'R$ ' + forecast.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            // Add trend icon
            if (growth > 0) el.innerHTML += ' <span style="font-size:0.8rem; color:#10b981">?</span>';
            else el.innerHTML += ' <span style="font-size:0.8rem; color:#ef4444">?</span>';
        }
    },

    toggleManualInstallments(checkbox) {
        const div = document.getElementById('manual-debt-installments-options');
        if (div) div.style.display = checkbox.checked ? 'grid' : 'none';

        const periodicity = document.getElementById('manual-debt-periodicity');
        const count = document.getElementById('manual-debt-installments-count');
        if (!checkbox.checked) {
            count.value = '';
            periodicity.value = 'monthly';
        }
    },

    // --- EXP. CSV ---
    exportFinancialToCSV: function () {
        if (!this.lastFinancialRecords || this.lastFinancialRecords.length === 0) {
            alert("Nenhum registro para exportar.");
            return;
        }

        const map = this.lastPaymentsMap || {};

        // Header
        let csvContent = "ID,Cliente,Data,Itens,Total (R$),Pago (R$),Restante (R$)\n";

        this.lastFinancialRecords.forEach(r => {
            const date = new Date(r.date).toLocaleDateString('pt-BR');
            const total = Number(r.total) || 0;
            const paid = map[r.id] || 0;
            const debt = Math.max(0, total - paid);

            // Clean names to prevent comma breaking CSV
            const client = (r.customer_name || 'Desconhecido').replace(/,/g, '');
            const id = r.id;
            const itemsStr = r.items ? (typeof r.items === 'string' ? r.items : r.items.map(i => i.name).join(' | ')).replace(/,/g, '') : '';

            csvContent += `${id},${client},${date},${itemsStr},${total.toFixed(2)},${paid.toFixed(2)},${debt.toFixed(2)}\n`;
        });

        // Blob Download Trigger
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `marcaviva_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // --- FINANCIAL GOALS ---
    openNewGoalModal: function () {
        document.getElementById('modal-new-goal').classList.add('open');
        // Clear fields here
        document.getElementById('goal-name').value = '';
        document.getElementById('goal-target').value = '';
        document.getElementById('goal-current').value = '';
        document.getElementById('goal-percentage').value = '5';
    },

    saveGoal: async function () {
        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const current = parseFloat(document.getElementById('goal-current').value) || 0;
        const allocation = parseFloat(document.getElementById('goal-percentage').value) || 5.0;

        if (!name || isNaN(target)) {
            alert('Nome e Valor Alvo s�o obrigat�rios!');
            return;
        }

        const goal = {
            name, target_amount: target, current_amount: current, allocation_percentage: allocation,
            status: 'active'
        };

        if (window.supabase) {
            const { error } = await window.supabase.from('financial_goals').insert(goal);
            if (error) {
                console.error(error);
                alert('Erro ao salvar meta.');
            } else {
                Swal.fire('Novo Sonho!', 'Meta criada com sucesso.', 'success');
                this.closeModals();
                this.fetchGoals(); // Refresh
            }
        } else {
            alert('Funcionalidade dispon�vel apenas online.');
        }
    },

    async fetchGoals() {
        const container = document.getElementById('goals-container');
        if (!container) return;

        if (!window.supabase) {
            container.innerHTML = '<div style="padding:10px; color:#94a3b8;">Offline</div>';
            return;
        }

        const { data, error } = await window.supabase.from('financial_goals').select('*').eq('status', 'active');
        if (error || !data) {
            container.innerHTML = '<div style="padding:10px; color:#ef4444;">Erro ao carregar metas.</div>';
            return;
        }

        if (data.length === 0) {
            container.innerHTML = `
            <div style="min-width: 250px; background:white; padding:15px; border-radius:12px; border:1px dashed #cbd5e1; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;" onclick="adminApp.openNewGoalModal()">
                <i class="ph-bold ph-plus" style="font-size:1.5rem; color:#cbd5e1; margin-bottom:5px;"></i>
                <span style="color:#64748b; font-size:0.9rem;">Criar primeira meta</span>
            </div>`;
            return;
        }

        container.innerHTML = data.map(g => {
            const progress = Math.min((g.current_amount / g.target_amount) * 100, 100).toFixed(1);
            return `
            <div style="min-width: 280px; background:white; padding:15px; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 2px 5px rgba(0,0,0,0.05); position:relative;">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong style="color:#334155;">${g.name}</strong>
                    <span style="font-size:0.8rem; background:#fdf4ff; color:#d946ef; padding:2px 8px; border-radius:10px; font-weight:600;">${progress}%</span>
                </div>
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:10px;">
                    R$ ${g.current_amount.toFixed(2)} de R$ ${g.target_amount.toFixed(2)}
                </div>
                <div style="width:100%; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                    <div style="width:${progress}%; height:100%; background: linear-gradient(90deg, #d946ef, #ec4899); border-radius:3px;"></div>
                </div>
                <div style="margin-top:8px; font-size:0.75rem; color:#94a3b8; display:flex; align-items:center; gap:5px;">
                     <i class="ph-bold ph-arrows-clockwise"></i> ${g.allocation_percentage}% dos lucros
                </div>
            </div>
            `;
        }).join('');
    },

    openWhatsApp(phone, orderId, name) {
        if (!phone) {
            Swal.fire({
                title: 'Sem Telefone',
                text: 'Este pedido n�o tem n�mero de WhatsApp cadastrado. Digite um n�mero:',
                input: 'text',
                inputValue: '',
                showCancelButton: true,
                confirmButtonText: 'Enviar'
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    this._sendWa(result.value, orderId, name);
                }
            });
            return;
        }
        this._sendWa(phone, orderId, name);
    },

    _sendWa(phone, orderId, name) {
        // Clean phone
        const p = phone.replace(/[^0-9]/g, '');
        if (!p) return;

        const msg = `Ol� ${name}, seu pedido #${orderId} no SiteMarcaViva saiu para entrega! ??`;
        const url = `https://wa.me/55${p}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    async exportFinancials() {
        // Fetch All Financial Data
        let data = [];
        if (window.supabase) {
            const { data: dbData } = await window.supabase.from('financial_records').select('*').order('created_at', { ascending: false });
            if (dbData) data = dbData;
        } else {
            data = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
        }

        if (data.length === 0) {
            Swal.fire('Vazio', 'Nada para exportar.', 'info');
            return;
        }

        // CSV Header
        let csv = 'Data,Descri��o,Tipo,Valor,Status,Cliente\n';

        data.forEach(row => {
            const date = new Date(row.created_at || row.date).toLocaleDateString();
            const desc = (row.description || '').replace(/,/g, ' '); // Ecape commas
            const type = row.type === 'expense' ? 'Despesa' : 'Receita';
            const value = row.total ? row.total.toFixed(2) : '0.00';
            const status = row.status === 'paid' ? 'Pago' : 'Pendente';
            const client = (row.customer_name || '').replace(/,/g, ' ');

            csv += `${date},${desc},${type},${value},${status},${client}\n`;
        });

        // Trigger Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `marca_viva_financeiro_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    // === BACKUP & EXPORT SYSTEM ===
    async exportBackup() {
        const loadingAlert = Swal.fire({
            title: '?? Gerando Backup PDF...',
            html: 'Coletando dados do banco...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            // Fetch all data from Supabase
            const [products, orders, financials, goals, inputs, inventory] = await Promise.all([
                window.supabase.from('products').select('*'),
                window.supabase.from('protocols').select('*, protocol_items(*) '),
                window.supabase.from('financial_records').select('*'),
                window.supabase.from('financial_goals').select('*').then(r => r.data || []),
                window.supabase.from('insumos').select('*').then(r => r.data || []),
                window.supabase.from('inventory_movements').select('*').then(r => r.data || [])
            ]);

            const backup = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    version: '1.0',
                    project: 'Marca Viva',
                    total_records: (products.data?.length || 0) + (orders.data?.length || 0) + (financials.data?.length || 0)
                },
                products: products.data || [],
                orders: orders.data || [],
                financial_records: financials.data || [],
                financial_goals: goals,
                insumos: inputs,
                inventory_movements: inventory
            };

            // Generate PDF
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF n�o carregada.");
            window.jsPDF = window.jspdf.jsPDF;
            const doc = new window.jsPDF();
            const dateStr = new Date().toLocaleDateString('pt-BR');

            // Header
            doc.setFontSize(18);
            doc.text('Backup - Marca Viva', 14, 20);
            doc.setFontSize(10);
            doc.text(`Data: ${dateStr}`, 14, 26);

            // Calculate Dashboard Metrics
            const today = new Date().toISOString().split('T')[0];
            const todaySales = financials.data?.filter(f =>
                f.type === 'income' && f.created_at.startsWith(today)
            ).reduce((sum, f) => sum + (f.total || 0), 0) || 0;

            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const monthlyIncome = financials.data?.filter(f =>
                f.type === 'income' && f.created_at >= startOfMonth
            ).reduce((sum, f) => sum + (f.total || 0), 0) || 0;
            const monthlyExpenses = financials.data?.filter(f =>
                f.type === 'expense' && f.created_at >= startOfMonth
            ).reduce((sum, f) => sum + (f.total || 0), 0) || 0;
            const monthlyProfit = monthlyIncome - monthlyExpenses;

            // AI Forecast (simple average)
            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const recentSales = financials.data?.filter(f =>
                f.type === 'income' && f.created_at >= last30Days
            ).reduce((sum, f) => sum + (f.total || 0), 0) || 0;
            const dailyAvg = recentSales / 30;
            const forecast30d = dailyAvg * 30;

            // Dashboard Summary Box (Enhanced)
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('?? M�tricas do Dashboard', 14, 36);

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            let yPos = 44;
            doc.text(`?? Vendas Hoje: R$ ${todaySales.toFixed(2)}`, 14, yPos);
            yPos += 6;
            // Dynamic color based on profit (green if positive, red if negative)
            if (monthlyProfit >= 0) {
                doc.setTextColor(34, 197, 94); // Green
            } else {
                doc.setTextColor(239, 68, 68); // Red
            }
            doc.text(`?? Lucro Mensal: R$ ${monthlyProfit.toFixed(2)}`, 14, yPos);
            yPos += 6;
            doc.setTextColor(71, 85, 105);
            doc.text(`?? Previs�o 30d (IA): R$ ${forecast30d.toFixed(2)}`, 14, yPos);
            yPos += 8;

            // Financial Goals (Cofrinho)
            if (goals && goals.length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(139, 92, 246);
                doc.text('?? Cofrinho de Metas', 14, yPos);
                yPos += 2;

                const goalRows = goals.slice(0, 3).map(g => [
                    (g.name || '').substring(0, 25),
                    `R$ ${(g.current_amount || 0).toFixed(2)}`,
                    `R$ ${(g.target_amount || 0).toFixed(2)}`,
                    `${Math.round((g.current_amount / g.target_amount) * 100)}%`
                ]);

                doc.autoTable({
                    head: [['Meta', 'Atual', 'Objetivo', 'Progresso']],
                    body: goalRows,
                    startY: yPos,
                    theme: 'grid',
                    headStyles: { fillColor: [139, 92, 246], textColor: 255 },
                    styles: { fontSize: 8 }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }

            // Data Summary
            doc.setFontSize(11);
            doc.setTextColor(30, 41, 59);
            doc.text('?? Resumo de Dados', 14, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text(`Produtos: ${products.data?.length || 0}`, 14, yPos);
            yPos += 5;
            doc.text(`Pedidos: ${orders.data?.length || 0}`, 14, yPos);
            yPos += 5;
            doc.text(`Registros Financeiros: ${financials.data?.length || 0}`, 14, yPos);
            yPos += 10;

            // Products Table
            if (products.data && products.data.length > 0) {
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('?? Produtos (Top 20)', 14, yPos);
                yPos += 2;

                const rows = products.data.slice(0, 20).map(p => [
                    (p.name || '').substring(0, 30),
                    `R$ ${(p.price || 0).toFixed(2)}`
                ]);
                doc.autoTable({
                    head: [['Produto', 'Pre�o']],
                    body: rows,
                    startY: yPos,
                    theme: 'grid',
                    headStyles: { fillColor: [59, 130, 246] },
                    styles: { fontSize: 8 }
                });
                yPos = doc.lastAutoTable.finalY + 10;
            }

            // Orders Table (Recent 15)
            if (orders.data && orders.data.length > 0 && yPos < 250) {
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('?? Pedidos Recentes (�ltimos 15)', 14, yPos);
                yPos += 2;

                const orderRows = orders.data.slice(-15).map(o => [
                    new Date(o.created_at).toLocaleDateString('pt-BR'),
                    (o.client_name || 'Cliente').substring(0, 20),
                    `R$ ${(o.total || 0).toFixed(2)}`
                ]);

                doc.autoTable({
                    head: [['Data', 'Cliente', 'Total']],
                    body: orderRows,
                    startY: yPos,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 185, 129] },
                    styles: { fontSize: 8 }
                });
            }

            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `Backup_Marca_Viva_${timestamp}.pdf`;


            // Use File System Access API for "Save As" dialog
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'PDF Document',
                            accept: { 'application/pdf': ['.pdf'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    const pdfBlob = doc.output('blob');
                    await writable.write(pdfBlob);
                    await writable.close();
                } else {
                    // Fallback: direct download
                    doc.save(filename);
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    // If user cancels, silently fail
                    doc.save(filename);
                }
            }



            loadingAlert.close();

            Swal.fire({
                icon: 'success',
                title: 'Backup Criado!',
                html: `
                    <strong>${filename.substring(filename.length - 40)}</strong><br><br>
                    ?? ${backup.metadata.total_records} registros salvos<br>
                    ?? Formato: PDF
                `,
                confirmButtonText: 'OK'
            });

        } catch (error) {
            console.error('Backup error:', error);
            loadingAlert.close();
            Swal.fire('Erro', 'N�o foi poss�vel criar o backup: ' + error.message, 'error');
            Swal.fire('Erro', 'No foi possvel criar o backup: ' + error.message, 'error');
        }
    },

    // === CHARTS RENDERING ===
    async renderCharts() {
        if (!window.Chart) return;

        try {
            // Fetch financial data (Protocols)
            const { data: financials, error } = await window.supabase
                .from('protocols')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;

            if (!financials || financials.length === 0) {
                console.log("Charts: No data found.");
                return;
            }

            console.log(`Charts: Loaded ${financials.length} records.`);

            // Map protocols to financial format
            const mappedFinancials = financials.map(p => ({
                created_at: p.created_at,
                total: Number(p.total_amount),
                type: 'income',
                category: 'Vendas'
            }));

            this.renderRevenueChart(mappedFinancials);
            this.renderCategoriesChart(mappedFinancials);

        } catch (e) {
            console.error("Chart Error:", e);
            // Optional: User feedback
        }
    },

    renderRevenueChart(financials) {
        const ctx = document.getElementById('chart-revenue');
        if (!ctx) return;

        // Get last 30 days
        const now = new Date();
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            last30Days.push(d.toISOString().split('T')[0]);
        }

        // Aggregate by date
        const dailyRevenue = {};
        last30Days.forEach(date => dailyRevenue[date] = 0);

        financials.forEach(rec => {
            const date = rec.created_at.split('T')[0];
            if (dailyRevenue.hasOwnProperty(date) && rec.type === 'income') {
                dailyRevenue[date] += parseFloat(rec.total) || 0;
            }
        });

        // Destroy existing chart if any
        if (this._revenueChart) this._revenueChart.destroy();

        this._revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map(d => {
                    const date = new Date(d);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [{
                    label: 'Receita Di�ria',
                    data: Object.values(dailyRevenue),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `R$ ${context.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `R$ ${value}`
                        }
                    }
                }
            }
        });
    },

    renderCategoriesChart(financials) {
        const ctx = document.getElementById('chart-categories');
        if (!ctx) return;

        // Count by type (simplificado - voc� pode melhorar com categorias reais)
        const categories = {};
        financials.forEach(rec => {
            if (rec.type === 'income') {
                const cat = rec.category || rec.description || 'Vendas';
                categories[cat] = (categories[cat] || 0) + 1;
            }
        });

        // Get top 5
        const sorted = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (this._categoriesChart) this._categoriesChart.destroy();

        this._categoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: sorted.map(([name]) => name),
                datasets: [{
                    data: sorted.map(([, count]) => count),
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    // === NOTIFICATIONS SYSTEM ===
    async fetchNotifications() {
        if (!window.supabase) return [];
        const { data } = await window.supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        return data || [];
    },

    async updateNotificationsBadge() {
        const notifications = await this.fetchNotifications();
        const unread = notifications.filter(n => !n.is_read);
        const badge = document.getElementById('notifications-badge');
        const preview = document.getElementById('notifications-preview');
        if (unread.length > 0) {
            badge.textContent = unread.length;
            badge.style.display = 'block';
            preview.textContent = `${unread.length} nova(s)`;
        } else {
            badge.style.display = 'none';
            preview.textContent = 'Nenhuma nova';
        }
    },

    async openNotificationsModal() {
        const notifications = await this.fetchNotifications();
        const html = notifications.length === 0
            ? '<div style="text-align:center; padding:40px; color:#94a3b8;"><i class="ph-duotone ph-bell-slash" style="font-size:3rem;"></i><br>Nenhuma notifica��o</div>'
            : notifications.map(n => `<div onclick="adminApp.markNotificationAsRead('${n.id}')" style="padding:12px; background:white; margin-bottom:8px; border-radius:8px; cursor:pointer;"><div style="font-weight:600;">${n.title}</div><div style="color:#64748b; font-size:0.8rem;">${n.message}</div></div>`).join('');
        Swal.fire({ title: '?? Notifica��es', html: `<div style="max-height:400px; overflow-y:auto;">${html}</div>`, showConfirmButton: false, width: '600px' });
    },

    async markNotificationAsRead(id) {
        if (!window.supabase) return;
        await window.supabase.from('notifications').update({ is_read: true }).eq('id', id);
        this.updateNotificationsBadge();
    },

    // === USERS MANAGEMENT ===
    async fetchUsers() {
        try {
            if (!window.supabase) {
                console.error('Supabase not initialized');
                return;
            }

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
                title: 'Erro ao carregar usu�rios',
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
                        Nenhum usu�rio encontrado
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
                'user': 'Usu�rio'
            };

            const roleStyle = roleColors[user.role] || roleColors.user;
            const roleLabel = roleLabels[user.role] || roleLabels.user;
            const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

            return `
                <tr data-user-id="${user.id}">
                    <td>
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem;">
                            ${initials}
                        </div>
                    </td>
                    <td style="font-weight: 600; color: #1e293b;">
                        ${user.name || 'Sem nome'}
                        ${user.approved ? '<i class="ph-bold ph-check-circle" style="color:#10b981; margin-left:4px;" title="Aprovado"></i>' : '<i class="ph-bold ph-clock" style="color:#f59e0b; margin-left:4px;" title="Pendente"></i>'}
                    </td>
                    <td style="color: #64748b;">${user.email}</td>
                    <td>
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; ${roleStyle}">
                            ${roleLabel}
                        </span>
                    </td>
                    <td style="color: #64748b; font-size: 0.9rem;">${createdDate}</td>
                    <td style="color: #64748b; font-size: 0.9rem;">${lastLogin}</td>
                    <td>
                        ${!user.approved && user.role !== 'admin' ? `
                            <button onclick="adminApp.approveUser('${user.id}', '${user.name}')" 
                                class="btn-primary" style="padding: 4px 10px; font-size: 0.8rem; margin-right: 5px;">
                                Aprovar
                            </button>
                        ` : ''}
                        <button onclick="adminApp.deleteUserConfirm('${user.id}', '${user.email}')" 
                            class="btn-icon-danger" title="Remover usu�rio"
                            ${user.role === 'admin' ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async approveUser(userId, userName) {
        try {
            const { error } = await window.supabase
                .from('profiles')
                .update({ approved: true })
                .eq('id', userId);

            if (error) throw error;

            Swal.fire({
                icon: 'success',
                title: 'Usu�rio Aprovado!',
                text: `${userName} agora pode acessar a loja.`,
                timer: 2000,
                showConfirmButton: false
            });

            // Refresh
            await this.fetchUsers();

        } catch (err) {
            console.error("Error approving user:", err);
            Swal.fire('Erro', 'Falha ao aprovar usu�rio.', 'error');
        }
    },

    updateUsersStats() {
        const users = this.users || [];
        const totalUsers = users.length;
        const activeUsers = users.filter(u => u.last_sign_in_at).length;
        const adminUsers = users.filter(u => u.role === 'admin').length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = users.filter(u => new Date(u.created_at) > thirtyDaysAgo).length;

        if (document.getElementById('stat-total-users')) document.getElementById('stat-total-users').textContent = totalUsers;
        if (document.getElementById('stat-active-users')) document.getElementById('stat-active-users').textContent = activeUsers;
        if (document.getElementById('stat-admin-users')) document.getElementById('stat-admin-users').textContent = adminUsers;
        if (document.getElementById('stat-new-users')) document.getElementById('stat-new-users').textContent = newUsers;
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
            title: 'Remover Usu�rio?',
            html: `<p>Voc� est� prestes a remover: <b>${userEmail}</b></p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            await this.deleteUser(userId);
        }
    },

    async deleteUser(userId) {
        try {
            const { error } = await window.supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            Swal.fire('Removido!', 'Usu�rio removido com sucesso.', 'success');
            await this.fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            Swal.fire('Erro', err.message, 'error');
        }
    },

    // --- Tiers & Gallery Logic (Fixed) ---

    currentGalleryFiles: [],

    handleFileSelect(input) {
        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(file => {
                this.currentGalleryFiles.push(file);
            });
            this.renderGalleryPreview();
        }
    },

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('drop-zone').classList.remove('dragover');
        if (e.dataTransfer.files) {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (file.type.startsWith('image/')) this.currentGalleryFiles.push(file);
            });
            this.renderGalleryPreview();
        }
    },

    renderGalleryPreview() {
        const container = document.getElementById('gallery-preview-grid');
        if (!container) return;
        container.innerHTML = '';
        this.currentGalleryFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'gallery-item';
                div.innerHTML = `
                    <img src="${e.target.result}">
                    <button class="gallery-remove" onclick="adminApp.removeGalleryItem(${index})"><i class="ph-bold ph-x"></i></button>
                    ${index === 0 ? '<span style="position:absolute;bottom:0;width:100%;text-align:center;background:rgba(0,0,0,0.6);color:white;font-size:10px;">CAPA</span>' : ''}
                `;
                container.appendChild(div);
            }
            reader.readAsDataURL(file);
        });
    },

    removeGalleryItem(index) {
        this.currentGalleryFiles.splice(index, 1);
        this.renderGalleryPreview();
    },

    generateSuggestedTiers() {
        const { totalCost } = this.calculateProfit();
        if (!totalCost || totalCost <= 0) {
            Swal.fire('Ops!', 'Defina o custo do produto (insumos) primeiro.', 'warning');
            return;
        }
        const standard = [
            { qty: 10, margin: 1.5 }, { qty: 30, margin: 1.2 },
            { qty: 50, margin: 1.0 }, { qty: 100, margin: 0.8 },
            { qty: 300, margin: 0.6 }, { qty: 1000, margin: 0.4 }
        ];

        document.getElementById('tiers-list-body').innerHTML = '';
        standard.forEach(t => {
            let price = totalCost * (1 + t.margin);
            this.addTierRow(t.qty, price.toFixed(2));
        });
        Swal.fire({
            toast: true, position: 'top-end', icon: 'success',
            title: 'Tabela sugerida gerada!', showConfirmButton: false, timer: 2000
        });
    },

    addTierRow(min = '', price = '') {
        const tbody = document.getElementById('tiers-list-body');
        const rowId = Date.now() + Math.random().toString(16).slice(2);
        const tr = document.createElement('tr');
        tr.id = `tier-row-${rowId}`;
        tr.innerHTML = `
            <td><input type="number" class="tier-row-input tier-min" value="${min}" placeholder="Qtd" onchange="adminApp.calcTierProfit('${rowId}')"></td>
            <td><input type="number" class="tier-row-input tier-price" value="${price}" placeholder="R$" step="0.01" onkeyup="adminApp.calcTierProfit('${rowId}')"></td>
            <td><div id="tier-profit-${rowId}" style="font-size:0.85rem; font-weight:600; color:#94a3b8;">-</div></td>
            <td style="text-align:center;">
                <button onclick="this.closest('tr').remove()" style="color:#ef4444; background:none; border:none; cursor:pointer;"><i class="ph-bold ph-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
        if (min && price) this.calcTierProfit(rowId);
    },

    calcTierProfit(rowId) {
        const row = document.getElementById(`tier-row-${rowId}`);
        if (!row) return;
        const price = parseFloat(row.querySelector('.tier-price').value);
        const { totalCost } = this.calculateProfit();
        const profitDiv = document.getElementById(`tier-profit-${rowId}`);

        if (!price) { profitDiv.innerText = '-'; return; }

        const profit = price - totalCost;
        const margin = price > 0 ? (profit / price) * 100 : 0;

        if (profit < 0) profitDiv.innerHTML = `<span style="color:#ef4444">Prej: R$ ${Math.abs(profit).toFixed(2)}</span>`;
        else profitDiv.innerHTML = `<span style="color:${margin < 15 ? '#f59e0b' : '#10b981'}">R$ ${profit.toFixed(2)} (${margin.toFixed(0)}%)</span>`;
    },



    // --- Category Management ---

    loadSettings() {
        console.log('Loading Settings...');
        this.switchSettingsTab('general');
    },

    switchSettingsTab(tabName) {
        // Toggle Tabs
        const genTab = document.getElementById('settings-tab-general');
        const catTab = document.getElementById('settings-tab-categories');
        const genBtn = document.getElementById('tab-btn-settings-general');
        const catBtn = document.getElementById('tab-btn-settings-categories');

        if (genTab) genTab.style.display = 'none';
        if (catTab) catTab.style.display = 'none';
        if (genBtn) genBtn.classList.remove('active');
        if (catBtn) catBtn.classList.remove('active');

        const targetTab = document.getElementById(`settings-tab-${tabName}`);
        const targetBtn = document.getElementById(`tab-btn-settings-${tabName}`);

        if (targetTab) targetTab.style.display = 'block';
        if (targetBtn) targetBtn.classList.add('active');

        if (tabName === 'categories') {
            this.fetchCategories();
        }
    },

    async fetchCategories() {
        try {
            const { data: categories, error: catError } = await window.supabase
                .from('categories')
                .select('*')
                .order('name');

            if (catError) throw catError;

            // Fetch products for counts
            const { data: products } = await window.supabase.from('products').select('category');

            const counts = {};
            if (products) {
                products.forEach(p => {
                    if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
                });
            }

            // Organizar em �rvore (Parents first)
            const roots = categories.filter(c => !c.parent_id);
            const children = categories.filter(c => c.parent_id);

            // Map children to parents
            const tree = roots.map(root => {
                return {
                    ...root,
                    subs: children.filter(c => c.parent_id === root.id)
                };
            });

            this.renderCategoriesTree(tree, counts);
            this.updateProductCategorySelect(tree); // New Select Logic
            this.lastCategories = categories; // Store for modal usage

        } catch (err) {
            console.error('Error loading categories module:', err);
        }
    },

    renderCategoriesTree(tree, counts) {
        const tbody = document.getElementById('categories-table-body');
        if (!tbody) return;

        let html = '';

        tree.forEach(root => {
            const rootCount = counts[root.name] || 0;
            // Root Row
            html += `
            <tr style="background:#f8fafc;">
                <td style="font-weight:700; color:var(--primary-hero);"><i class="ph-bold ph-folder"></i> ${root.name}</td>
                <td style="color:#64748b; font-size:0.8rem;">/${root.slug}</td>
                <td><span style="background:${rootCount > 0 ? '#10b981' : '#cbd5e1'}; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem;">${rootCount}</span></td>
                <td>
                    <button onclick="adminApp.deleteCategory('${root.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;" title="Excluir">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                    <!-- Add Sub Button -->
                    <button onclick="adminApp.openCategoryModal('${root.id}')" style="color:#3b82f6; background:none; border:none; cursor:pointer; margin-left:5px;" title="Adicionar Subcategoria">
                        <i class="ph-bold ph-git-merge"></i>
                    </button>
                </td>
            </tr>
            `;

            // Sub Rows
            root.subs.forEach(sub => {
                const subCount = counts[sub.name] || 0;
                html += `
                <tr>
                    <td style="padding-left:40px; color:#475569; position:relative;">
                        <i class="ph-bold ph-arrow-elbow-down-right" style="color:#cbd5e1; margin-right:5px;"></i> ${sub.name}
                    </td>
                    <td style="color:#94a3b8; font-size:0.8rem;">/${sub.slug}</td>
                    <td><span style="background:${subCount > 0 ? '#10b981' : '#cbd5e1'}; color:white; padding:2px 8px; border-radius:10px; font-size:0.75rem;">${subCount}</span></td>
                    <td>
                         <button onclick="adminApp.deleteCategory('${sub.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer;">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </td>
                </tr>
                `;
            });
        });

        tbody.innerHTML = html;
    },

    updateProductCategorySelect(tree) {
        const select = document.getElementById('prod-category');
        if (!select) return;

        let html = '<option value="">Selecione...</option>';

        tree.forEach(root => {
            // Option group for Root e seus filhos
            html += `<optgroup label="${root.name}">`;
            // Root selecion�vel? Geralmente sim
            html += `<option value="${root.name}">${root.name} (Principal)</option>`;

            root.subs.forEach(sub => {
                html += `<option value="${sub.name}">${sub.name}</option>`;
            });
            html += `</optgroup>`;
        });

        // Add "Other"
        html += '<option value="Outros">Outros</option>';
        // Allow creating new? Select doesn't allow typing easily.
        // User manages cats in Settings now.

        select.innerHTML = html;
    },

    async openCategoryModal(parentId = null) {
        // Pre-fetch potential parents if creating a new root? No, parentId passed via button

        // Se parentId foi passado, j� sabemos quem � o pai.
        // Se n�o, perguntamos se � raiz ou sub.

        let parentName = '';
        if (parentId && this.lastCategories) {
            const p = this.lastCategories.find(c => c.id === parentId);
            if (p) parentName = p.name;
        }

        const title = parentId ? `Nova Subcategoria em "${parentName}"` : 'Nova Categoria Principal';

        const { value: name } = await Swal.fire({
            title: title,
            input: 'text',
            inputLabel: 'Nome',
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            confirmButtonColor: '#ea580c'
        });

        if (name) {
            await this.createCategory(name, parentId);
        }
    },

    async createCategory(name, parentId) {
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

        const payload = { name, slug };
        if (parentId) payload.parent_id = parentId;

        const { error } = await window.supabase.from('categories').insert(payload);

        if (error) Swal.fire('Erro', error.message, 'error');
        else {
            Swal.fire('Sucesso', 'Categoria criada!', 'success');
            this.fetchCategories();
        }
    },

    async deleteCategory(id) {
        // Check for children first? Supabase will block if RESTRICT foreign key? 
        // My SQL said ON DELETE SET NULL. So children become roots.

        const result = await Swal.fire({
            title: 'Excluir Categoria?',
            text: "Se houver subcategorias, elas se tornar�o principais.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            const { error } = await window.supabase.from('categories').delete().eq('id', id);
            if (error) Swal.fire('Erro', 'Erro ao excluir (verifique se h� produtos vinculados)', 'error');
            else this.fetchCategories();
        }
    },

    // --- End Category Logic ---

    // Existing methods...
    async refreshUsers() {
        await this.fetchUsers();
    }
};

// Expose globally
window.adminApp = adminApp;

// --- SIMPLIFIED KANBAN: Order Management Functions ---
adminApp.currentOrderFilter = 'all';

adminApp.renderOrdersTable = async function () {
    if (typeof ProtocolsManager !== 'undefined') {
        ProtocolsManager.loadProtocols();
    } else {
        const tbody = document.getElementById('orders');
        if (tbody) tbody.innerHTML = '<div style="padding:20px; color:red;">Erro: Gerenciador de Protocolos no carregado.</div>';
    }
};

adminApp.updateOrdersStats = function () {
    if (typeof ProtocolsManager === 'undefined' || !ProtocolsManager.state || !ProtocolsManager.state.protocols) return;

    const stats = { pending: 0, production: 0, completed: 0, total: ProtocolsManager.state.protocols.length };

    ProtocolsManager.state.protocols.forEach(order => {
        const status = order.status || 'inquiry';
        if (status === 'inquiry' || status === 'pending') stats.pending++;
        else if (status === 'production') stats.production++;
        else if (status === 'completed' || status === 'delivered' || status === 'approved') stats.completed++;
    });

    const elPending = document.getElementById('orders-stat-pending');
    if (elPending) elPending.textContent = stats.pending;

    const elProduction = document.getElementById('orders-stat-production');
    if (elProduction) elProduction.textContent = stats.production;

    const elCompleted = document.getElementById('orders-stat-completed');
    if (elCompleted) elCompleted.textContent = stats.completed;

    const elTotal = document.getElementById('orders-stat-total');
    if (elTotal) elTotal.textContent = stats.total;
};

adminApp.filterOrders = function (filterType) {
    this.currentOrderFilter = filterType || 'all';

    // Update active button
    document.querySelectorAll('.filter-toolbar button[data-filter]').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.filter-toolbar button[data-filter="${this.currentOrderFilter}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    if (typeof ProtocolsManager !== 'undefined') {
        let mapped = filterType;
        if (filterType === 'inquiry') mapped = 'pending';
        // Em produo no ProtocolsManager pode ser um status diferente futuramente
        ProtocolsManager.setFilter(mapped);
    }
};

adminApp.searchOrders = function (searchTerm) {
    // For now, reload. Search not fully implemented in ProtocolsManager
    if (typeof ProtocolsManager !== 'undefined') ProtocolsManager.loadProtocols();
};

adminApp.refreshOrders = async function () {
    const btn = event && event.target ? event.target.closest('button') : null;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="ph-bold ph-spinner" style="animation: spin 1s linear infinite;"></i> Atualizando...';
    }

    await this.renderOrdersTable();

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> Atualizar';
    }
};

// ==================== NEW ORDER CREATION ====================

adminApp.openNewOrderModal = async function () {
    const { value: formData } = await Swal.fire({
        title: '➕ Criar Novo Pedido',
        html: `
            <div style="text-align: left;">
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #334155;">📋 Dados do Cliente</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Nome *</label>
                        <input id="client-name" class="swal2-input" placeholder="Nome do cliente" style="margin: 0; width: 100%;">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Email</label>
                            <input id="client-email" type="email" class="swal2-input" placeholder="email@exemplo.com" style="margin: 0; width: 100%;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Telefone</label>
                            <input id="client-phone" class="swal2-input" placeholder="(31) 99999-9999" style="margin: 0; width: 100%;">
                        </div>
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #334155;">📦 Produtos</h4>
                    <div id="products-list"></div>
                    <button type="button" onclick="adminApp.addProductRow()" class="swal2-confirm swal2-styled" 
                        style="margin-top: 10px; background: #3b82f6;">
                        <i class="ph-bold ph-plus"></i> Adicionar Produto
                    </button>
                </div>

                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Observações</label>
                        <textarea id="order-notes" class="swal2-textarea" placeholder="Observações internas..." style="margin: 0; width: 100%; min-height: 60px;"></textarea>
                    </div>
                    <div style="text-align: right; font-size: 1.2rem; font-weight: 700; color: #334155; padding-top: 10px; border-top: 2px solid #e2e8f0;">
                        Total: R$ <span id="order-total">0,00</span>
                    </div>
                </div>
            </div>
        `,
        width: '700px',
        showCancelButton: true,
        confirmButtonText: 'Criar Pedido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        didOpen: () => {
            adminApp.addProductRow();
        },
        preConfirm: () => {
            const clientName = document.getElementById('client-name').value.trim();
            const clientEmail = document.getElementById('client-email').value.trim();
            const clientPhone = document.getElementById('client-phone').value.trim();
            const notes = document.getElementById('order-notes').value.trim();

            if (!clientName) {
                Swal.showValidationMessage('Nome do cliente é obrigatório');
                return false;
            }

            const products = [];
            document.querySelectorAll('.product-row').forEach(row => {
                const name = row.querySelector('.product-name').value.trim();
                const qty = parseInt(row.querySelector('.product-qty').value) || 0;
                const price = parseFloat(row.querySelector('.product-price').value) || 0;

                if (name && qty > 0 && price > 0) {
                    products.push({ name, quantity: qty, unit_price: price, total_price: qty * price });
                }
            });

            if (products.length === 0) {
                Swal.showValidationMessage('Adicione pelo menos um produto');
                return false;
            }

            const totalAmount = products.reduce((sum, p) => sum + p.total_price, 0);

            return { clientName, clientEmail, clientPhone, notes, products, totalAmount };
        }
    });

    if (formData) {
        await this.createNewOrder(formData);
    }
};

adminApp.addProductRow = function () {
    const container = document.getElementById('products-list');
    const row = document.createElement('div');
    row.className = 'product-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 10px; align-items: center;';

    row.innerHTML = `
        <input type="text" class="swal2-input product-name" placeholder="Nome do produto" style="margin: 0;">
        <input type="number" class="swal2-input product-qty" placeholder="Qtd" min="1" value="1" oninput="adminApp.updateTotal()" style="margin: 0;">
        <input type="number" class="swal2-input product-price" placeholder="Preço" step="0.01" min="0" oninput="adminApp.updateTotal()" style="margin: 0;">
        <div style="font-weight: 600; color: #334155; padding: 0 10px;">R$ <span class="product-total">0,00</span></div>
        <button type="button" onclick="this.parentElement.remove(); adminApp.updateTotal()" 
            style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer;">
            <i class="ph-bold ph-trash"></i>
        </button>
    `;
    container.appendChild(row);
    adminApp.updateTotal();
};

adminApp.updateTotal = function () {
    let total = 0;
    document.querySelectorAll('.product-row').forEach(row => {
        const qty = parseInt(row.querySelector('.product-qty').value) || 0;
        const price = parseFloat(row.querySelector('.product-price').value) || 0;
        const productTotal = qty * price;
        row.querySelector('.product-total').textContent = productTotal.toFixed(2);
        total += productTotal;
    });
    document.getElementById('order-total').textContent = total.toFixed(2);
};

adminApp.createNewOrder = async function (formData) {
    try {
        Swal.fire({
            title: 'Criando pedido...',
            html: 'Aguarde enquanto salvamos os dados',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const year = new Date().getFullYear();
        const { data: existingOrders } = await window.supabase
            .from('protocols')
            .select('id')
            .like('id', `#MV-${year}-%`)
            .order('id', { ascending: false })
            .limit(1);

        let nextNumber = 1;
        if (existingOrders && existingOrders.length > 0) {
            const lastId = existingOrders[0].id;
            const match = lastId.match(/#MV-\d{4}-(\d{4})/);
            if (match) nextNumber = parseInt(match[1]) + 1;
        }

        const orderId = `#MV-${year}-${String(nextNumber).padStart(4, '0')}`;

        const { error: protocolError } = await window.supabase
            .from('protocols')
            .insert({
                id: orderId,
                client_name: formData.clientName,
                client_email: formData.clientEmail || null,
                client_phone: formData.clientPhone || null,
                total_amount: formData.totalAmount,
                paid_amount: 0,
                payment_status: 'pending',
                status: 'inquiry',
                column_id: 1,
                notes: formData.notes || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (protocolError) throw protocolError;

        const items = formData.products.map(product => ({
            protocol_id: orderId,
            product_name: product.name,
            quantity: product.quantity,
            unit_price: product.unit_price,
            total_price: product.total_price
        }));

        const { error: itemsError } = await window.supabase
            .from('protocol_items')
            .insert(items);

        if (itemsError) throw itemsError;

        await Swal.fire({
            icon: 'success',
            title: 'Pedido Criado!',
            html: `
                <p>Pedido <strong>${orderId}</strong> foi criado com sucesso!</p>
                <p><strong>Cliente:</strong> ${formData.clientName}</p>
                <p><strong>Total:</strong> R$ ${formData.totalAmount.toFixed(2)}</p>
                <p><strong>Produtos:</strong> ${formData.products.length} item(ns)</p>
            `,
            confirmButtonColor: '#10b981'
        });

        this.renderOrdersTable();

    } catch (error) {
        console.error('Error creating order:', error);
        Swal.fire({
            icon: 'error',
            title: 'Erro ao Criar Pedido',
            text: error.message || 'Não foi possível criar o pedido. Tente novamente.'
        });
    }
};

// ==================== ORDER DETAILS ====================

adminApp.viewOrderDetails = function (orderId) {
    const order = this.ordersData.find(o => o.id === orderId);
    if (!order) return;

    let itemsHtml = '<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 15px; max-height: 200px; overflow-y: auto;">';
    itemsHtml += '<h4 style="margin: 0 0 10px 0; color: #334155; font-size: 0.9rem;">Itens do Pedido:</h4>';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const subtotal = (item.quantity * item.price) || 0;
            itemsHtml += `
                <div style="border-bottom: 1px dashed #cbd5e1; padding: 6px 0; display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <div>
                        <strong>${item.name || 'Item'}</strong><br>
                        <span style="color: #64748b;">${item.quantity}x de R$ ${(item.price || 0).toFixed(2)}</span>
                    </div>
                    <div style="font-weight: 600; color: #1e293b; display: flex; align-items: center;">
                        R$ ${subtotal.toFixed(2)}
                    </div>
                </div>
            `;
        });
    } else {
        itemsHtml += '<p style="font-size: 0.85rem; color: #64748b; margin: 0;">Nenhum item detalhado salvo.</p>';
    }
    itemsHtml += '</div>';

    Swal.fire({
        title: `Resumo do Pedido`,
        html: `
            <div style="text-align: left; font-size: 0.95rem;">
                <p style="margin-bottom: 5px;"><strong>ID:</strong> ${orderId}</p>
                <p style="margin-bottom: 5px;"><strong>Cliente:</strong> ${order.client?.name || order.client_name || order.customer_name || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Data:</strong> ${new Date(order.created_at || order.date).toLocaleDateString('pt-BR')}</p>
                <p style="margin-bottom: 5px;"><strong>Total:</strong> <span style="color: #10b981; font-weight: bold;">R$ ${(order.total_amount || order.total || 0).toFixed(2)}</span></p>
                ${itemsHtml}
            </div>
            <div style="margin-top: 20px;">
                <button class="btn-primary" onclick="adminApp.downloadQuotePDF('${order.id}')" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 12px; font-size: 1rem; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border: none;">
                    <i class="ph-bold ph-file-pdf" style="font-size: 1.2rem;"></i> Baixar Orçamento em PDF
                </button>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 500
    });
};

adminApp.downloadQuotePDF = function (orderId) {
    const order = this.ordersData.find(o => o.id === orderId);
    if (!order) return;

    try {
        localStorage.setItem('mv_admin_print_data', JSON.stringify(order));
        window.open('pages/quote.html?source=admin', '_blank');
    } catch (e) {
        console.error("Error setting admin print data", e);
        Swal.fire('Erro', 'Não foi possível gerar o PDF.', 'error');
    }
};


adminApp.updateOrderStatus = function (orderId) {
    const order = this.ordersData.find(o => o.id === orderId);
    if (!order) return;

    Swal.fire({
        title: 'Atualizar Status',
        text: `Pedido: ${orderId}`,
        input: 'select',
        inputOptions: {
            'inquiry': 'Aguardando Aprovação',
            'approved': 'Aprovado',
            'production': 'Em Produção',
            'completed': 'Concluído'
        },
        inputValue: order.status || 'inquiry',
        showCancelButton: true,
        confirmButtonText: 'Atualizar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const { error } = await window.supabase
                    .from('protocols')
                    .update({ status: result.value, updated_at: new Date() })
                    .eq('id', orderId);

                if (error) throw error;

                Swal.fire('Atualizado!', 'Status do pedido atualizado com sucesso.', 'success');
                this.renderOrdersTable();
            } catch (err) {
                Swal.fire('Erro', `Falha ao atualizar: ${err.message}`, 'error');
            }
        }
    });
};

// Add CSS animation for spinner
if (!document.getElementById('kanban-styles')) {
    const style = document.createElement('style');
    style.id = 'kanban-styles';
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

//Global function for robustness - keeping global link for legacy calls
window.forceClearChats = function () {
    adminApp.forceClearChats();
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Structural Fix: Ensure #settings is directly inside .admin-main
    const settingsView = document.getElementById('settings');
    const main = document.querySelector('.admin-main');
    if (settingsView && main) {
        console.log('?? Moving Settings View to Main Root...');
        main.appendChild(settingsView);
    }

    // 2. Initialize
    await adminApp.init();

    // 3. Fallback Load
    if (adminApp.loadSettings) {
        // Optionally pre-load categories silently
        // adminApp.fetchCategories();
    }

    // 4. Sync Price Fields (General <-> Analysis)
    const generalPrice = document.getElementById('prod-price');
    const analysisPrice = document.getElementById('prod-price-analysis');

    if (generalPrice && analysisPrice) {
        // From General to Analysis
        generalPrice.addEventListener('input', (e) => {
            analysisPrice.value = e.target.value;
            if (adminApp && adminApp.calculateProfit) adminApp.calculateProfit();
        });

        // From Analysis to General
        analysisPrice.addEventListener('input', (e) => {
            generalPrice.value = e.target.value;
            if (adminApp && adminApp.calculateProfit) adminApp.calculateProfit();
        });
    }
});



// ============================================================
// ENTERPRISE PRODUCT CONFIGURATOR LOGIC
// ============================================================

adminApp.currentConfigRules = [];

adminApp.renderVariationBuilder = function () {
    const container = document.getElementById('configurator-groups-container');
    if (!container) return;

    container.innerHTML = '';

    if (!this.currentConfigRules || this.currentConfigRules.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; color:#cbd5e1; border:2px dashed #e2e8f0; border-radius:12px;">
                <i class="ph-duotone ph-sliders" style="font-size:2rem; margin-bottom:10px;"></i>
                <p>Nenhuma variação configurada.</p>
            </div>`;
        return;
    }

    this.currentConfigRules.forEach((group, groupIndex) => {
        const groupHtml = `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:12px; padding:15px; position:relative;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:15px;">
                <div style="display:flex; gap:10px; flex:1;">
                    <div style="flex:1;">
                        <label class="modal-label">Nome da Opção (Ex: Tipo de Capa)</label>
                        <input type="text" class="modal-input" value="${group.name || ''}" 
                            oninput="adminApp.updateConfigField(${groupIndex}, 'name', this.value)" placeholder="Nome">
                    </div>
                    <div style="width:150px;">
                        <label class="modal-label">Tipo</label>
                        <select class="modal-input" onchange="adminApp.updateConfigField(${groupIndex}, 'type', this.value)">
                            <option value="radio" ${group.type === 'radio' ? 'selected' : ''}>Seleção Única (Radio)</option>
                            <option value="select" ${group.type === 'select' ? 'selected' : ''}>Lista Suspensa</option>
                            <option value="checkbox" ${group.type === 'checkbox' ? 'selected' : ''}>Múltipla Escolha</option>
                        </select>
                    </div>
                </div>
                <button onclick="adminApp.removeConfigGroup(${groupIndex})" style="color:#ef4444; background:#fef2f2; border:none; width:30px; height:30px; border-radius:6px; cursor:pointer; margin-left:10px;">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </div>

            <div style="background:#f8fafc; padding:10px; border-radius:8px;">
                <label class="modal-label" style="font-size:0.8rem; color:#64748b;">VALORES DISPONÍVEIS</label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${group.options.map((opt, optIndex) => `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" class="modal-input" placeholder="Rótulo (Ex: Capa Dura)" value="${opt.label || ''}"
                            oninput="adminApp.updateConfigOptionField(${groupIndex}, ${optIndex}, 'label', this.value)" style="flex:2;">
                        
                        <div style="position:relative; flex:1;">
                            <span style="position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#94a3b8; font-size:0.8rem;">+R$</span>
                            <input type="number" class="modal-input" placeholder="0.00" value="${opt.price_mod || ''}"
                                oninput="adminApp.updateConfigOptionField(${groupIndex}, ${optIndex}, 'price_mod', this.value)" style="padding-left:35px;">
                        </div>

                        <button onclick="adminApp.removeConfigOption(${groupIndex}, ${optIndex})" style="color:#94a3b8; background:none; border:none; cursor:pointer; padding:5px;">
                            <i class="ph-bold ph-x"></i>
                        </button>
                    </div>
                    `).join('')}
                </div>
                <button onclick="adminApp.addConfigOption(${groupIndex})" style="margin-top:10px; font-size:0.8rem; color:var(--primary-hero); background:none; border:none; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                    <i class="ph-bold ph-plus"></i> Adicionar Valor
                </button>
            </div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', groupHtml);
    });
};

adminApp.addConfigGroup = function () {
    if (!this.currentConfigRules) this.currentConfigRules = [];
    this.currentConfigRules.push({
        id: crypto.randomUUID(),
        name: '',
        type: 'radio',
        options: [{ label: '', price_mod: 0 }]
    });
    this.renderVariationBuilder();
};

adminApp.removeConfigGroup = function (index) {
    Swal.fire({
        title: 'Remover Grupo?',
        text: 'Isso apagará todas as opções deste grupo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, remover'
    }).then((result) => {
        if (result.isConfirmed) {
            this.currentConfigRules.splice(index, 1);
            this.renderVariationBuilder();
        }
    });
};

adminApp.addConfigOption = function (groupIndex) {
    this.currentConfigRules[groupIndex].options.push({ label: '', price_mod: 0 });
    this.renderVariationBuilder();
};

adminApp.removeConfigOption = function (groupIndex, optIndex) {
    this.currentConfigRules[groupIndex].options.splice(optIndex, 1);
    this.renderVariationBuilder();
};

adminApp.updateConfigField = function (groupIndex, field, value) {
    this.currentConfigRules[groupIndex][field] = value;
};

adminApp.updateConfigOptionField = function (groupIndex, optIndex, field, value) {
    if (field === 'price_mod') value = parseFloat(value) || 0;
    this.currentConfigRules[groupIndex].options[optIndex][field] = value;
};

// Override / Update switchProductTab to include configurator
adminApp.switchProductTab = function (tabName) {
    // Hide all
    ['prod-tab-general', 'prod-tab-gallery', 'prod-tab-tiers', 'prod-tab-configurator'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Deactivate buttons
    document.querySelectorAll('.tabs-header .tab-btn').forEach(b => {
        b.classList.remove('active');
        b.style.color = '#94a3b8';
        b.style.borderBottom = 'none';
        b.style.fontWeight = 'normal'; // Reset weight
    });

    const targetId = `prod-tab-${tabName}`;
    const el = document.getElementById(targetId);
    if (el) {
        el.style.display = (tabName === 'general') ? 'flex' : 'block';
    }

    const btn = document.getElementById(`btn-tab-${tabName}`);
    if (btn) {
        btn.classList.add('active');
        btn.style.color = 'var(--primary-hero)';
        btn.style.borderBottom = '2px solid var(--primary-hero)';
        btn.style.fontWeight = '600';
    }
};

window.adminApp = adminApp;
