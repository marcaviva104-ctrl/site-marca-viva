/**
 * Marca Viva - Smart Admin Logic
 * Handles Cost Aggregation, Profit Analysis, and Real-time Publishing
 */

// admin.js

var adminApp = window.adminApp = {
    openDossier: async function(orderId) {
        // Removido Swal.close() explícito para permitir troca fluida de modais do SweetAlert
        if (typeof ProtocolDetailView === 'undefined') {
            Swal.fire('Erro Fatal', 'O arquivo do Dossiê não foi carregado corretamente no cache do navegador.', 'error');
            return;
        }

        try {
            Swal.fire({ title: 'Montando o Dossiê...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
            await ProtocolDetailView.open(orderId);
            Swal.close();
        } catch (e) {
            console.error("Erro ao abrir dossiê:", e);
            Swal.fire('Falha do Sistema', 'O Dossiê encontrou um problema: ' + e.message, 'error');
        }
    },

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

        // If user is neither admin nor employee, kick them out
        if (profile.role !== 'admin' && profile.role !== 'employee') {
            // DEBUG ALERT
            Swal.fire({
                icon: 'error',
                title: 'Acesso Negado',
                text: `Usuário: ${email} | Role: ${profile.role || 'null'}. Fale com o suporte.`,
                confirmButtonText: 'Ok, sair'
            }).then(() => {
                window.location.href = 'index.html';
            });
            return;
        }

        // --- EMPLOYEE MODE RESTRICTIONS ---
        if (profile.role === 'employee') {
            window.sessionStorage.setItem('marca_viva_user_role', 'employee'); // For Kanban logic later

            // Hide all tabs except orders
            allTabs.forEach(view => {
                if (view !== 'orders') {
                    const navItem = document.querySelector(`.nav-item[data-view="${view}"]`);
                    if (navItem) navItem.style.display = 'none';
                }
            });

            // Hide top financial bar, list toggle, and prices
            const extraStyles = document.createElement('style');
            extraStyles.innerHTML = `
                /* Hide top financial stats in dashboard/header */
                .stats-container, .finance-box { display: none !important; }
                /* Hide the toggle to view the order list */
                #kanban-toggle { display: none !important; }
                /* Hide prices on cards */
                .k-price, .financial-status { display: none !important; }
            `;
            document.head.appendChild(extraStyles);

            // Force directly into Kanban view
            setTimeout(() => {
                if (window.adminApp && window.adminApp.switchView) {
                    window.adminApp.switchView('orders');
                }
                const btnKanban = document.getElementById('btn-kanban-view');
                if (btnKanban) btnKanban.click();
            }, 300);

            return; // Stop applying standard admin permissions
        }

        // --- NORMAL ADMIN LOGIC ---
        window.sessionStorage.setItem('marca_viva_user_role', 'admin');
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

    /** Linhas da tabela + totais (PDF); usa o mesmo critério da lista financeira. */
    computeFinancialExportRows(data, payments) {
        const map = payments || {};
        let sumOrderPayments = 0;
        let sumExpenseOut = 0;
        let sumDebt = 0;
        const rows = (data || []).map((item) => {
            const paid = Number(map[item.id] ?? map[String(item.id)]) || 0;
            const total = Number(item.total) || 0;
            const debt = total - paid;
            if (item.type === 'expense') {
                sumExpenseOut += total;
            } else {
                sumOrderPayments += paid;
                if (debt > 0.01) sumDebt += debt;
            }
            let statusText = 'Pendente';
            if (item.type === 'expense') statusText = 'Despesa';
            else if (debt <= 0.01) statusText = 'Pago';
            return [
                this.financialPdfPlainText(item.id, 40),
                this.financialPdfPlainText(item.customer_name || 'Desconhecido', 48),
                statusText,
                `R$ ${total.toFixed(2)}`,
                `R$ ${paid.toFixed(2)}`,
                `R$ ${debt > 0 ? debt.toFixed(2) : '0.00'}`
            ];
        });
        return { rows, sumOrderPayments, sumExpenseOut, sumDebt };
    },

    getFinancialExportRecords() {
        return Array.isArray(this.lastFinancialRecords) ? this.lastFinancialRecords.slice() : [];
    },

    getFinancialExportMeta() {
        const s = this._lastFinancialStartDate;
        const e = this._lastFinancialEndDate;
        let periodLine = 'Período: abra o Financeiro e aguarde o carregamento da lista.';
        if (s instanceof Date && e instanceof Date && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
            periodLine = `Período: ${s.toLocaleDateString('pt-BR')} a ${e.toLocaleDateString('pt-BR')}`;
        }
        const st = this.currentStatusFilter || 'all';
        const fMap = { all: 'Todos', pending: 'A receber', paid: 'Pagos' };
        const filterLine = `Status na lista: ${fMap[st] || st}`;
        const q = (document.getElementById('financial-search')?.value || '').trim();
        const searchLine = q ? `Busca na lista: ${q}` : '';
        return { periodLine, filterLine, searchLine };
    },

    getFinancialExportFileSuffix() {
        const s = this._lastFinancialStartDate;
        const e = this._lastFinancialEndDate;
        if (s instanceof Date && e instanceof Date && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
            return `${this.formatFinDateLocal(s)}_a_${this.formatFinDateLocal(e)}`;
        }
        return new Date().toISOString().split('T')[0];
    },

    /** Retorna posição Y inicial da tabela (após cabeçalho). */
    drawFinancialPdfHeader(doc) {
        const meta = this.getFinancialExportMeta();
        let y = 22;
        doc.setFontSize(18);
        doc.text('Relatório Financeiro - Marca Viva', 14, y);
        y += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, y);
        y += 7;
        doc.text(meta.periodLine, 14, y);
        y += 6;
        doc.text(meta.filterLine, 14, y);
        y += 6;
        if (meta.searchLine) {
            doc.text(meta.searchLine, 14, y);
            y += 6;
        }
        doc.setTextColor(0, 0, 0);
        return y + 4;
    },

    // --- Feature 4: Financial Print/Download Report ---
    printFinancialReport() {
        const data = this.getFinancialExportRecords();
        const payments = this.lastPaymentsMap || {};

        if (!data.length) {
            return Swal.fire('Atenção', 'Não há dados para exportar. Abra o Financeiro e aguarde a lista.', 'warning');
        }

        try {
            // Check Libraries
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca jsPDF não carregada.');
            window.jsPDF = window.jspdf.jsPDF;

            const doc = new window.jsPDF();
            const tableStartY = this.drawFinancialPdfHeader(doc);
            const { rows, sumOrderPayments, sumExpenseOut, sumDebt } = this.computeFinancialExportRows(data, payments);

            // 3. Generate Table
            doc.autoTable({
                head: [['PEDIDO', 'CLIENTE', 'STATUS', 'TOTAL', 'JA PAGO', 'FALTA']],
                body: rows,
                startY: tableStartY,
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
            let finalY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const saldoPeriodo = sumOrderPayments - sumExpenseOut;
            doc.text(
                `Recebido em pedidos: R$ ${sumOrderPayments.toFixed(2)}  |  Despesas: R$ ${sumExpenseOut.toFixed(2)}  |  Saldo: R$ ${saldoPeriodo.toFixed(2)}`,
                14,
                finalY
            );
            finalY += 10;

            doc.setFillColor(241, 245, 249);
            doc.rect(120, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Saldo (pedidos - despesas)', 122, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(16, 185, 129);
            doc.text(`R$ ${saldoPeriodo.toFixed(2)}`, 122, finalY + 11);

            doc.setFillColor(241, 245, 249);
            doc.rect(165, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('A receber', 167, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(239, 68, 68);
            doc.text(`R$ ${sumDebt.toFixed(2)}`, 167, finalY + 11);

            // 5. Force Download with Correct Name (Anchor Trick)
            // This is the most reliable way to enforce the filename on Windows
            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);

            const fileName = `Relatorio_Financeiro_${this.getFinancialExportFileSuffix()}.pdf`;

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
                title: 'Download concluído',
                text: `Arquivo: ${fileName}`,
                icon: 'success',
                timer: 4000
            });


        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao gerar PDF. Verifique bloqueio de pop-ups.', 'error');
        }
    },

    // --- Feature 4 Fix: Preview Mode with Metadata ---
    // Escolha: ver no navegador ou baixar o PDF (generateFinancialPDF trata cada ação).
    printFinancialReportPreview() {
        const data = this.getFinancialExportRecords();
        if (!data.length) {
            return Swal.fire('Atenção', 'Não há dados para exportar. Carregue a lista financeira ou ajuste os filtros.', 'warning');
        }

        Swal.fire({
            title: 'Exportar relatório',
            html:
                '<p style="margin:0 0 10px;color:#475569;font-size:0.95rem;">O PDF usa os lançamentos <strong>visíveis agora</strong> na tabela.</p>' +
                '<p style="margin:0;color:#64748b;font-size:0.875rem;">Prefere só conferir no navegador ou salvar o arquivo?</p>',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            focusConfirm: false,
            confirmButtonText: 'Baixar PDF',
            denyButtonText: 'Ver na tela',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#3b82f6',
            cancelButtonColor: '#94a3b8',
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                this.generateFinancialPDF('download');
            } else if (result.isDenied) {
                this.generateFinancialPDF('preview');
            }
        });
    },

    async generateFinancialPDF(action) {
        const data = this.getFinancialExportRecords();
        const payments = this.lastPaymentsMap || {};

        if (!data.length) {
            return Swal.fire('Atenção', 'Não há dados para exportar. Carregue a lista financeira.', 'warning');
        }

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) throw new Error('Biblioteca jsPDF não carregada.');
            window.jsPDF = window.jspdf.jsPDF;

            const doc = new window.jsPDF();
            const tableStartY = this.drawFinancialPdfHeader(doc);
            const { rows, sumOrderPayments, sumExpenseOut, sumDebt } = this.computeFinancialExportRows(data, payments);

            doc.autoTable({
                head: [['PEDIDO', 'CLIENTE', 'STATUS', 'TOTAL', 'JA PAGO', 'FALTA']],
                body: rows,
                startY: tableStartY,
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

            let finalY = doc.lastAutoTable.finalY + 8;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            const saldoPeriodoPdf = sumOrderPayments - sumExpenseOut;
            doc.text(
                `Recebido em pedidos: R$ ${sumOrderPayments.toFixed(2)}  |  Despesas: R$ ${sumExpenseOut.toFixed(2)}  |  Saldo: R$ ${saldoPeriodoPdf.toFixed(2)}`,
                14,
                finalY
            );
            finalY += 10;

            doc.setFillColor(241, 245, 249);
            doc.rect(120, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Saldo (pedidos - despesas)', 122, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(16, 185, 129);
            doc.text(`R$ ${saldoPeriodoPdf.toFixed(2)}`, 122, finalY + 11);

            doc.setFillColor(241, 245, 249);
            doc.rect(165, finalY, 40, 15, 'F');
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('A receber', 167, finalY + 5);
            doc.setFontSize(11);
            doc.setTextColor(239, 68, 68);
            doc.text(`R$ ${sumDebt.toFixed(2)}`, 167, finalY + 11);

            const fileName = `Relatorio_Financeiro_${this.getFinancialExportFileSuffix()}.pdf`;

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
                            title: 'Salvo com sucesso',
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
            } else if (action === 'preview' || action === 'view') {
                doc.setProperties({ title: fileName });
                const blobUrl = doc.output('bloburl');
                // Não passar "noopener" na 3ª opção: em vários browsers isso faz window.open retornar null mesmo com sucesso.
                const win = window.open(blobUrl, '_blank');
                if (win == null) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Não foi possível abrir a visualização',
                        text: 'O navegador pode ter bloqueado a nova aba. Permita pop-ups para este site ou use Baixar PDF.',
                        confirmButtonColor: '#3b82f6'
                    });
                }
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao gerar PDF. Verifique bloqueio de pop-ups.', 'error');
        }
    },

    async init() {
        console.info('[admin] admin.js v30 — Pedidos: filtro de datas recarrega lista; KPI inclui aprovados (protocols v30). Ctrl+Shift+R se precisar.');
        console.log("AdminApp: Starting initialization...");

        // Explicit Global Export (Handled by Object.assign at end of file)
        // window.adminApp = this; // REMOVED: Wipes out functions from other modules!

        // 0. Load Local Settings first
        this.loadSettings();
        this.loadTheme();

        // 1. Bind UI immediately so tabs work even during loading
        this.bindNav();

        // 2–3. Catálogo (produtos/insumos) + conexão + auth em PARALELO — antes era sequencial e somava os tempos.
        try {
            const dmInit =
                typeof dataManager !== 'undefined'
                    ? dataManager.init().finally(() => {
                          try {
                              this.updateInventoryBadge();
                          } catch (e) { /* */ }
                      })
                    : Promise.resolve();

            await Promise.all([dmInit, this.checkConnection(), this.checkAuth()]);
        } catch (e) {
            console.error("Auth check failed:", e);
        }

        this.updateInventoryBadge();

        const clearBtn = document.getElementById('btn-clear-chats');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllChats());
        }
        const chatSearch = document.getElementById('admin-chat-search');
        if (chatSearch && !chatSearch.dataset.bound) {
            chatSearch.dataset.bound = '1';
            let t;
            chatSearch.addEventListener('input', () => {
                clearTimeout(t);
                t = setTimeout(() => this.loadChatList(), 200);
            });
        }
        const chatInput = document.getElementById('admin-chat-input');
        if (chatInput && !chatInput.dataset.enterBound) {
            chatInput.dataset.enterBound = '1';
            chatInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.sendAdminMessage();
                }
            });
        }

        this.bindFinancialTableDelegation();
        this.bindFinancialSectionControls();
        this.resetFinancialPeriodToCurrentMonth();
        this.bindInventoryOverviewDelegation();
        this.bindInventoryHistoryFilter();
        this.bindInventorySearchControl();
        this.bindInventoryFilterModeToolbar();
        this.bindStockModalA11y();

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

        // Pré-aquece rotas usadas pelo admin (cold start do projeto no Supabase)
        const runPrewarm = () => {
            if (!window.supabase?.from) return;
            void Promise.all([
                window.supabase.from('protocols').select('id').limit(1),
                window.supabase.from('order_payments').select('id').limit(1)
            ]).then(
                () => {},
                () => {}
            );
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(runPrewarm, { timeout: 2000 });
        } else {
            setTimeout(runPrewarm, 150);
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

        if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
            console.warn("Admin: Liberação local emergencial ativa.");
            this.switchView('dashboard');
            return;
        }

        const tempUntil = parseInt(sessionStorage.getItem('mv_temp_admin_until') || '0', 10);
        if (sessionStorage.getItem('mv_temp_admin') === '1' && tempUntil > Date.now()) {
            console.warn("Admin: Acesso temporário (PIN) — sem sessão Supabase.");
            this.switchView('dashboard');
            return;
        }

        // Bypass temporário para desenvolvimento local (localhost only)
        const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
        const devBypassEnabled = localStorage.getItem('mv_dev_admin_bypass') === '1';
        if (isLocalHost && devBypassEnabled) {
            console.warn("Admin: Local dev bypass enabled.");
            this.switchView('dashboard');
            return;
        }

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
            this.switchView('dashboard');
            return;
        }

        // Unauthorized access must be blocked in production.
        console.warn("Admin: Unauthorized access attempt or Auth System offline.");
        alert('Acesso negado: area restrita.');
        window.location.href = '../pages/login.html';
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
            
            // Scroll to top of main container to avoid empty space from tall previous tabs
            const mainContainer = document.querySelector('.admin-main');
            if (mainContainer) {
                mainContainer.scrollTop = 0;
            }
        }

        try {
            if (vid === 'inputs') this.renderInputsTable();
            if (vid === 'products') this.renderProductsTable();
            if (vid === 'dashboard') this.renderDashboard();
            if (vid === 'inventory') {
                this._inventoryOverviewMode = 'all';
                this._inventorySearchTerm = '';
                const invSearch = document.getElementById('inventory-search');
                if (invSearch) invSearch.value = '';
                void this.renderInventoryView({ isBackground: false });
            }
            if (vid === 'orders') {
                if (typeof ProtocolsManager !== 'undefined' && ProtocolsManager.clearAdvancedFilters) {
                    ProtocolsManager.clearAdvancedFilters({ reload: false });
                }
                this.renderOrdersTable();
            }
            if (vid === 'messages') this.renderMessagesView();
            if (vid === 'financial') this.renderFinancial();
            if (vid === 'settings') this.loadSettings();
            if (vid === 'customers') CRMManager.loadCustomers();
            if (vid === 'users') this.fetchUsers();
        } catch (e) {
            console.error("View Switch Error:", e);
            alert("Erro ao trocar aba: " + e.message);
        }
    },



    // --- Module 5: Internal Chat (Phase 4) ---
    renderMessagesView() {
        this.lastChatStr = SafeStorage.getItem('mv_chats') || '';
        this.loadChatList();
        // Start polling for new messages if view is active
        if (this.chatInterval) clearInterval(this.chatInterval);
        this.chatInterval = setInterval(() => {
            const messagesView = document.getElementById('messages');
            if (messagesView && messagesView.classList.contains('active')) {
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

    parseMvChats() {
        try {
            const raw = SafeStorage.getItem('mv_chats');
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            console.warn('mv_chats inválido, ignorando.', e);
            return {};
        }
    },

    escapeChatHtml(value) {
        return (value || '')
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    normalizeChatSearchText(s) {
        return (s || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    },

    loadChatList() {
        const list = document.getElementById('admin-chat-list');
        if (!list) return;

        const chats = this.parseMvChats();
        const q = this.normalizeChatSearchText(
            (document.getElementById('admin-chat-search') && document.getElementById('admin-chat-search').value) || ''
        );

        const entries = Object.keys(chats)
            .map((email) => {
                const chat = chats[email];
                const messages = Array.isArray(chat.messages) ? chat.messages : [];
                const lastMsg = messages.length ? messages[messages.length - 1] : { text: '', timestamp: 0 };
                const ts = Number(lastMsg.timestamp) || 0;
                return { email, chat, lastMsg, ts };
            })
            .filter(({ email, chat }) => {
                if (!q) return true;
                const name = this.normalizeChatSearchText(chat.userName || '');
                const mail = this.normalizeChatSearchText(email);
                const preview = this.normalizeChatSearchText((chat.messages || []).slice(-1)[0]?.text || '');
                return name.includes(q) || mail.includes(q) || preview.includes(q);
            })
            .sort((a, b) => b.ts - a.ts);

        if (entries.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">Nenhuma conversa neste filtro.</p>';
            return;
        }

        list.innerHTML = '';
        entries.forEach(({ email, chat, lastMsg }) => {
            const isActive = this.activeChatEmail === email;
            const row = document.createElement('div');
            row.style.cssText = `padding: 15px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition:0.2s; ${isActive ? 'background: #f1f5f9;' : ''}`;
            row.addEventListener('mouseenter', () => { row.style.background = '#f8fafc'; });
            row.addEventListener('mouseleave', () => { row.style.background = isActive ? '#f1f5f9' : 'white'; });
            row.addEventListener('click', () => this.openChat(email));

            const top = document.createElement('div');
            top.style.cssText = 'display:flex; justify-content:space-between; margin-bottom:4px;';
            const nameEl = document.createElement('span');
            nameEl.style.cssText = 'font-weight:600; color:#1e293b;';
            nameEl.textContent = chat.userName || 'Cliente';
            top.appendChild(nameEl);
            if (chat.unread > 0) {
                const badge = document.createElement('span');
                badge.style.cssText = 'background:var(--accent-orange); color:white; font-size:0.7rem; padding:2px 6px; border-radius:10px;';
                badge.textContent = String(chat.unread);
                top.appendChild(badge);
            }
            row.appendChild(top);

            const preview = document.createElement('div');
            preview.style.cssText = 'font-size:0.8rem; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
            preview.textContent = lastMsg.text || '';
            row.appendChild(preview);

            const meta = document.createElement('div');
            meta.style.cssText = 'font-size:0.7rem; color:#94a3b8; margin-top:4px;';
            const t = Number(lastMsg.timestamp) || 0;
            meta.textContent = `${t ? new Date(t).toLocaleString() : '—'} · ${email}`;
            row.appendChild(meta);

            list.appendChild(row);
        });
    },

    activeChatEmail: null,

    openChat(email) {
        this.activeChatEmail = email;
        const chats = this.parseMvChats();
        const chat = chats[email];

        if (!chat) return;

        const userEl = document.getElementById('active-chat-user');
        const statusEl = document.getElementById('active-chat-status');
        if (userEl) userEl.textContent = `${chat.userName || 'Cliente'} (${email})`;
        if (statusEl) statusEl.textContent = 'Online (local)';
        const inp = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-chat-send-btn');
        if (inp) inp.disabled = false;
        if (sendBtn) sendBtn.disabled = false;

        const container = document.getElementById('admin-chat-messages');
        if (!container) return;

        const messages = Array.isArray(chat.messages) ? chat.messages : [];
        container.innerHTML = messages.map((m) => {
            const isAdmin = m.sender === 'admin';
            const align = isAdmin ? 'flex-end' : 'flex-start';
            const bg = isAdmin ? '#e0f2fe' : 'white';
            const border = isAdmin ? '#bae6fd' : '#e2e8f0';
            const color = isAdmin ? '#0369a1' : '#334155';
            const safe = this.escapeChatHtml(m.text);
            return `
            <div style="max-width:70%; border-radius:8px; padding:10px; font-size:0.9rem; align-self: ${align}; background: ${bg}; border: 1px solid ${border}; color: ${color}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ${safe}
            </div>`;
        }).join('');

        container.scrollTop = container.scrollHeight;

        if (chat.unread > 0) {
            chat.unread = 0;
            SafeStorage.setItem('mv_chats', JSON.stringify(chats));
            this.lastChatStr = SafeStorage.getItem('mv_chats') || '';
        }
    },

    sendAdminMessage() {
        if (!this.activeChatEmail) return;
        const input = document.getElementById('admin-chat-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        const chats = this.parseMvChats();
        if (!chats[this.activeChatEmail]) return;
        if (!Array.isArray(chats[this.activeChatEmail].messages)) {
            chats[this.activeChatEmail].messages = [];
        }

        chats[this.activeChatEmail].messages.push({
            sender: 'admin',
            text: text,
            timestamp: Date.now()
        });

        SafeStorage.setItem('mv_chats', JSON.stringify(chats));
        this.lastChatStr = SafeStorage.getItem('mv_chats') || '';
        input.value = '';
        this.openChat(this.activeChatEmail);
        this.loadChatList();
    },

    clearAllChats() {
        if (!confirm('Apagar todas as conversas salvas neste navegador? Isso nao pode ser desfeito.')) return;
        SafeStorage.removeItem('mv_chats');
        this.lastChatStr = '';
        this.activeChatEmail = null;
        this.loadChatList();
        const msgBox = document.getElementById('admin-chat-messages');
        if (msgBox) msgBox.innerHTML = '';
        const userEl = document.getElementById('active-chat-user');
        const statusEl = document.getElementById('active-chat-status');
        if (userEl) userEl.textContent = 'Selecione uma conversa';
        if (statusEl) statusEl.textContent = '-';
        const inp = document.getElementById('admin-chat-input');
        const sendBtn = document.getElementById('admin-chat-send-btn');
        if (inp) { inp.value = ''; inp.disabled = true; }
        if (sendBtn) sendBtn.disabled = true;
        const search = document.getElementById('admin-chat-search');
        if (search) search.value = '';
    },


    // --- Module 1: Inputs (Insumos) ---
    openInputModal() {
        document.getElementById('modal-input').classList.add('open');
        const titleEl = document.getElementById('input-modal-title');
        if (titleEl) titleEl.textContent = 'Novo insumo';
        const setVal = (id, value = '') => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        const setChk = (id, checked = false) => {
            const el = document.getElementById(id);
            if (el) el.checked = checked;
            return el;
        };
        setVal('input-id', '');
        setVal('input-name', '');
        setVal('input-internal-code', '');
        setVal('input-supplier', '');
        setVal('input-cost', '');
        setVal('input-unit', 'un');
        setVal('input-min-stock', 5);
        const noMinEl = setChk('check-no-min-stock', false);
        if (noMinEl) this.toggleMinStockInput(noMinEl);
        this.clearInputFieldErrors();
        const saveBtn = document.getElementById('input-save-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar insumo';
            saveBtn.style.opacity = '1';
        }
        const firstInput = document.getElementById('input-name');
        if (firstInput) setTimeout(() => firstInput.focus(), 30);
        if (typeof this.bindInputModalShortcuts === 'function') this.bindInputModalShortcuts();
    },

    openInputModalForEdit(id) {
        this.openInputModal();
        const inputs = (typeof dataManager !== 'undefined' && dataManager.getInputs)
            ? (dataManager.getInputs() || [])
            : [];
        const item = inputs.find((i) => String(i.id) === String(id));
        if (!item) {
            Swal.fire({
                icon: 'error',
                title: 'Insumo não encontrado',
                text: 'O item pode ter sido removido. Atualize a lista e tente de novo.'
            });
            const mi = document.getElementById('modal-input');
            if (mi) mi.classList.remove('open');
            return;
        }
        const titleEl = document.getElementById('input-modal-title');
        if (titleEl) titleEl.textContent = 'Editar insumo';
        const setVal = (fid, value = '') => {
            const el = document.getElementById(fid);
            if (el) el.value = value;
        };
        setVal('input-id', item.id);
        setVal('input-name', item.name || '');
        setVal('input-internal-code', (item.internal_code && String(item.internal_code).trim()) || '');
        const sup = String(item.supplier || '').trim();
        setVal('input-supplier', /^n\/a$/i.test(sup) ? '' : item.supplier || '');
        const costNum = parseFloat(item.cost);
        setVal('input-cost', Number.isFinite(costNum) ? costNum.toFixed(2) : '');
        setVal('input-unit', item.unit || 'un');
        const msRaw = item.minStock != null ? item.minStock : item.min_stock;
        const ms = parseFloat(msRaw);
        const noMin = !Number.isFinite(ms) || ms <= 0;
        const chk = document.getElementById('check-no-min-stock');
        if (chk) {
            chk.checked = noMin;
            this.toggleMinStockInput(chk);
        }
        if (!noMin) setVal('input-min-stock', ms);
        this.clearInputFieldErrors();
        if (typeof this.bindInputModalShortcuts === 'function') this.bindInputModalShortcuts();
    },

    normalizeInputNameForCompare(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    },

    findDuplicateInputByName(name, excludeId) {
        const norm = this.normalizeInputNameForCompare(name);
        if (!norm) return null;
        const inputs = (typeof dataManager !== 'undefined' && dataManager.getInputs)
            ? (dataManager.getInputs() || [])
            : [];
        return (
            inputs.find((i) => {
                if (excludeId && String(i.id) === String(excludeId)) return false;
                return this.normalizeInputNameForCompare(i.name) === norm;
            }) || null
        );
    },

    normalizeInputInternalCode(str) {
        let s = String(str || '').trim().toUpperCase().replace(/\s+/g, '');
        if (s.length > 40) s = s.slice(0, 40);
        return s;
    },

    findDuplicateInputByInternalCode(code, excludeId) {
        const norm = this.normalizeInputInternalCode(code);
        if (!norm) return null;
        const inputs = (typeof dataManager !== 'undefined' && dataManager.getInputs)
            ? (dataManager.getInputs() || [])
            : [];
        return (
            inputs.find((i) => {
                if (excludeId && String(i.id) === String(excludeId)) return false;
                const ic = this.normalizeInputInternalCode(i.internal_code || '');
                return ic && ic === norm;
            }) || null
        );
    },

    _onInputModalKeydown(e) {
        const mi = document.getElementById('modal-input');
        if (!mi || !mi.classList.contains('open')) return;
        if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (typeof this.closeModals === 'function') this.closeModals();
            return;
        }
        if (e.key !== 'Enter') return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const t = e.target;
        if (!t || !mi.contains(t)) return;
        if (t.tagName === 'TEXTAREA') return;
        e.preventDefault();
        e.stopPropagation();
        if (typeof this.saveInput === 'function') this.saveInput();
    },

    bindInputModalShortcuts() {
        if (this._inputModalShortcutsBound) return;
        this._inputModalKeydownRef = this._onInputModalKeydown.bind(this);
        document.addEventListener('keydown', this._inputModalKeydownRef, true);
        this._inputModalShortcutsBound = true;
    },

    unbindInputModalShortcuts() {
        if (!this._inputModalShortcutsBound || !this._inputModalKeydownRef) return;
        document.removeEventListener('keydown', this._inputModalKeydownRef, true);
        this._inputModalKeydownRef = null;
        this._inputModalShortcutsBound = false;
    },

    async cleanupInputs() {
        // Whitelist provided by user
        const keep = [
            "papel fotografico adesivo 180g",
            "bopp fosco",
            "tinta papel fotografico"
        ];

        const inputs = dataManager.getInputs();
        const toDelete = inputs.filter(i => {
            const name = i.name.toLowerCase().trim();
            // Keep if name loosely matches any whitelist item
            return !keep.some(k => name.includes(k) || k.includes(name));
        });

        if (toDelete.length === 0) {
            alert("Nenhum item para excluir. A lista ja esta limpa.");
            return;
        }

        if (!confirm(`[ATENCAO] Isso vai apagar ${toDelete.length} insumos e manter apenas os 3 solicitados. Tem certeza?`)) return;

        let count = 0;
        for (const item of toDelete) {
            await dataManager.deleteInput(item.id);
            count++;
        }

        this.renderInputsTable();
        alert(`Limpeza concluida. ${count} itens foram removidos.`);
    },

    toggleMinStockInput(checkbox) {
        const input = document.getElementById('input-min-stock');
        if (!input) return;
        if (checkbox.checked) {
            input.disabled = true;
            input.value = 0; // Visual only (saved as 0)
            input.style.opacity = '0.5';
        } else {
            input.disabled = false;
            input.style.opacity = '1';
        }
    },

    closeModals() {
        const mp = document.getElementById('modal-product');
        if (mp && mp.classList.contains('open') && typeof this.isProductModalDirty === 'function' && this.isProductModalDirty()) {
            Swal.fire({
                icon: 'warning',
                title: 'Descartar alterações?',
                text: 'Há alterações não salvas neste produto.',
                showCancelButton: true,
                confirmButtonText: 'Sair sem salvar',
                cancelButtonText: 'Continuar editando',
                reverseButtons: true
            }).then((r) => {
                if (r.isConfirmed) this.forceCloseAllModals();
            });
            return;
        }
        this.forceCloseAllModals();
    },

    forceCloseAllModals() {
        if (typeof this.unbindProductModalUx === 'function') this.unbindProductModalUx();
        if (typeof this.unbindInputModalShortcuts === 'function') this.unbindInputModalShortcuts();
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    },

    serializeProductFormState() {
        const v = (id) => {
            const el = document.getElementById(id);
            return el ? String(el.value) : '';
        };
        const c = (id) => {
            const el = document.getElementById(id);
            return el && el.checked ? '1' : '0';
        };
        const tb = document.getElementById('tiers-list-body');
        const tiersSig = tb ? tb.innerText.replace(/\s+/g, ' ').trim().slice(0, 800) : '';
        const recipe = this.tempRecipeState && this.tempRecipeState.size
            ? Array.from(this.tempRecipeState.entries())
                .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
                .map(([k, q]) => k + ':' + q)
                .join('|')
            : '';
        const gal = (this.galleryUrls && this.galleryUrls.length) ? this.galleryUrls.join(',') : '';
        const galPending = (this.galleryFiles && this.galleryFiles.length) ? String(this.galleryFiles.length) : '0';
        const varsSig = (this.currentVariations || [])
            .map((row) => `${String(row.name || '').trim()}:${parseInt(row.stock, 10) || 0}`)
            .sort()
            .join('|');
        return [
            v('prod-id'), v('prod-name'), v('prod-description'), v('prod-sku'), v('prod-category'), v('prod-subcategory'),
            v('prod-price-analysis'), v('prod-stock'), v('prod-min-stock'), v('prod-min-order'),
            c('check-no-min-stock'), c('check-no-min-order'), c('prod-has-variations'), c('check-is-variable'),
            v('prod-var-bw'), v('prod-var-bw-heavy'), v('prod-var-color'), v('prod-var-color-heavy'),
            v('prod-weight'), v('prod-height'), v('prod-width'), v('prod-length'), v('prod-tempo-producao'),
            v('prod-ncm'), v('prod-tax-rate'), v('prod-tags'),
            c('prod-new'), c('prod-featured'),
            recipe, gal, galPending, tiersSig, varsSig
        ].join('\u001e');
    },

    markProductModalClean() {
        this._productModalBaseline = this.serializeProductFormState();
    },

    isProductModalDirty() {
        return this._productModalBaseline != null && this.serializeProductFormState() !== this._productModalBaseline;
    },

    _onProductModalKeydown(e) {
        const mp = document.getElementById('modal-product');
        if (!mp || !mp.classList.contains('open')) return;
        if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (typeof adminApp.closeModals === 'function') adminApp.closeModals();
            return;
        }
        const saveCombo = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
        const saveEnter = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
        if (saveCombo || saveEnter) {
            e.preventDefault();
            if (typeof adminApp.saveProduct === 'function') adminApp.saveProduct();
        }
    },

    bindProductModalUx() {
        if (this._productModalUxBound) return;
        this._productModalKeydownRef = this._onProductModalKeydown.bind(this);
        document.addEventListener('keydown', this._productModalKeydownRef, true);
        this._productModalUxBound = true;
    },

    unbindProductModalUx() {
        if (!this._productModalUxBound) return;
        if (this._productModalKeydownRef) {
            document.removeEventListener('keydown', this._productModalKeydownRef, true);
            this._productModalKeydownRef = null;
        }
        this._productModalUxBound = false;
    },

    scheduleProductModalReadyFocus() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const el = document.getElementById('prod-name');
                if (el && document.getElementById('modal-product')?.classList.contains('open')) {
                    try { el.focus(); el.select(); } catch (err) { /* ignore */ }
                }
            });
        });
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

    filterInputsAdmin() {
        this.renderInputsTable(false);
    },

    async renderInputsTable(forceFetch = true) {
        const tbody = document.getElementById('inputs-table-body');
        if (!tbody) return;
        // Fetch fresh data from Cloud
        if (forceFetch && window.dataManager) await dataManager.fetchInputs();
        let inputs = dataManager.getInputs();
        if (!inputs) return; // robustness

        // Aplica filtro local em tempo real
        const searchInput = document.getElementById('input-search-admin');
        if (searchInput && searchInput.value) {
            const val = searchInput.value.toLowerCase().trim();
            inputs = inputs.filter((i) => {
                const nm = (i.name || '').toLowerCase();
                const sup = (i.supplier || '').toLowerCase();
                const ic = String(i.internal_code || '').toLowerCase();
                return nm.includes(val) || sup.includes(val) || ic.includes(val);
            });
        }

        const esc = (s) => String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');

        tbody.innerHTML = inputs.map(i => {
            const stock = parseFloat(i.stock) || 0;
            const minStock = i.minStock != null ? i.minStock : (i.min_stock != null ? i.min_stock : 5);
            const status = dataManager.getStockStatus({
                ...i,
                stock,
                minStock: minStock === 0 ? 0 : minStock
            });
            const iconOk = '<i class="ph-bold ph-check-circle" style="color:#10b981;" title="Estoque OK" aria-hidden="true"></i>';
            const stockStatusIcon = {
                ok: iconOk,
                low: '<i class="ph-bold ph-warning" style="color:#f59e0b;" title="Estoque baixo" aria-hidden="true"></i>',
                critical: '<i class="ph-bold ph-warning-circle" style="color:#ea580c;" title="Estoque crítico" aria-hidden="true"></i>',
                out: '<i class="ph-bold ph-x-circle" style="color:#ef4444;" title="Sem estoque" aria-hidden="true"></i>'
            }[status] || iconOk;

            const parsedCost = parseFloat(i.cost);
            const safeCost = Number.isFinite(parsedCost) ? parsedCost : 0;
            const hasBadCost = !Number.isFinite(parsedCost) || parsedCost <= 0;
            const isLowStock = minStock > 0 && stock > 0 && stock <= minStock;
            const codeDisp = (i.internal_code && String(i.internal_code).trim()) ? esc(String(i.internal_code).trim()) : '—';

            return `
            <tr>
                <td><strong>${esc(i.name)}</strong></td>
                <td><span class="mv-input-code-cell">${codeDisp}</span></td>
                <td><span style="font-size:0.8rem;color:#64748b;">${esc(i.supplier || '-')}</span></td>
                <td>${esc(i.unit || 'un')}</td>
                <td>
                    R$ ${safeCost.toFixed(2)}
                    ${hasBadCost ? '<span class="mv-input-badge mv-input-badge--warn">Revisar</span>' : ''}
                </td>
                <td>
                    <span style="font-weight:600;display:inline-flex;align-items:center;gap:6px;">${stockStatusIcon}<span>${stock} ${esc(i.unit || 'un')}</span></span>
                    <span style="font-size:0.75rem;color:#94a3b8;display:block;">${minStock === 0 ? 'Sem mínimo' : `Min: ${minStock}`}</span>
                    ${isLowStock ? '<span class="mv-input-badge mv-input-badge--danger">Abaixo do mínimo</span>' : ''}
                </td>
                <td>
                    <button type="button" onclick="adminApp.openInputModalForEdit(${JSON.stringify(String(i.id))})" title="Editar insumo"
                        style="color:#6366f1;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                    <button onclick="adminApp.openStockEntry('${i.id}')" title="Entrada de Estoque" 
                        style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:5px;">
                        <i class="ph-bold ph-arrow-down-left"></i>
                    </button>
                    <button onclick="adminApp.openStockAdjust('${i.id}')" title="Saída / perda" 
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
        this.updateInventoryBadge();
    },

    deleteInput(id) {
        this.showConfirm('Excluir este insumo?', 'Isso removerá o item do estoque permanentemente.', async () => {
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
    async populateProductCategories() {
        try {
            // 1. Fetch Categories from Supabase or LocalStorage
            let categories = [];
            if (window.supabase) {
                const { data, error } = await window.supabase.from('categories').select('*').order('name');
                if (!error && data && data.length > 0) categories = data;
            }
            if (!categories || categories.length === 0) {
                const stored = localStorage.getItem('mv_categories');
                if (stored) categories = JSON.parse(stored);
            }

            this.fullCategoriesList = categories;

            // Pega o select unificado
            const selectCat = document.getElementById('prod-category');
            if (!selectCat) return;

            // Separa em Mães e Filhas
            const roots = categories.filter(c => !c.parent_id);

            let html = '<option value="">Selecione a Categoria Principal...</option>';
            
            roots.forEach(root => {
                html += `<option value="${root.name}">${root.name}</option>`;
            });

            selectCat.innerHTML = html;
            
            const subSelect = document.getElementById('prod-subcategory');
            if (subSelect) {
                subSelect.innerHTML = '<option value="">Selecione a Categoria Principal primeiro...</option>';
            }
            selectCat.disabled = false; // Habilita final
            selectCat.style.borderColor = "#cbd5e1";
            selectCat.style.background = "#ffffff";
            
        } catch (e) {
            console.error("Error populating categories:", e);
        }
    },

    resetModal() {
        this._productModalBaseline = null;
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

        // Reset campos fiscais
        setVal('prod-ncm');
        setVal('prod-tax-rate', '');


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
                const sum = (this.currentVariations || []).reduce(
                    (acc, row) => acc + (Math.max(0, parseInt(row.stock, 10)) || 0),
                    0
                );
                const stockInput = document.getElementById('prod-stock');
                if (stockInput && sum > 0) stockInput.value = String(sum);
            }
        }
        if (isChecked && typeof this.renderVariations === 'function') this.renderVariations();
    },

    addVariation() {
        if (!this.currentVariations) this.currentVariations = [];
        const nameEl = document.getElementById('var-name');
        const stockEl = document.getElementById('var-stock');
        if (!nameEl) return;
        const name = (nameEl.value || '').trim();
        if (!name) {
            Swal.fire('Atenção', 'Informe o nome da variação (ex.: Azul P, Preto, Rosa M).', 'warning');
            return;
        }
        const key = name.toLowerCase();
        if ((this.currentVariations || []).some((v) => String(v.name || '').trim().toLowerCase() === key)) {
            Swal.fire('Atenção', 'Já existe uma variação com esse nome. Use um nome único por opção.', 'warning');
            return;
        }
        const stock = Math.max(0, parseInt(stockEl && stockEl.value, 10) || 0);
        this.currentVariations.push({ name, stock });
        nameEl.value = '';
        if (stockEl) stockEl.value = '';
        if (typeof this.renderVariations === 'function') this.renderVariations();
        nameEl.focus();
    },

    removeVariation(index) {
        if (!this.currentVariations || index < 0 || index >= this.currentVariations.length) return;
        this.currentVariations.splice(index, 1);
        if (typeof this.renderVariations === 'function') this.renderVariations();
    },

    renderVariations() {
        const list = document.getElementById('variations-list');
        const totalEl = document.getElementById('var-total-stock');
        if (!list) return;
        const rows = this.currentVariations || [];
        const esc = (s) =>
            String(s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/"/g, '&quot;');
        if (rows.length === 0) {
            list.innerHTML =
                '<div style="color:#94a3b8;font-size:0.8rem;text-align:center;padding:8px;">Nenhuma variação. Informe o nome (cor/tamanho) e a quantidade, depois clique em +.</div>';
        } else {
            list.innerHTML = rows
                .map(
                    (v, i) => `
                <div style="display:flex;align-items:center;gap:8px;background:#fff;padding:8px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <span style="flex:2;font-weight:600;color:#334155;">${esc(v.name)}</span>
                    <span style="color:#64748b;font-size:0.85rem;">Qtd: <b>${Math.max(0, parseInt(v.stock, 10) || 0)}</b></span>
                    <button type="button" onclick="adminApp.removeVariation(${i})" style="color:#ef4444;background:#fef2f2;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:0.75rem;">Remover</button>
                </div>`
                )
                .join('');
        }
        const sum = rows.reduce((acc, v) => acc + (Math.max(0, parseInt(v.stock, 10)) || 0), 0);
        if (totalEl) totalEl.textContent = String(sum);
        const stockInput = document.getElementById('prod-stock');
        const hasVar = document.getElementById('prod-has-variations')?.checked;
        if (stockInput && hasVar) stockInput.value = String(sum);
    },

    toggleVariablePricing() {
        const isChecked = document.getElementById('check-is-variable').checked;
        const group = document.getElementById('var-pricing-group');
        if (group) {
            group.style.display = isChecked ? 'block' : 'none';
        }
    },

    clearInputFieldErrors() {
        ['input-name', 'input-internal-code', 'input-cost', 'input-unit', 'input-min-stock'].forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.classList.remove('mv-field-error');
            el.removeAttribute('aria-invalid');
        });
    },

    markInputFieldError(id) {
        const el = document.getElementById(id);
        if (!el) return null;
        el.classList.add('mv-field-error');
        el.setAttribute('aria-invalid', 'true');
        return el;
    },

    setInputSaveButtonLoading(isLoading) {
        const btn = document.getElementById('input-save-btn');
        if (!btn) return;
        btn.disabled = !!isLoading;
        btn.innerHTML = isLoading
            ? '<i class="ph-bold ph-spinner-gap mv-icon-spin"></i> Salvando...'
            : '<i class="ph-bold ph-floppy-disk"></i> Salvar insumo';
        btn.style.opacity = isLoading ? '0.85' : '1';
    },

    async saveInput() {
        if (this._isSavingInput) return;

        this.clearInputFieldErrors();

        const id = (document.getElementById('input-id')?.value || '').trim();
        const name = (document.getElementById('input-name')?.value || '').trim();
        const internalCodeRaw = (document.getElementById('input-internal-code')?.value || '').trim();
        const supplier = (document.getElementById('input-supplier')?.value || '').trim();
        const costRaw = String(document.getElementById('input-cost')?.value || '').replace(',', '.');
        const cost = parseFloat(costRaw);
        const unit = String(document.getElementById('input-unit')?.value || '').trim();
        const noMinStock = !!document.getElementById('check-no-min-stock')?.checked;
        const minStockRaw = String(document.getElementById('input-min-stock')?.value || '').replace(',', '.');
        const minStockVal = parseFloat(minStockRaw);
        const minStock = noMinStock ? 0 : minStockVal;

        let firstInvalidEl = null;
        const focusInvalid = (idField) => {
            if (firstInvalidEl) return;
            firstInvalidEl = this.markInputFieldError(idField);
        };

        if (!name) focusInvalid('input-name');
        if (!Number.isFinite(cost) || cost <= 0) focusInvalid('input-cost');
        if (!unit) focusInvalid('input-unit');
        if (!noMinStock && (!Number.isFinite(minStockVal) || minStockVal < 0)) focusInvalid('input-min-stock');

        if (firstInvalidEl) {
            firstInvalidEl.focus();
            let text = 'Revise os campos destacados.';
            if (firstInvalidEl.id === 'input-name') text = 'Informe o nome do insumo.';
            if (firstInvalidEl.id === 'input-cost') text = 'Informe um custo válido maior que zero.';
            if (firstInvalidEl.id === 'input-unit') text = 'Selecione a unidade do insumo.';
            if (firstInvalidEl.id === 'input-min-stock') text = 'Estoque mínimo deve ser 0 ou maior.';
            Swal.fire({ icon: 'warning', title: 'Dados inválidos', text });
            return;
        }

        const codeNorm = this.normalizeInputInternalCode(internalCodeRaw);
        if (internalCodeRaw.trim() && codeNorm && !/^[A-Z0-9._-]+$/.test(codeNorm)) {
            this.markInputFieldError('input-internal-code');
            document.getElementById('input-internal-code')?.focus();
            Swal.fire({
                icon: 'warning',
                title: 'Código inválido',
                text: 'Use apenas letras, números, ponto (.), traço (-) e sublinhado (_), até 40 caracteres.'
            });
            return;
        }

        const dupName = this.findDuplicateInputByName(name, id);
        if (dupName) {
            this.markInputFieldError('input-name');
            document.getElementById('input-name')?.focus();
            Swal.fire({
                icon: 'error',
                title: 'Nome já cadastrado',
                text: 'Já existe um insumo com este nome. Altere o nome ou edite o item existente na lista.'
            });
            return;
        }

        if (codeNorm) {
            const dupCode = this.findDuplicateInputByInternalCode(codeNorm, id);
            if (dupCode) {
                this.markInputFieldError('input-internal-code');
                document.getElementById('input-internal-code')?.focus();
                Swal.fire({
                    icon: 'error',
                    title: 'Código já em uso',
                    text: 'Já existe outro insumo com este código interno. Escolha um código diferente.'
                });
                return;
            }
        }

        const isEdit = !!id;

        this._isSavingInput = true;
        this.setInputSaveButtonLoading(true);

        const existingInputs = (typeof dataManager !== 'undefined' && dataManager.getInputs)
            ? (dataManager.getInputs() || [])
            : [];
        const existing = id ? existingInputs.find(i => String(i.id) === id) : null;

        const input = {
            id: id || 'input-' + Date.now(),
            name,
            internal_code: codeNorm || '',
            supplier: supplier || 'N/A',
            cost: Number(cost.toFixed(2)),
            unit,
            stock: existing ? (parseFloat(existing.stock) || 0) : 0,
            min_stock: noMinStock ? 0 : minStock,
            minStock: noMinStock ? 0 : minStock
        };

        try {
            const ok = await window.productService.saveInput(input);
            if (ok !== true) return;
            Swal.fire({
                icon: 'success',
                title: 'Insumo salvo!',
                text: isEdit ? `${name} foi atualizado com sucesso.` : `${name} foi adicionado com sucesso.`,
                timer: 1200,
                showConfirmButton: false
            });
            this.closeModals();
            if (typeof this.renderInputList === 'function') this.renderInputList();
            if (typeof this.renderInputsTable === 'function') this.renderInputsTable(false);
            if (typeof this.updateInventoryBadge === 'function') this.updateInventoryBadge();
            if (typeof this.renderDashboard === 'function') this.renderDashboard();
        } catch (err) {
            console.error(err);
            Swal.fire('Erro', 'Falha ao salvar insumo.', 'error');
        } finally {
            this._isSavingInput = false;
            this.setInputSaveButtonLoading(false);
        }
    },

    // State for Recipe (Map of ID -> Qty)
    tempRecipeState: new Map(),
    _productModalBaseline: null,
    _productModalUxBound: false,
    _productModalKeydownRef: null,

    renderInputList(filterText = '') {
        const inputs = dataManager.getInputs() || [];
        const listContainer = document.getElementById('input-selection-list');
        if (!listContainer) return;

        const q = (filterText || '').toLowerCase().trim();
        const filtered = !q
            ? inputs
            : inputs.filter((i) => {
                const nm = (i.name || '').toLowerCase();
                const sup = (i.supplier || '').toLowerCase();
                const ic = String(i.internal_code || '').toLowerCase();
                return nm.includes(q) || sup.includes(q) || ic.includes(q);
            });

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:10px;">Nenhum insumo encontrado.</div>';
            return;
        }

        const esc = (s) => String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');

        listContainer.innerHTML = filtered.map(i => {
            const parsedCost = parseFloat(i.cost);
            const safeCost = Number.isFinite(parsedCost) ? parsedCost : 0;
            const stock = parseFloat(i.stock) || 0;
            const minStock = Number(i.minStock != null ? i.minStock : i.min_stock) || 0;
            const hasBadCost = !Number.isFinite(parsedCost) || parsedCost <= 0;
            const isLowStock = minStock > 0 && stock <= minStock;
            const statusBadges = [
                hasBadCost ? '<span class="mv-input-badge mv-input-badge--warn">Custo pendente</span>' : '',
                isLowStock ? '<span class="mv-input-badge mv-input-badge--danger">Estoque baixo</span>' : ''
            ].filter(Boolean).join('');

            // Check state
            const isSelected = this.tempRecipeState.has(i.id);
            const currentQty = isSelected ? this.tempRecipeState.get(i.id) : 1;

            return `
            <div class="comp-item" data-id="${i.id}" data-cost="${safeCost}">
                <div style="display:flex;align-items:center;justify-content:flex-start;text-align:left;gap:8px;flex:1;">
                    <input type="checkbox" class="cost-check" onchange="adminApp.toggleCompItem(this, '${i.id}')" ${isSelected ? 'checked' : ''}>
                    <label style="font-size:0.9rem;cursor:pointer;color:#334155;text-align:left;" onclick="this.previousElementSibling.click()">
                        ${esc(i.name)} (${esc(i.unit || 'un')})
                        ${i.internal_code && String(i.internal_code).trim() ? `<span class="mv-input-code-inline">${esc(String(i.internal_code).trim())}</span>` : ''}
                        ${statusBadges ? `<span class="mv-input-badge-wrap">${statusBadges}</span>` : ''}
                    </label>
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

            // Calculate Tax
            const taxInput = document.getElementById('prod-tax-rate');
            const taxRate = taxInput ? (parseFloat(taxInput.value) || 0) : 0;
            const taxAmount = price * (taxRate / 100);

            // Dynamically append tax to the breakdown container if we have it
            if (taxAmount > 0 && breakdownContainer && breakdownContainer.style.display !== 'none') {
                breakdownContainer.innerHTML += `
                    <div style="display:flex; justify-content:space-between; border-top:1px dashed #cbd5e1; padding-top:4px; margin-top: 5px; color: #ef4444;">
                        <span>Imposto (NF-e) <span style="font-size:0.75rem;">${taxRate}%</span></span>
                        <span>- R$ ${taxAmount.toFixed(2)}</span>
                    </div>
                `;
            }

            // Suggested Price (Markup 2.5x -> 60% margin)
            const suggested = totalCost * 2.5;

            // Profit & Margin
            const profit = price - totalCost - taxAmount;
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

    switchProductTab(tabId) {
        // Esconde todas as abas
        const allTabs = ['general', 'gallery', 'tiers', 'configurator'];
        allTabs.forEach(id => {
            const el = document.getElementById(`prod-tab-${id}`);
            if(el) el.style.display = 'none';
        });

        // Tira o foco visual (cores/sombras) de todos os botões de aba
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.color = '#64748b';
            btn.style.background = 'transparent';
            btn.style.boxShadow = 'none';
        });

        // Exibe a aba correta com o Display Certo
        const activeTab = document.getElementById(`prod-tab-${tabId}`);
        if (activeTab) {
            if (tabId === 'general') {
                activeTab.style.display = 'flex';
                activeTab.style.flexDirection = 'column';
                activeTab.style.minWidth = '0';
                activeTab.style.maxWidth = '100%';
                activeTab.style.overflowX = 'hidden';
            } else {
                activeTab.style.display = 'block';
                activeTab.style.flexDirection = '';
                activeTab.style.minWidth = '';
                activeTab.style.maxWidth = '';
                activeTab.style.overflowX = '';
            }
        }

        // Devolve o foco visual estilizado para o botão atual (Pill White)
        const activeBtn = document.getElementById(`btn-tab-${tabId}`);
        if(activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.color = 'var(--primary-hero)';
            activeBtn.style.background = 'white';
            activeBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        }
    },

    /** Variações vindas do Supabase/JSON — mesmo critério da loja (produto.js). */
    normalizeProductVariationsForAdmin(raw) {
        if (raw == null) return [];
        let arr = raw;
        if (typeof raw === 'string') {
            try {
                arr = JSON.parse(raw);
            } catch {
                return [];
            }
        }
        if (!Array.isArray(arr)) return [];
        return arr
            .map((row) => ({
                name: String(row.name != null ? row.name : row.label || '').trim(),
                stock: Math.max(0, parseInt(row.stock, 10) || 0)
            }))
            .filter((row) => row.name);
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

        const tiers = this.getTiersData ? this.getTiersData() : [];
        const basePrice = tiers.length > 0 ? tiers[0].unit_price : 0;

        const hasVariations = checked('prod-has-variations');
        let variationsPayload = [];
        let stockVal = parseInt(val('prod-stock', '0'), 10) || 0;
        if (hasVariations) {
            variationsPayload = (this.currentVariations || [])
                .map((row) => ({
                    name: String(row.name || '').trim(),
                    stock: Math.max(0, parseInt(row.stock, 10) || 0)
                }))
                .filter((row) => row.name);
            if (variationsPayload.length === 0) {
                Swal.fire(
                    'Atenção',
                    'Com “Com variações” ativado, adicione pelo menos uma linha (ex.: uma cor e a quantidade em estoque).',
                    'warning'
                );
                return;
            }
            const seenNames = new Set();
            for (const row of variationsPayload) {
                const key = row.name.toLowerCase();
                if (seenNames.has(key)) {
                    Swal.fire(
                        'Atenção',
                        `Há mais de uma variação com o nome «${row.name}». Cada opção (cor/tamanho) precisa de um nome único para a loja.`,
                        'warning'
                    );
                    return;
                }
                seenNames.add(key);
            }
            stockVal = variationsPayload.reduce((acc, row) => acc + row.stock, 0);
        }

        if (hasVariations && checked('check-is-variable')) {
            const confirmMix = await Swal.fire({
                icon: 'warning',
                title: 'Combinação incomum',
                text: 'Este produto está como “Apostila / preço variável” e tem variações de stock na loja. Só combine os dois se for intencional.',
                showCancelButton: true,
                confirmButtonText: 'Salvar assim mesmo',
                cancelButtonText: 'Rever formulário'
            });
            if (!confirmMix.isConfirmed) return;
        }

        const payload = {
            name: val('prod-name'),
            category: val('prod-category'),
            subcategory: val('prod-subcategory'),
            price: basePrice, // Safeguard: use the first tier's price as the default fallback
            description: val('prod-description'),
            image: mainImage,
            min_qty: parseInt(val('prod-min-stock', '0')) || 0,
            stock: stockVal,
            variations: hasVariations ? variationsPayload : [],
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
            base_price: parseFloat(val('prod-price-analysis', '0')) || 0,

            // === CAMPOS FISCAIS (NF-e) ===
            ncm: val('prod-ncm', ''),
            tax_rate: parseFloat(val('prod-tax-rate', '0')) || 0,

            // === PRODUÇÃO ===
            tempo_producao: parseFloat(val('prod-tempo-producao', '1.0')) || 1.0
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

        if (!payload.category) {
            Swal.fire('Atenção', 'A seleção da Categoria Principal é obrigatória para garantir que o item apareça corretamente nos menus do site.', 'warning');
            return;
        }

        try {
            // Força a criação de um UUID caso o produto seja novo e a tabela exija
            if (id) {
                payload.id = id;
            } else {
                payload.id = typeof crypto !== 'undefined' && crypto.randomUUID 
                    ? crypto.randomUUID() 
                    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
                        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
                    );
            }

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
            if (typeof this.markProductModalClean === 'function') this.markProductModalClean();
            if (typeof this.forceCloseAllModals === 'function') this.forceCloseAllModals();
            else this.closeModals();
            if (typeof dataManager !== 'undefined' && dataManager.fetchProducts) {
                try {
                    await dataManager.fetchProducts();
                } catch (e) {
                    console.warn('fetchProducts após salvar:', e);
                }
            }
            this.renderProductsTable();

        } catch (err) {
            console.error('saveProduct error:', err);
            Swal.fire('Erro', `Erro ao salvar produto: ${err.message || err}`, 'error');
        }
    },

    generateSKU() {
        const cat = document.getElementById('prod-category')?.value || 'GNR';
        const name = document.getElementById('prod-name')?.value || 'PRD';
        let catCode = cat.substring(0,3).toUpperCase().replace(/[^A-Z]/g, '');
        if (catCode.length < 3) catCode = catCode.padEnd(3, 'X');
        let nameCode = name.substring(0,3).toUpperCase().replace(/[^A-Z]/g, '');
        if (nameCode.length < 3) nameCode = nameCode.padEnd(3, 'X');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        document.getElementById('prod-sku').value = `${catCode}-${nameCode}-${randomNum}`;
    },

    async openProductModal(prod = null) {
        const overlay = document.getElementById('modal-product');
        if (!overlay) return;

        overlay.classList.add('open');
        this.resetModal();

        if (prod) {
            this.editProd(prod.id);
        } else {
            const searchInput = document.getElementById('input-search');
            if (searchInput) searchInput.value = '';
            if (this.tempRecipeState) this.tempRecipeState.clear();
            if (window.dataManager) await dataManager.fetchInputs();
            await this.populateProductCategories();
            if (typeof this.renderInputList === 'function') this.renderInputList();
            if (typeof this.calculateProfit === 'function') this.calculateProfit();
            if (typeof this.switchProductTab === 'function') this.switchProductTab('general');
            setTimeout(() => {
                if (typeof this.markProductModalClean === 'function') this.markProductModalClean();
            }, 500);
        }

        if (typeof this.bindProductModalUx === 'function') this.bindProductModalUx();
        if (typeof this.scheduleProductModalReadyFocus === 'function') this.scheduleProductModalReadyFocus();
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

        // Campos Fiscais (NF-e)
        setVal('prod-ncm', prod.ncm || '');
        setVal('prod-tax-rate', prod.tax_rate != null ? prod.tax_rate : '');

        // Produção
        setVal('prod-tempo-producao', prod.tempo_producao != null ? prod.tempo_producao : 1.0);

        // Initialize Gallery
        this.galleryFiles = [];
        this.galleryUrls = prod.gallery || (prod.image ? [prod.image] : []);
        if (typeof this.renderGalleryPreview === 'function') this.renderGalleryPreview();

        // Faixas de preço: carregadas em tiersPromise (acima), em paralelo com categorias

        // Variations Logic (normaliza string JSON / campos label)
        const normVar = this.normalizeProductVariationsForAdmin(prod.variations);
        if (normVar.length > 0) {
            setChk('prod-has-variations', true);
            this.currentVariations = normVar.map((v) => ({ name: v.name, stock: v.stock }));
            const sumVar = normVar.reduce((acc, v) => acc + v.stock, 0);
            setVal('prod-stock', sumVar);
        } else {
            setChk('prod-has-variations', false);
            this.currentVariations = [];
            setVal('prod-stock', prod.stock != null && prod.stock !== '' ? prod.stock : 0);
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

        const catPromise = this.populateProductCategories().then(() => {
            setVal('prod-category', prod.category || '');
            return this.loadSubcategories(prod.category || '');
        }).then(() => {
            setVal('prod-subcategory', prod.subcategory || '');
        });
        const tiersPromise = prod.id ? this.loadTiers(prod.id) : Promise.resolve();
        Promise.all([catPromise, tiersPromise]).catch(() => {}).finally(() => {
            if (typeof this.markProductModalClean === 'function') {
                setTimeout(() => this.markProductModalClean(), 150);
            }
        });
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

    filterProductsAdmin() {
        this.renderProductsTable(false);
    },

    async renderProductsTable(forceFetch = true) {
        const tbody = document.getElementById('products-table-body');
        // Fetch fresh data from Cloud ONLY se for a montagem principal
        if (forceFetch && window.dataManager) await dataManager.fetchProducts();
        let products = dataManager.getProducts() || [];

        // Filtro em tempo real via JS na memória
        const searchInput = document.getElementById('product-search-admin');
        const catFilter = document.getElementById('product-category-filter-admin');

        if (searchInput && searchInput.value) {
            const val = searchInput.value.toLowerCase();
            products = products.filter(p => (p.name || '').toLowerCase().includes(val) || (p.description || '').toLowerCase().includes(val));
        }

        if (catFilter && catFilter.value !== 'all') {
            products = products.filter(p => p.category === catFilter.value || p.subcategory === catFilter.value);
        }

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
            let catData;
            if (this.fullCategoriesList) {
                catData = this.fullCategoriesList.find(c => c.name === categoryName);
            } else {
                const { data } = await window.supabase.from('categories').select('id, name').eq('name', categoryName).single();
                catData = data;
            }

            if (!catData) {
                subSelect.innerHTML = '<option value="">Categoria não encontrada</option>';
                return;
            }

            let subs = [];
            if (this.fullCategoriesList) {
                subs = this.fullCategoriesList.filter(c => String(c.parent_id) === String(catData.id));
                subs.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                const { data } = await window.supabase.from('categories')
                    .select('name')
                    .eq('parent_id', catData.id)
                    .order('name');
                if (data) subs = data;
            }

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

    async renderDashboard() {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const dateEl = document.getElementById('dash-date');
        if (dateEl) dateEl.innerText = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

        const todayStr = this.formatFinDateLocal(now);
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        let lowStock = [];
        try {
            if (window.dataManager?.fetchProducts) await window.dataManager.fetchProducts();
            if (window.dataManager?.fetchInputs) await window.dataManager.fetchInputs();
            lowStock = typeof dataManager !== 'undefined' && dataManager.getLowStockInputs ? dataManager.getLowStockInputs() || [] : [];
        } catch (e) {
            console.warn('Dashboard: dataManager', e);
        }

        const products = window.dataManager?.getProducts() || [];
        const elDashProducts = document.getElementById('dash-total-products');
        if (elDashProducts) elDashProducts.textContent = String(products.length);
        const elDashLow = document.getElementById('dash-low-stock');
        if (elDashLow) elDashLow.textContent = String(lowStock.length);
        const elLowStock = document.getElementById('stat-low-stock');
        if (elLowStock) elLowStock.textContent = String(lowStock.length);

        if (!window.supabase) {
            const elPending = document.getElementById('dash-pending-orders');
            if (elPending) elPending.textContent = '—';
            if (this.renderFinancialGoals) this.renderFinancialGoals();
            if (this.renderCharts) await this.renderCharts();
            return;
        }

        const finSince = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        let financials = [];
        let pendingInquiry = 0;
        try {
            const [financialHelper, pendingRes] = await Promise.all([
                window.supabase
                    .from('financial_records')
                    .select('total, type, created_at')
                    .gte('created_at', finSince.toISOString())
                    .order('created_at', { ascending: false }),
                window.supabase
                    .from('protocols')
                    .select('id', { count: 'exact', head: true })
                    .in('status', ['inquiry', 'pending'])
            ]);
            financials = financialHelper?.data || [];
            if (pendingRes && typeof pendingRes.count === 'number') pendingInquiry = pendingRes.count;
        } catch (e) {
            console.error('Dashboard: Supabase', e);
        }

        const elPending = document.getElementById('dash-pending-orders');
        if (elPending) elPending.textContent = String(pendingInquiry);

        let salesToday = 0;
        let profitMonth = 0;
        const salesHistory = {};

        financials.forEach((rec) => {
            const val = parseFloat(rec.total) || 0;
            const created = new Date(rec.created_at);
            const date = this.formatFinDateLocal(created);
            const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;

            if (rec.type === 'income' && date === todayStr) salesToday += val;
            if (month === monthStr) {
                if (rec.type === 'income') profitMonth += val;
                if (rec.type === 'expense') profitMonth -= val;
            }
            if (rec.type === 'income') {
                salesHistory[date] = (salesHistory[date] || 0) + val;
            }
        });

        const elSales = document.getElementById('stat-sales-today');
        if (elSales) elSales.innerText = salesToday.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const elProfit = document.getElementById('stat-profit-month');
        if (elProfit) {
            elProfit.innerText = profitMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elProfit.style.color = profitMonth >= 0 ? '#10b981' : '#ef4444';
        }

        const dayKeys = Object.keys(salesHistory);
        let forecast = 0;
        if (dayKeys.length > 0) {
            const sum = dayKeys.reduce((acc, k) => acc + (salesHistory[k] || 0), 0);
            forecast = (sum / dayKeys.length) * 30;
        }

        const elForecast = document.getElementById('stat-forecast');
        if (elForecast) {
            elForecast.innerText = forecast.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            elForecast.style.animation = forecast > 5000 ? 'pulse 2s infinite' : 'none';
        }

        const tbody = document.getElementById('dash-alerts-body');
        if (tbody) {
            if (lowStock.length === 0) {
                tbody.innerHTML =
                    '<tr><td colspan="3" style="text-align:center; padding:20px; color:#94a3b8;">Tudo certo por aqui! <i class="ph-bold ph-check-circle" aria-hidden="true"></i> Estoque saudável.</td></tr>';
            } else {
                tbody.innerHTML = lowStock
                    .map(
                        (item) => `
                    <tr>
                        <td>
                            <div style="font-weight:600; color:var(--text-primary)">${item.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-secondary)">${item.supplier || '-'}</div>
                        </td>
                        <td>${item.stock} ${item.unit}</td>
                        <td><span class="status-badge status-error">Baixo</span></td>
                    </tr>
                `
                    )
                    .join('');
            }
        }

        if (this.renderFinancialGoals) this.renderFinancialGoals();
        if (this.renderCharts) await this.renderCharts();
    },

    // --- Inventory Management ---
    inventoryStatusMeta(status, mode = 'all') {
        const full = {
            ok: { label: 'OK', color: '#10b981', icon: 'ph-check-circle' },
            low: { label: 'Baixo', color: '#f59e0b', icon: 'ph-warning' },
            critical: { label: 'Critico', color: '#ef4444', icon: 'ph-warning-circle' },
            out: { label: 'Esgotado', color: '#64748b', icon: 'ph-prohibit' }
        };
        const m = full[status];
        if (m) return m;
        if (mode === 'warn') return { label: String(status || '-'), color: '#64748b', icon: 'ph-info' };
        return full.ok;
    },

    inventoryHistoryTypeMeta(type) {
        const map = {
            entrada: { label: 'Entrada', color: '#10b981', icon: 'ph-arrow-down-left' },
            venda: { label: 'Venda', color: '#3b82f6', icon: 'ph-shopping-cart-simple' },
            perda: { label: 'Perda', color: '#ef4444', icon: 'ph-trash' },
            uso_interno: { label: 'Uso interno', color: '#f59e0b', icon: 'ph-wrench' },
            manual: { label: 'Ajuste', color: '#64748b', icon: 'ph-pencil-simple' }
        };
        const m = map[type];
        if (m) return m;
        return { label: String(type || '-'), color: '#64748b', icon: 'ph-dots-three' };
    },

    bindInventoryOverviewDelegation() {
        const table = document.getElementById('inventory-overview-table');
        if (!table || table.dataset.invClickBound) return;
        table.dataset.invClickBound = '1';
        table.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-inv-act]');
            if (!btn || btn.disabled) return;
            const raw = btn.getAttribute('data-inv-id') || '';
            const id = raw ? decodeURIComponent(raw) : '';
            if (!id) return;
            const act = btn.getAttribute('data-inv-act');
            if (act === 'entry') this.openStockEntry(id);
            else if (act === 'adjust') this.openStockAdjust(id);
        });
    },

    bindInventoryHistoryFilter() {
        const sel = document.getElementById('history-filter');
        if (!sel || sel.dataset.invHistBound) return;
        sel.dataset.invHistBound = '1';
        sel.addEventListener('change', () => {
            this.persistInventoryHistoryFilter(sel.value);
            this.filterHistory(sel.value);
        });
    },

    bindInventorySearchControl() {
        const input = document.getElementById('inventory-search');
        if (!input || input.dataset.invSearchBound) return;
        input.dataset.invSearchBound = '1';
        input.addEventListener('input', () => {
            this._inventorySearchTerm = String(input.value || '').trim();
            this.renderInventoryOverview();
        });
    },

    bindInventoryFilterModeToolbar() {
        const allBtn = document.getElementById('inv-filter-all');
        const lowBtn = document.getElementById('inv-filter-attention');
        if ((!allBtn && !lowBtn) || (allBtn && allBtn.dataset.invFilterBound)) return;
        if (allBtn) allBtn.dataset.invFilterBound = '1';
        if (allBtn) {
            allBtn.addEventListener('click', () => {
                this.showAllStock();
            });
        }
        if (lowBtn) {
            lowBtn.addEventListener('click', () => {
                this.showLowStockOnly();
            });
        }
    },

    _syncInventoryFilterToolbar() {
        const hint = document.getElementById('inventory-filter-hint');
        const allBtn = document.getElementById('inv-filter-all');
        const lowBtn = document.getElementById('inv-filter-attention');
        const mode = this._inventoryOverviewMode === 'low' ? 'low' : 'all';
        if (hint) {
            hint.textContent =
                mode === 'low'
                    ? 'A mostrar só itens com stock baixo, crítico ou esgotado (ordenados por urgência).'
                    : 'A mostrar todos os insumos (crítico e esgotado primeiro, depois baixo e OK).';
        }
        if (allBtn) {
            allBtn.classList.toggle('btn-primary', mode === 'all');
            allBtn.classList.toggle('btn-secondary', mode !== 'all');
            allBtn.setAttribute('aria-pressed', mode === 'all' ? 'true' : 'false');
        }
        if (lowBtn) {
            lowBtn.classList.toggle('btn-primary', mode === 'low');
            lowBtn.classList.toggle('btn-secondary', mode !== 'low');
            lowBtn.setAttribute('aria-pressed', mode === 'low' ? 'true' : 'false');
        }
    },

    _inventorySearchTerm: '',
    _inventoryOverviewMode: 'all',

    _normalizeInventorySearchText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    },

    _filterInventoryInputs(inputs, mode = 'all') {
        let rows = Array.isArray(inputs) ? inputs.slice() : [];
        if (mode === 'low') {
            rows = rows.filter((item) => {
                const s = dataManager.getStockStatus(item);
                return s === 'critical' || s === 'out' || s === 'low';
            });
        }

        const q = this._normalizeInventorySearchText(this._inventorySearchTerm);
        if (!q) return rows;

        return rows.filter((item) => {
            const hay = this._normalizeInventorySearchText([
                item && item.name,
                item && item.supplier,
                item && item.unit,
                item && item.internal_code
            ].join(' '));
            return hay.includes(q);
        });
    },

    _inventoryStatusRank(status) {
        const order = { critical: 0, out: 1, low: 2, ok: 3 };
        return Object.prototype.hasOwnProperty.call(order, status) ? order[status] : 9;
    },

    _sortInventoryInputsByUrgency(inputs) {
        const list = Array.isArray(inputs) ? inputs.slice() : [];
        list.sort((a, b) => {
            const sa = dataManager.getStockStatus(a);
            const sb = dataManager.getStockStatus(b);
            const ra = this._inventoryStatusRank(sa);
            const rb = this._inventoryStatusRank(sb);
            if (ra !== rb) return ra - rb;
            const na = String(a.name || '').toLowerCase();
            const nb = String(b.name || '').toLowerCase();
            return na.localeCompare(nb, 'pt');
        });
        return list;
    },

    _inventoryHistoryFilterOptions: ['all', 'entrada', 'venda', 'perda', 'uso_interno'],
    _inventoryOverviewModeOptions: ['all', 'low'],

    getPersistedInventoryOverviewMode() {
        let raw = '';
        try {
            raw = (typeof SafeStorage !== 'undefined' && SafeStorage.getItem)
                ? String(SafeStorage.getItem('mv_inventory_overview_mode') || '')
                : '';
        } catch (e) {
            raw = '';
        }
        const v = raw.trim();
        if (this._inventoryOverviewModeOptions.includes(v)) return v;
        return 'all';
    },

    persistInventoryOverviewMode(value) {
        const v = String(value || '').trim();
        if (!this._inventoryOverviewModeOptions.includes(v)) return;
        try {
            if (typeof SafeStorage !== 'undefined' && SafeStorage.setItem) {
                SafeStorage.setItem('mv_inventory_overview_mode', v);
            }
        } catch (e) { /* ignore quota */ }
    },

    getPersistedInventoryHistoryFilter() {
        let raw = '';
        try {
            raw = (typeof SafeStorage !== 'undefined' && SafeStorage.getItem)
                ? String(SafeStorage.getItem('mv_inventory_history_filter') || '')
                : '';
        } catch (e) {
            raw = '';
        }
        const v = raw.trim();
        if (this._inventoryHistoryFilterOptions.includes(v)) return v;
        return 'all';
    },

    persistInventoryHistoryFilter(value) {
        const v = String(value || '').trim();
        if (!this._inventoryHistoryFilterOptions.includes(v)) return;
        try {
            if (typeof SafeStorage !== 'undefined' && SafeStorage.setItem) {
                SafeStorage.setItem('mv_inventory_history_filter', v);
            }
        } catch (e) { /* ignore quota */ }
    },

    _isInventorySectionActive() {
        const el = document.getElementById('inventory');
        return !!(el && el.classList.contains('active'));
    },

    bindStockModalA11y() {
        if (this._stockModalA11yBound) return;
        this._stockModalKeydownRef = (e) => this._onStockModalKeydown(e);
        document.addEventListener('keydown', this._stockModalKeydownRef, true);
        this._stockModalA11yBound = true;
    },

    _onStockModalKeydown(e) {
        const entry = document.getElementById('modal-stock-entry');
        const adj = document.getElementById('modal-stock-adjust');
        let modal = null;
        if (entry && entry.classList.contains('open')) modal = entry;
        else if (adj && adj.classList.contains('open')) modal = adj;
        else return;

        if (typeof Swal !== 'undefined' && Swal.isVisible && Swal.isVisible()) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.forceCloseAllModals();
            return;
        }
        if (e.key !== 'Tab') return;

        const sel = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const nodes = Array.from(modal.querySelectorAll(sel)).filter((n) => {
            if (n.hasAttribute('disabled')) return false;
            return n.getClientRects().length > 0;
        });
        if (nodes.length === 0) return;

        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first || !modal.contains(document.activeElement)) {
                e.preventDefault();
                last.focus();
            }
        } else if (document.activeElement === last || !modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
        }
    },

    _focusStockModalFirstField(modalEl) {
        if (!modalEl) return;
        requestAnimationFrame(() => {
            const sel = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';
            const first = modalEl.querySelector(sel);
            if (first && typeof first.focus === 'function') first.focus();
        });
    },

    _inventoryOverviewRowHtml(input, opts = { warnOnly: false }) {
        const esc = v => this.escapeChatHtml(String(v ?? ''));
        const stock = Number(input.stock) || 0;
        const minStock = Number(input.minStock) || 0;
        const status = dataManager.getStockStatus(input);
        const meta = this.inventoryStatusMeta(status, opts.warnOnly ? 'warn' : 'all');
        const totalValue = stock * (Number(input.cost) || 0);
        const rowBg = opts.warnOnly ? '#fef2f2' : ((status === 'critical' || status === 'out') ? '#fef2f2' : 'white');
        const encId = encodeURIComponent(String(input.id ?? ''));
        const unit = esc(input.unit || 'un');
        const nameForAria = esc(input.name || 'Insumo');
        return `
                <tr style="background:${rowBg}">
                    <td>
                        <strong>${esc(input.name)}</strong>
                        <div style="font-size:0.75rem;color:#94a3b8;">${esc(input.supplier || 'Sem fornecedor')}</div>
                    </td>
                    <td>
                        <span style="font-weight:600;font-size:1.1rem;">${stock} ${unit}</span>
                    </td>
                    <td>
                        <span style="color:#64748b;">${minStock} ${unit}</span>
                    </td>
                    <td>
                        <span style="color:${meta.color};font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                            <i class="ph-bold ${meta.icon}" aria-hidden="true"></i> ${esc(meta.label)}
                        </span>
                    </td>
                    <td>R$ ${totalValue.toFixed(2)}</td>
                    <td>
                        <button type="button" data-inv-act="entry" data-inv-id="${encId}"
                            style="color:#10b981;border:none;background:none;cursor:pointer;margin-right:8px;" title="Entrada"
                            aria-label="Registrar entrada de estoque: ${nameForAria}">
                            <i class="ph-bold ph-plus-circle" aria-hidden="true"></i>
                        </button>
                        <button type="button" data-inv-act="adjust" data-inv-id="${encId}"
                            style="color:#ef4444;border:none;background:none;cursor:pointer;" title="Saída / ajuste"
                            aria-label="Registrar saida ou ajuste de estoque: ${nameForAria}">
                            <i class="ph-bold ph-minus-circle" aria-hidden="true"></i>
                        </button>
                    </td>
                </tr>`;
    },

    openStockEntry(inputId) {
        const inputs = dataManager.getInputs();
        const input = inputs.find(i => String(i.id) === String(inputId));
        if (!input) return;

        const modal = document.getElementById('modal-stock-entry');
        if (!modal) return;
        modal.classList.add('open');
        document.getElementById('stock-entry-input-id').value = inputId;
        const nameEl = document.getElementById('stock-entry-name');
        if (nameEl) nameEl.textContent = input.name || '';
        document.getElementById('stock-entry-qty').value = '';
        document.getElementById('stock-entry-supplier').value = input.supplier || '';
        document.getElementById('stock-entry-cost').value = input.cost || '';
        document.getElementById('stock-entry-note').value = '';
        this._focusStockModalFirstField(modal);
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
                alert('Informe uma quantidade valida maior que zero.');
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
                void this.renderInventoryView();
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Entrada registrada.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                } else {
                    alert('Entrada registrada com sucesso!');
                }
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
        const input = inputs.find(i => String(i.id) === String(inputId));
        if (!input) return;

        const modal = document.getElementById('modal-stock-adjust');
        if (!modal) return;
        modal.classList.add('open');
        document.getElementById('stock-adjust-input-id').value = inputId;
        const nameEl = document.getElementById('stock-adjust-name');
        if (nameEl) nameEl.textContent = input.name || '';
        const curEl = document.getElementById('stock-adjust-current');
        if (curEl) curEl.textContent = `Estoque atual: ${input.stock || 0} ${input.unit || ''}`;
        document.getElementById('stock-adjust-qty').value = '';
        document.getElementById('stock-adjust-type').value = 'perda';
        document.getElementById('stock-adjust-reason').value = '';
        this._focusStockModalFirstField(modal);
    },

    async saveStockAdjust() {
        try {
            this.setLoading('#modal-stock-adjust button[onclick*="saveStockAdjust"]', true);
            const inputId = document.getElementById('stock-adjust-input-id').value;
            const qty = parseFloat(document.getElementById('stock-adjust-qty').value);
            const type = document.getElementById('stock-adjust-type').value;
            const reason = document.getElementById('stock-adjust-reason').value;

            if (!qty || qty <= 0) {
                alert('Informe uma quantidade valida maior que zero.');
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
                void this.renderInventoryView();
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Ajuste registrado.',
                        showConfirmButton: false,
                        timer: 2200
                    });
                } else {
                    alert('Ajuste registrado com sucesso!');
                }
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
    async renderInventoryView(options = {}) {
        const isBackground = !!options.isBackground;
        if (isBackground && !this._isInventorySectionActive()) {
            return;
        }
        this._inventoryOverviewMode = this.getPersistedInventoryOverviewMode();
        await dataManager.fetchInputs(); // Ensure stock is fresh
        await dataManager.fetchHistory(); // Ensure history is fresh
        const searchInput = document.getElementById('inventory-search');
        if (searchInput) searchInput.value = this._inventorySearchTerm || '';
        this.renderInventoryOverview();
        const filter = this.getPersistedInventoryHistoryFilter();
        const sel = document.getElementById('history-filter');
        if (sel) sel.value = filter;
        this.renderInventoryHistory(filter);
        this.updateInventoryStats();
    },

    renderInventoryOverview() {
        const tbody = document.getElementById('inventory-overview-body');
        this._syncInventoryFilterToolbar();
        if (!tbody) return;
        const allInputs = dataManager.getInputs() || [];
        if (allInputs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum insumo cadastrado. Use a aba Insumos para adicionar.</td></tr>';
            this._syncInventoryFilterToolbar();
            return;
        }
        const mode = this._inventoryOverviewMode === 'low' ? 'low' : 'all';
        const filteredInputs = this._sortInventoryInputsByUrgency(this._filterInventoryInputs(allInputs, mode));
        if (filteredInputs.length === 0) {
            const hasSearch = !!this._normalizeInventorySearchText(this._inventorySearchTerm);
            if (mode === 'low' && hasSearch) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum item em atenção encontrado para esta busca.</td></tr>';
                this._syncInventoryFilterToolbar();
                return;
            }
            if (mode === 'low') {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center;padding:30px;color:#10b981;">
                            <i class="ph-bold ph-check-circle" style="vertical-align:middle;margin-right:6px;"></i>
                            Nenhum item com estoque crítico, esgotado ou baixo.
                        </td>
                    </tr>
                `;
                this._syncInventoryFilterToolbar();
                return;
            }
            if (hasSearch) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">Nenhum item encontrado para esta busca.</td></tr>';
                this._syncInventoryFilterToolbar();
                return;
            }
        }
        tbody.innerHTML = filteredInputs.map(input => this._inventoryOverviewRowHtml(input, { warnOnly: mode === 'low' })).join('');
        this._syncInventoryFilterToolbar();
    },

    renderInventoryHistory(filter = 'all') {
        const tbody = document.getElementById('inventory-history-body');
        if (!tbody) return;
        let history = dataManager.getInventoryHistory(50) || [];

        if (filter !== 'all') {
            history = history.filter(h => h.type === filter);
        }

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">
                        Nenhuma movimentacao neste filtro.
                    </td>
                </tr>
            `;
            return;
        }

        const esc = v => this.escapeChatHtml(String(v ?? ''));

        tbody.innerHTML = history.map(h => {
            const date = new Date(h.date);
            const tmeta = this.inventoryHistoryTypeMeta(h.type);
            const quantityColor = h.quantity > 0 ? '#10b981' : '#ef4444';
            const quantitySign = h.quantity > 0 ? '+' : '';
            const qty = Number(h.quantity);

            return `
                <tr>
                    <td>
                        <div style="font-weight:600;font-size:0.85rem;">${date.toLocaleDateString('pt-BR')}</div>
                        <div style="font-size:0.75rem;color:#94a3b8;">${date.toLocaleTimeString('pt-BR')}</div>
                    </td>
                    <td>
                        <span style="color:${tmeta.color};font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                            <i class="ph-bold ${tmeta.icon}" aria-hidden="true"></i> ${esc(tmeta.label)}
                        </span>
                    </td>
                    <td>${esc(h.inputName)}</td>
                    <td style="color:${quantityColor};font-weight:700;">
                        ${quantitySign}${Number.isFinite(qty) ? qty : esc(String(h.quantity))}
                    </td>
                    <td style="font-size:0.85rem;">${esc(h.reason || '-')}</td>
                    <td style="color:#64748b;font-size:0.85rem;">${esc(h.user || 'Sistema')}</td>
                </tr>
            `;
        }).join('');
    },

    updateInventoryStats() {
        const inputs = dataManager.getInputs() || [];
        const lowStock = dataManager.getLowStockInputs() || [];
        const history = dataManager.getInventoryHistory() || [];

        const today = new Date().toDateString();
        const movementsToday = history.filter(h => {
            const date = new Date(h.date);
            return date.toDateString() === today;
        }).length;

        const elC = document.getElementById('critical-stock-count');
        const elT = document.getElementById('total-inputs-count');
        const elM = document.getElementById('movements-today-count');
        if (elC) elC.textContent = String(lowStock.length);
        if (elT) elT.textContent = String(inputs.length);
        if (elM) elM.textContent = String(movementsToday);
    },

    refreshInventoryView() {
        this.renderInventoryView();
    },

    filterHistory(type) {
        this.renderInventoryHistory(type);
    },

    showLowStockOnly() {
        this._inventoryOverviewMode = 'low';
        this.persistInventoryOverviewMode('low');
        this.renderInventoryOverview();
    },

    showAllStock() {
        this._inventoryOverviewMode = 'all';
        this.persistInventoryOverviewMode('all');
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
    async renderOrdersTable() {
        if (window.ProtocolsManager) {
            await window.ProtocolsManager.loadProtocols();
        } else {
            console.error("ProtocolsManager not loaded.");
            const tbody = document.getElementById('protocols-list-body');
            if (tbody) {
                tbody.innerHTML =
                    '<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Carregando gerenciador de protocolos…</td></tr>';
            }
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'js/admin-protocols.js?v=' + Date.now();
                    script.onload = resolve;
                    script.onerror = () => reject(new Error('Falha ao carregar admin-protocols.js'));
                    document.body.appendChild(script);
                });
                if (window.ProtocolsManager) {
                    await window.ProtocolsManager.loadProtocols();
                } else if (tbody) {
                    tbody.innerHTML =
                        '<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Erro: admin-protocols.js carregou mas ProtocolsManager não inicializou. Abra o Console (F12).</td></tr>';
                }
            } catch (e) {
                console.error(e);
                if (tbody) {
                    tbody.innerHTML =
                        '<tr><td colspan="7" style="text-align:center; padding:20px; color:#ef4444;">Erro: não foi possível carregar admin-protocols.js (rede ou cache).</td></tr>';
                }
            }
        }

        const savedMode = SafeStorage.getItem('mv_orders_view_mode') || 'list';
        this.setOrdersViewMode(savedMode, { refreshKanban: savedMode === 'kanban' });
    },

    ordersSearchDebounceMs: 250,
    _ordersSearchTimer: null,

    safeDispatch(eventName, detail = {}) {
        try {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        } catch (err) {
            console.warn(`Failed to dispatch event: ${eventName}`, err);
        }
    },

    setOrdersViewMode(mode, options = {}) {
        const viewMode = mode === 'kanban' ? 'kanban' : 'list';
        const { refreshKanban = false } = options;

        const listView = document.getElementById('orders-list-view');
        const kanbanView = document.getElementById('kanban-view');
        const listBtn = document.getElementById('orders-view-list-btn');
        const kanbanBtn = document.getElementById('orders-view-kanban-btn');

        if (listView) listView.style.display = viewMode === 'list' ? 'block' : 'none';
        if (kanbanView) kanbanView.style.display = viewMode === 'kanban' ? 'block' : 'none';

        if (listBtn && kanbanBtn) {
            listBtn.classList.toggle('active', viewMode === 'list');
            kanbanBtn.classList.toggle('active', viewMode === 'kanban');
            listBtn.style.background = viewMode === 'list' ? 'white' : 'transparent';
            kanbanBtn.style.background = viewMode === 'kanban' ? 'white' : 'transparent';
        }

        if (viewMode === 'kanban' && typeof window.kanban === 'undefined') {
            const board = document.getElementById('board');
            if (board) {
                board.innerHTML = '<div style="width:100%; text-align:center; color:#ef4444; padding:18px;">Erro ao carregar Kanban. Use o botão Atualizar para recarregar os scripts.</div>';
            }
        }

        SafeStorage.setItem('mv_orders_view_mode', viewMode);

        if (viewMode === 'kanban' && refreshKanban) {
            this.safeDispatch('kanban-refresh', { source: 'orders-view-toggle' });
        }
    },

    showOrdersListView() {
        this.setOrdersViewMode('list');
    },

    showOrdersKanbanView() {
        this.setOrdersViewMode('kanban', { refreshKanban: true });
    },

    handleOrdersSearchInput(value) {
        if (this._ordersSearchTimer) clearTimeout(this._ordersSearchTimer);
        this._ordersSearchTimer = setTimeout(() => {
            if (typeof ProtocolsManager !== 'undefined' && ProtocolsManager.searchProtocols) {
                ProtocolsManager.searchProtocols(value || '');
            }
        }, this.ordersSearchDebounceMs);
    },

    applyOrdersFilters() {
        const dateStart = document.getElementById('orders-date-start')?.value || '';
        const dateEnd = document.getElementById('orders-date-end')?.value || '';

        if (dateStart && dateEnd) {
            const ds = this.parseFinDateInputValue(dateStart);
            const de = this.parseFinDateInputValue(dateEnd);
            if (ds && de && de.getTime() < ds.getTime()) {
                if (typeof Swal !== 'undefined') {
                    Swal.fire('Atenção', 'A data final não pode ser anterior à inicial.', 'warning');
                }
                return;
            }
        }

        if (typeof ProtocolsManager !== 'undefined' && ProtocolsManager.setDateRange) {
            ProtocolsManager.setDateRange(dateStart, dateEnd);
        }
    },

    setOrdersPaymentFilter(value) {
        if (typeof ProtocolsManager !== 'undefined' && ProtocolsManager.setPaymentFilter) {
            ProtocolsManager.setPaymentFilter(value || 'all');
        }
    },

    clearOrdersFilters() {
        const dateStart = document.getElementById('orders-date-start');
        const dateEnd = document.getElementById('orders-date-end');
        const search = document.getElementById('orders-search');
        const payment = document.getElementById('orders-payment-filter');
        if (dateStart) dateStart.value = '';
        if (dateEnd) dateEnd.value = '';
        if (search) search.value = '';
        if (payment) payment.value = 'all';

        if (typeof ProtocolsManager !== 'undefined') {
            if (ProtocolsManager.searchProtocols) ProtocolsManager.searchProtocols('');
            if (ProtocolsManager.clearAdvancedFilters) ProtocolsManager.clearAdvancedFilters();
        }
    },

    // Legacy Kanban - REMOVED


    // --- Module 5: Financial Control (New Tab) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---
    // --- Module 5: Financial Control (Kanban + Manual) ---

    financialSearchDebounceMs: 250,
    _financialSearchTimer: null,
    currentFinancialRange: 'this-month',

    /** YYYY-MM-DD em data local (evita deslocar dia com toISOString). */
    formatFinDateLocal(d) {
        const x = d instanceof Date ? d : new Date(d);
        if (Number.isNaN(x.getTime())) return '';
        const y = x.getFullYear();
        const m = String(x.getMonth() + 1).padStart(2, '0');
        const day = String(x.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    /** Valor de input type=date (YYYY-MM-DD) -> Date local ao meio-dia. */
    parseFinDateInputValue(str) {
        if (!str || typeof str !== 'string') return null;
        const p = str.trim().split('-').map(Number);
        if (p.length !== 3 || !p[0]) return null;
        return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
    },

    /**
     * Ao iniciar o admin: datas do Financeiro = mês civil atual (label + inputs).
     * O carregamento dos dados ocorre ao abrir a aba Financeiro.
     */
    resetFinancialPeriodToCurrentMonth() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        const iS = document.getElementById('fin-date-start');
        const iE = document.getElementById('fin-date-end');
        if (iS) iS.value = this.formatFinDateLocal(start);
        if (iE) iE.value = this.formatFinDateLocal(end);
        this.currentFinancialRange = 'this-month';
        this._lastFinancialStartDate = new Date(start);
        this._lastFinancialEndDate = new Date(end);
        this._financialRenderCache = null;
        this.updateFinancialPeriodButtons('this-month');
        this.updateFinancialMonthNavigator(start, end);
    },
    _financialRenderCache: null,
    _lastFinancialStartDate: null,
    _lastFinancialEndDate: null,

    normalizeFinancialSearchText(value) {
        return (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    },

    parseMvManualOrders() {
        try {
            const raw = SafeStorage.getItem('mv_manual_orders') || '[]';
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('mv_manual_orders invalido, usando [].', e);
            return [];
        }
    },

    escapeFinancialCsvField(value) {
        const s = String(value ?? '');
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
    },

    /** Texto seguro para jsPDF (sem HTML). */
    financialPdfPlainText(value, maxLen = 90) {
        let s = String(value ?? '').replace(/<[^>]*>/g, ' ');
        s = s.replace(/\s+/g, ' ').trim();
        if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}...`;
        return s;
    },

    /** Permite apenas snippet HTML curto do CRM (ícones); bloqueia handlers e scripts. */
    sanitizeFinancialCrmIconHtml(raw, safeFallback) {
        const s = String(raw || '').trim();
        if (!s || !s.includes('<')) return safeFallback;
        if (/<script|on\w+\s*=|javascript:|data:text\/html|<iframe|<object|<embed/i.test(s)) return safeFallback;
        if (s.length > 500) return safeFallback;
        return s;
    },

    /** Zera os cinco KPIs do bloco Financeiro (período vazio ou erro). */
    resetFinancialSummaryCardsToZero() {
        ['fin-total-receivable', 'fin-total-paid', 'fin-total-expenses', 'fin-total-account', 'fin-total-cash'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.textContent = 'R$ 0,00';
        });
    },

    bindFinancialTableDelegation() {
        const tbody = document.getElementById('financial-table-body');
        if (!tbody || tbody.dataset.finClickBound) return;
        tbody.dataset.finClickBound = '1';
        tbody.addEventListener('click', (e) => {
            if (e.target.closest('[data-fin-stop]')) {
                const btn = e.target.closest('button[data-fin-act]');
                if (!btn || btn.disabled) return;
                const act = btn.dataset.finAct;
                const oid = decodeURIComponent(btn.dataset.finOid || '');
                if (act === 'pay') {
                    const total = Number(btn.dataset.finTotal);
                    const paid = Number(btn.dataset.finPaid);
                    this.openPaymentModal(oid, total, paid);
                } else if (act === 'dossier') {
                    this.openDossier(oid);
                } else if (act === 'edit') {
                    this.openEditDebtModal(oid);
                } else if (act === 'del') {
                    this.deleteManualDebt(oid);
                }
                return;
            }
            const tr = e.target.closest('tr[data-fin-row]');
            if (tr && tr.dataset.finRow) {
                this.openOrderDetails(decodeURIComponent(tr.dataset.finRow));
            }
        });
    },

    bindFinancialSectionControls() {
        const section = document.getElementById('financial');
        if (section && !section.dataset.finStatusBound) {
            section.dataset.finStatusBound = '1';
            section.addEventListener('click', (e) => {
                const b = e.target.closest('[data-fin-status]');
                if (!b) return;
                e.preventDefault();
                this.filterStatus(b.getAttribute('data-fin-status'));
            });
        }
        const search = document.getElementById('financial-search');
        if (search && !search.dataset.finSearchBound) {
            search.dataset.finSearchBound = '1';
            search.addEventListener('input', () => this.handleFinancialSearchInput());
        }
        this.bindFinancialPeriodPicker();
    },

    bindFinancialPeriodPicker() {
        const root = document.getElementById('financial-period-picker');
        if (!root || root.dataset.boundPeriodPicker) return;
        root.dataset.boundPeriodPicker = '1';

        const prev = document.getElementById('fin-period-prev');
        const next = document.getElementById('fin-period-next');
        const center = document.getElementById('financial-month-label');
        const searchBtn = document.getElementById('fin-period-search');
        const dropdown = document.getElementById('fin-period-dropdown');
        const customPanel = document.getElementById('fin-period-custom-panel');
        const applyBtn = document.getElementById('fin-period-apply');
        const cancelBtn = document.getElementById('fin-period-cancel');

        if (prev) prev.addEventListener('click', () => this.shiftFinancialMonth(-1));
        if (next) next.addEventListener('click', () => this.shiftFinancialMonth(1));
        if (searchBtn) searchBtn.addEventListener('click', () => this.applyCurrentFinancialPeriod());
        if (center) {
            center.addEventListener('click', (e) => {
                e.preventDefault();
                const open = dropdown && !dropdown.hidden;
                this.toggleFinancialPeriodDropdown(!open);
            });
        }
        if (dropdown) {
            dropdown.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-fin-preset]');
                if (!btn) return;
                const preset = btn.getAttribute('data-fin-preset');
                this.applyFinancialPreset(preset);
            });
        }
        if (applyBtn) applyBtn.addEventListener('click', () => this.applyFinancialCustomPeriod());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeFinancialPeriodPanels());

        document.addEventListener('click', (e) => {
            if (!root.contains(e.target)) this.closeFinancialPeriodPanels();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeFinancialPeriodPanels();
        });
    },

    toggleFinancialPeriodDropdown(open) {
        const dropdown = document.getElementById('fin-period-dropdown');
        const customPanel = document.getElementById('fin-period-custom-panel');
        const center = document.getElementById('financial-month-label');
        if (!dropdown || !customPanel || !center) return;
        dropdown.hidden = !open;
        customPanel.hidden = true;
        center.setAttribute('aria-expanded', open ? 'true' : 'false');
    },

    closeFinancialPeriodPanels() {
        const dropdown = document.getElementById('fin-period-dropdown');
        const customPanel = document.getElementById('fin-period-custom-panel');
        const center = document.getElementById('financial-month-label');
        if (dropdown) dropdown.hidden = true;
        if (customPanel) customPanel.hidden = true;
        if (center) center.setAttribute('aria-expanded', 'false');
    },

    applyCurrentFinancialPeriod() {
        if (this.currentFinancialRange === 'custom') {
            this.filterFinancial('custom');
            return;
        }
        this.renderFinancial();
    },

    applyFinancialPreset(preset) {
        this.closeFinancialPeriodPanels();
        if (preset === 'custom') {
            const panel = document.getElementById('fin-period-custom-panel');
            const dropdown = document.getElementById('fin-period-dropdown');
            if (dropdown) dropdown.hidden = true;
            if (panel) panel.hidden = false;
            return;
        }
        this.filterFinancial(preset || 'this-month');
    },

    applyFinancialCustomPeriod() {
        this.closeFinancialPeriodPanels();
        this.filterFinancial('custom');
    },

    handleFinancialSearchInput() {
        if (this._financialSearchTimer) {
            clearTimeout(this._financialSearchTimer);
        }
        this._financialSearchTimer = setTimeout(() => {
            if (this._financialRenderCache) {
                this.renderFinancial({
                    isBackground: true,
                    useCachedData: true,
                    startDate: this._lastFinancialStartDate,
                    endDate: this._lastFinancialEndDate
                });
                return;
            }
            this.renderFinancial();
        }, this.financialSearchDebounceMs);
    },

    updateFinancialPeriodButtons(rangeType) {
        const container = document.getElementById('financial');
        if (!container) return;

        container.querySelectorAll('[data-fin-range]').forEach(btn => {
            const isActive = btn.getAttribute('data-fin-range') === rangeType;
            if (isActive) {
                btn.classList.remove('filter-btn-ghost');
                btn.classList.add('filter-btn-action', 'active');
                btn.style.opacity = '1';
                btn.style.boxShadow = '0 0 0 2px #6366f1';
            } else {
                btn.classList.remove('filter-btn-action', 'active');
                btn.classList.add('filter-btn-ghost');
                btn.style.opacity = '0.7';
                btn.style.boxShadow = 'none';
            }
        });
    },

    updateFinancialMonthNavigator(startDate, endDate) {
        const label = document.getElementById('financial-month-label');
        if (!label) return;

        const s = startDate instanceof Date ? startDate : null;
        const e = endDate instanceof Date ? endDate : null;
        if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
            label.innerHTML = 'Período personalizado <i class="ph-bold ph-caret-down"></i>';
            label.title = 'Período personalizado';
            return;
        }

        const isFullMonth =
            s.getDate() === 1 &&
            e.getDate() === new Date(e.getFullYear(), e.getMonth() + 1, 0).getDate();

        if (isFullMonth) {
            const monthText = s.toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric'
            });
            const nice = monthText.charAt(0).toUpperCase() + monthText.slice(1);
            label.innerHTML = `${nice} <i class="ph-bold ph-caret-down"></i>`;
            label.title = nice;
            return;
        }

        const labels = {
            today: 'Hoje',
            'this-week': 'Esta semana',
            'this-month': 'Este mês',
            'last-month': 'Mês passado',
            'this-year': 'Este ano',
            'last-30-days': 'Últimos 30 dias',
            'last-12-months': 'Últimos 12 meses',
            'all-time': 'Todo o período',
            custom: 'Período personalizado'
        };
        const named = labels[this.currentFinancialRange];
        if (named) {
            label.innerHTML = `${named} <i class="ph-bold ph-caret-down"></i>`;
            label.title = named;
            return;
        } else {
            label.innerHTML = 'Período personalizado <i class="ph-bold ph-caret-down"></i>';
            label.title = 'Período personalizado';
            return;
        }
    },

    shiftFinancialMonth(step = 0) {
        const iEnd = document.getElementById('fin-date-end');
        let anchorMonth = null;
        if (this._lastFinancialStartDate instanceof Date && !Number.isNaN(this._lastFinancialStartDate.getTime())) {
            anchorMonth = new Date(
                this._lastFinancialStartDate.getFullYear(),
                this._lastFinancialStartDate.getMonth(),
                1
            );
        } else {
            const iS = document.getElementById('fin-date-start');
            const parsed = iS && iS.value ? this.parseFinDateInputValue(iS.value) : null;
            if (parsed && !Number.isNaN(parsed.getTime())) {
                anchorMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
            }
        }
        if (!anchorMonth) {
            const n = new Date();
            anchorMonth = new Date(n.getFullYear(), n.getMonth(), 1);
        }

        const start = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + Number(step || 0), 1);
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        const iS2 = document.getElementById('fin-date-start');
        if (iS2) iS2.value = this.formatFinDateLocal(start);
        if (iEnd) iEnd.value = this.formatFinDateLocal(end);

        const now = new Date();
        const startIdx = (start.getFullYear() * 12) + start.getMonth();
        const nowIdx = (now.getFullYear() * 12) + now.getMonth();
        const isThisMonth = startIdx === nowIdx;
        const isLastMonth = startIdx === (nowIdx - 1);

        this.currentFinancialRange = isThisMonth ? 'this-month' : (isLastMonth ? 'last-month' : 'custom');
        this.updateFinancialPeriodButtons(this.currentFinancialRange);
        this.updateFinancialMonthNavigator(start, end);
        this.renderFinancial({ startDate: start, endDate: end });
    },

    // Helper to calculate dates
    filterFinancial(rangeType) {
        const now = new Date();
        let start, end;

        if (rangeType === 'today') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'this-week') {
            const day = now.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
            end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'this-month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'this-year') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'last-30-days') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
            end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'last-12-months') {
            start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'all-time') {
            start = new Date(2020, 0, 1);
            end = new Date();
            end.setHours(23, 59, 59, 999);
        } else if (rangeType === 'custom') {
            const sVal = document.getElementById('fin-date-start').value;
            const eVal = document.getElementById('fin-date-end').value;
            if (!sVal || !eVal) {
                Swal.fire('Atenção', 'Selecione a data inicial e final.', 'warning');
                return;
            }
            start = this.parseFinDateInputValue(sVal);
            end = this.parseFinDateInputValue(eVal);
            if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                Swal.fire('Atenção', 'Datas inválidas. Tente novamente.', 'warning');
                return;
            }
            // End of the selected day
            end.setHours(23, 59, 59, 999);

            if (end < start) {
                Swal.fire('Atenção', 'A data final não pode ser menor que a inicial.', 'warning');
                return;
            }
        }

        const iStart = document.getElementById('fin-date-start');
        const iEnd = document.getElementById('fin-date-end');
        const fmtLocal = (d) => this.formatFinDateLocal(d);
        if (start && iStart) iStart.value = fmtLocal(start);
        if (end && iEnd) iEnd.value = fmtLocal(end);

        this.currentFinancialRange = rangeType;
        this.updateFinancialPeriodButtons(rangeType);
        this.updateFinancialMonthNavigator(start, end);
        this.closeFinancialPeriodPanels();
        this.renderFinancial({ startDate: start, endDate: end });
    },

    async renderFinancial(options = { isBackground: false, startDate: null, endDate: null }) {
        const tbody = document.getElementById('financial-table-body');
        if (!tbody) { console.error("Admin: Tbody missing"); return; }
        const QUERY_TIMEOUT_MS = 30000;
        const withTimeout = async (promise, label, timeoutMs = QUERY_TIMEOUT_MS) => {
            let timer = null;
            try {
                return await Promise.race([
                    promise,
                    new Promise((_, reject) => {
                        timer = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
                    })
                ]);
            } finally {
                if (timer) clearTimeout(timer);
            }
        };

        if (!options.isBackground) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#64748b;"><i class="ph-duotone ph-spinner-gap ph-spin" style="font-size:2rem;"></i><br>Carregando dados...</td></tr>';
            this.updateFinancialPeriodButtons(this.currentFinancialRange || 'this-month');
        }

        try {
            // Check UI Input Dates First, Default to This Month if empty
            let { startDate, endDate } = options;

            if (!startDate) {
                const iS = document.getElementById('fin-date-start');
                const iE = document.getElementById('fin-date-end');

                if (iS && iS.value && iE && iE.value) {
                    const parsedStart = this.parseFinDateInputValue(iS.value);
                    const parsedEnd = this.parseFinDateInputValue(iE.value);
                    if (parsedStart && parsedEnd) {
                        startDate = parsedStart;
                        endDate = parsedEnd;
                        endDate.setHours(23, 59, 59, 999);
                    }
                } else {
                    // Default to current month
                    const now = new Date();
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);

                    // Set inputs initial state
                    const fmtLocal = (d) => this.formatFinDateLocal(d);
                    if (iS && !iS.value) iS.value = fmtLocal(startDate);
                    if (iE && !iE.value) iE.value = fmtLocal(endDate);
                }
            }
            if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                const now = new Date();
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endDate.setHours(23, 59, 59, 999);
                const iS = document.getElementById('fin-date-start');
                const iE = document.getElementById('fin-date-end');
                const fmtLocal = (d) => this.formatFinDateLocal(d);
                if (iS) iS.value = fmtLocal(startDate);
                if (iE) iE.value = fmtLocal(endDate);
            }
            this.updateFinancialMonthNavigator(startDate, endDate);
            this._lastFinancialStartDate = startDate instanceof Date ? new Date(startDate) : null;
            this._lastFinancialEndDate = endDate instanceof Date ? new Date(endDate) : null;

            const useCachedData = !!options.useCachedData && !!this._financialRenderCache;
            let allRecords = [];
            let paymentsMap = {};
            let totalAccount = 0;
            let totalCash = 0;

            if (!useCachedData) {
            // 1+2 em paralelo: pedidos do período + financial_records (menos colunas = menos bytes)
            let orders = [];
            let cloudManualOrders = [];
            try {
                const finCols =
                    'id, customer_name, total, created_at, status, type, category, description';
                const ordersP = (async () => {
                    try {
                        if (window.OrderManager && typeof window.OrderManager.getOrdersBetweenForFinancial === 'function') {
                            return await withTimeout(
                                window.OrderManager.getOrdersBetweenForFinancial(startDate, endDate),
                                'OrderManager.getOrdersBetweenForFinancial'
                            );
                        }
                        if (window.OrderManager && typeof window.OrderManager.getOrdersBetween === 'function') {
                            return await withTimeout(
                                window.OrderManager.getOrdersBetween(startDate, endDate),
                                'OrderManager.getOrdersBetween'
                            );
                        }
                        if (window.OrderManager) {
                            let o = await withTimeout(
                                window.OrderManager.getAllOrders(),
                                'OrderManager.getAllOrders'
                            );
                            return o.filter((row) => {
                                const d = new Date(row.date);
                                return d >= startDate && d <= endDate;
                            });
                        }
                        return [];
                    } catch (e) {
                        console.error('Admin: System orders failed (ignored)', e);
                        return [];
                    }
                })();

                const manualP = (async () => {
                    if (!window.supabase) return [];
                    try {
                        const query = window.supabase
                            .from('financial_records')
                            .select(finCols)
                            .gte('created_at', startDate.toISOString())
                            .lte('created_at', endDate.toISOString())
                            .order('created_at', { ascending: false });
                        const { data, error } = await withTimeout(query, 'financial_records query');
                        if (error) {
                            console.error('Admin: Manual fetch failed', error);
                            if (typeof Swal !== 'undefined') {
                                Swal.fire({
                                    toast: true,
                                    position: 'top-end',
                                    icon: 'error',
                                    title: 'Erro de Banco de Dados',
                                    text: 'Tabela financial_records não encontrada ou erro de permissão.',
                                    showConfirmButton: false,
                                    timer: 5000
                                });
                            }
                            return [];
                        }
                        if (!data || !data.length) return [];
                        console.log(`Admin: Loaded ${data.length} manual records from DB (filtered)`);
                        return data.map((r) => ({
                            id: r.id,
                            customer_name: r.customer_name,
                            total: Number(r.total) || 0,
                            date: r.created_at,
                            status: r.status,
                            items: [{ name: r.description || 'Lançamento Manual', quantity: 1 }],
                            type: r.type || 'income',
                            category: r.category,
                            isManual: true,
                            source: 'cloud'
                        }));
                    } catch (err) {
                        console.error('Admin: Manual fetch failed', err);
                        return [];
                    }
                })();

                const [ord, manual] = await Promise.all([ordersP, manualP]);
                orders = ord || [];
                cloudManualOrders = manual || [];
                // Rejeitados/cancelados não entram no financeiro — filtrar ANTES do merge e dos pagamentos (evita KPI errado)
                const finDrop = (o) => {
                    const st = (o && o.status ? o.status : '').toString().toLowerCase();
                    return st === 'rejected' || st === 'cancelled';
                };
                orders = orders.filter((o) => !finDrop(o));
                cloudManualOrders = cloudManualOrders.filter((o) => !finDrop(o));
                console.log(`Admin: Loaded ${orders.length} system orders (period)`);
            } catch (e) {
                console.error('Admin: parallel financial fetch failed', e);
            }

            // 3. Load Local Manual Orders (Secondary) — só entram linhas cuja data cai no período
            let localManualOrders = [];
            const local = this.parseMvManualOrders();
            if (local.length > 0) {
                localManualOrders = local
                    .map((l) => ({ ...l, isManual: true, source: 'local' }))
                    .filter((o) => {
                        const d = o.date ? new Date(o.date) : null;
                        if (!d || Number.isNaN(d.getTime())) return false;
                        return d >= startDate && d <= endDate;
                    });
                if (localManualOrders.length > 0) {
                    console.log(`Admin: ${localManualOrders.length} lançamento(s) local(is) no período`);
                }
            }

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
                this._financialRenderCache = {
                    records: [],
                    paymentsMap: {},
                    totalAccount: 0,
                    totalCash: 0
                };
                this.lastFinancialRecords = [];
                this.lastPaymentsMap = {};
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align:center;padding:40px;color:#64748b;">
                            <i class="ph-duotone ph-magnifying-glass" style="font-size:2rem;margin-bottom:10px;"></i><br>
                            <strong>Nenhum registro neste período.</strong><br>
                            <span style="font-size:0.9em;display:block;margin:8px 0 14px;">Pedidos antigos podem estar fora das datas selecionadas. Amplie o período ou confira a conexão.</span>
                            <button type="button" onclick="adminApp.filterFinancial('last-30-days')" style="margin:4px;padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:600;color:#334155;">Últimos 30 dias</button>
                            <button type="button" onclick="adminApp.filterFinancial('this-year')" style="margin:4px;padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;font-weight:600;color:#334155;">Este ano</button>
                            <button type="button" onclick="adminApp.filterFinancial('all-time')" style="margin:4px;padding:8px 14px;border-radius:8px;border:1px solid #6366f1;background:#6366f1;color:#fff;cursor:pointer;font-weight:600;">Todo o período</button>
                        </td>
                    </tr>`;
                if (!options.isBackground && this.updateFinancialCards) this.updateFinancialCards([], {});
                this.resetFinancialSummaryCardsToZero();
                const wEmpty = document.getElementById('debtor-wallet-widget');
                if (wEmpty) {
                    wEmpty.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:10px;">Nenhum saldo em aberto neste período.</div>';
                }
                this.syncFinancialStatusFilterUi();
                return;
            }

            // 3. Merge All Records (Fix Duplicates)
            allRecords = [...orders, ...manualOrders];

            // 4. Payments (Scoped to currently loaded records)
            paymentsMap = {};
            totalAccount = 0;
            totalCash = 0;

            if (window.supabase) {
                try {
                    const allRecordIds = allRecords
                        .map(r => String(r.id || ''))
                        .filter(Boolean);

                    if (allRecordIds.length === 0) {
                        paymentsMap = {};
                    } else {
                        const CHUNK = 200;
                        for (let i = 0; i < allRecordIds.length; i += CHUNK) {
                            const chunk = allRecordIds.slice(i, i + CHUNK);
                            const { data: pay, error: payError } = await withTimeout(
                                window.supabase
                                    .from('order_payments')
                                    .select('order_id, amount, payment_method')
                                    .in('order_id', chunk),
                                `order_payments chunk ${Math.floor(i / CHUNK) + 1}`
                            );

                            if (!payError && pay) {
                                pay.forEach(p => {
                                    const amt = Number(p.amount);
                                    paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + amt;
                                    if (p.payment_method === 'cash') totalCash += amt;
                                    else totalAccount += amt;
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.error("Payment fetch error", e);
                }
            } else {
                let rawLocalPayments = {};
                try {
                    rawLocalPayments = JSON.parse(SafeStorage.getItem('mv_payments') || '{}') || {};
                } catch (e) {
                    console.warn('mv_payments invalido, ignorando.', e);
                }
                const allRecordIds = allRecords.map(r => String(r.id || ''));
                Object.entries(rawLocalPayments).forEach(([orderId, amount]) => {
                    if (!allRecordIds.includes(String(orderId))) return;
                    paymentsMap[orderId] = Number(amount) || 0;
                    totalAccount += Number(amount) || 0;
                });
            }
            this._financialRenderCache = {
                records: Array.isArray(allRecords) ? allRecords.slice() : [],
                paymentsMap: { ...paymentsMap },
                totalAccount,
                totalCash
            };
            } else {
                allRecords = Array.isArray(this._financialRenderCache.records)
                    ? this._financialRenderCache.records.slice()
                    : [];
                paymentsMap = { ...(this._financialRenderCache.paymentsMap || {}) };
                totalAccount = Number(this._financialRenderCache.totalAccount) || 0;
                totalCash = Number(this._financialRenderCache.totalCash) || 0;
            }

            // Pedidos rejeitados/cancelados não aparecem no financeiro (não são receita a receber)
            allRecords = allRecords.filter((r) => {
                const st = (r.status || '').toString().toLowerCase();
                return st !== 'rejected' && st !== 'cancelled';
            });

            // --- REMOVED EMERGENCY MOCK DATA ---

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
            const searchInput = document.getElementById('financial-search');
            const searchTerm = this.normalizeFinancialSearchText(searchInput ? searchInput.value : '');
            if (searchTerm) {
                allRecords = allRecords.filter(r =>
                    this.normalizeFinancialSearchText(r.customer_name).includes(searchTerm) ||
                    this.normalizeFinancialSearchText(String(r.id || '')).includes(searchTerm)
                );
            }

            // Store for details lookup & Export
            this.lastFinancialRecords = allRecords;
            this.lastPaymentsMap = paymentsMap; // Exposed for Print/Export

            // Sort by Date Descending
            allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

            let totalReceivable = 0;
            let totalPaid = 0;
            let totalExpensesKpi = 0;
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

            console.log('Admin: Rendering records', allRecords.length);
            allRecords.forEach(order => {
                try {
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
                        totalPaid -= total;
                        totalExpensesKpi += total;
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

                    const statusEsc = this.escapeChatHtml(String(order.status || 'pending'));
                    const typeBadge = isExpense
                        ? '<span class="status-badge" style="background:#fee2e2;color:#ef4444;">Despesa</span>'
                        : (isManual
                            ? '<span class="status-badge" style="background:#e0f2fe;color:#0369a1;">Avulso</span>'
                            : `<span class="status-badge">${statusEsc}</span>`);

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

                    // Radar CRM: limites em window.CRM_CONFIG (scripts/config/config.js)
                    const crmCfg = window.CRM_CONFIG || {};
                    const VIP_THRESHOLD = Number(crmCfg.VIP_THRESHOLD) || 1000;
                    const vipDefault = '<i class="ph-fill ph-crown" style="color:#f59e0b;font-size:1rem;" aria-hidden="true"></i>';
                    const debtDefault = '<i class="ph-bold ph-warning-circle" style="color:#ef4444;font-size:1rem;" aria-hidden="true"></i>';
                    const vipIconHtml = this.sanitizeFinancialCrmIconHtml(crmCfg.VIP_ICON, vipDefault);
                    const debtIconHtml = this.sanitizeFinancialCrmIconHtml(crmCfg.DEBT_ICON, debtDefault);

                    let crmBadges = '';
                    if (!isExpense && order.customer_name) {
                        const stats = customerStats[order.customer_name] || { spent: 0, debt: 0 };
                        if (stats.spent > VIP_THRESHOLD) {
                            crmBadges += `<span title="Cliente VIP (acima de R$ ${VIP_THRESHOLD})" style="cursor:help; margin-left:4px;">${vipIconHtml}</span>`;
                        }
                        if (stats.debt > 0) {
                            crmBadges += `<span title="Cliente com saldo em aberto" style="cursor:help; margin-left:4px;">${debtIconHtml}</span>`;
                        }
                    }

                    const encId = encodeURIComponent(String(order.id));
                    const dispId = this.escapeChatHtml(String(order.id));
                    const dispName = this.escapeChatHtml(
                        String(order.customer_name || (isExpense ? (order.description || '') : 'Cliente'))
                    );
                    const catLine = order.category
                        ? ` \u2022 ${this.escapeChatHtml(String(order.category))}`
                        : '';

                    html += `
            <tr class="${trClass}" style="cursor:pointer; transition:background 0.2s; ${rowStyle}" data-fin-row="${encId}" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='transparent'">
                <td style="font-weight:bold;">${isExpense ? '\uD83D\uDCC9' : (isManual ? '\uD83D\uDCDD' : '#')} ${dispId}</td>
                <td>
                    <div style="font-weight:600;">
                        ${dispName}
                        ${crmBadges}
                    </div>
                    <div style="font-size:0.8rem;color:#64748b;">${new Date(order.date).toLocaleDateString('pt-BR')}${catLine}</div>
                </td>
                <td>${typeBadge}</td>
                <td style="font-weight:700; color:${amountColor};">${amountPrefix}R$ ${total.toFixed(2)}</td>
                <td style="color:#10b981;">R$ ${paid.toFixed(2)}</td>
                <td style="font-weight:700; color:${debt > 0.01 ? '#ef4444' : '#94a3b8'};">R$ ${Math.max(0, debt).toFixed(2)}</td>
                <td data-fin-stop="1">
                    <button type="button" data-fin-act="pay" data-fin-oid="${encId}" data-fin-total="${total}" data-fin-paid="${paid}" class="${btnClass}" style="${btnStyle}" ${btnDisabled}>
                        ${btnLabel} <i class="ph-bold ph-money"></i>
                    </button>
                    ${!isManual && !isExpense ? `
                        <button type="button" data-fin-act="dossier" data-fin-oid="${encId}" style="background:#f1f5f9;border:1px solid #cbd5e1;padding:4px 8px;border-radius:6px;color:#3b82f6;cursor:pointer;margin-left:6px;vertical-align:middle;box-shadow:0 1px 2px rgba(0,0,0,0.05);" title="Editar pedido">
                            <i class="ph-bold ph-pencil-simple" style="font-size:1.1rem;"></i>
                        </button>
                    ` : ''}
                    ${isManual ? `
                        <button type="button" data-fin-act="edit" data-fin-oid="${encId}" style="background:none;border:none;color:#64748b;cursor:pointer;margin-left:5px;" title="Editar"><i class="ph-bold ph-pencil-simple"></i></button>
                        <button type="button" data-fin-act="del" data-fin-oid="${encId}" style="background:none;border:none;color:#94a3b8;cursor:pointer;margin-left:2px;" title="Excluir"><i class="ph-bold ph-trash"></i></button>
                    ` : ''}
                </td>
            </tr>
            `;

                } catch (rowError) {
                    console.error("Admin: Error rendering row for order", order, rowError);
                }
            });

            // Render Debtor Wallet Widget
            const walletContainer = document.getElementById('debtor-wallet-widget');
            if (walletContainer) {
                const sortedDebtors = Object.entries(debtors)
                    .sort(([, a], [, b]) => b.totalDebt - a.totalDebt); // Highest debt first

                if (sortedDebtors.length === 0) {
                    walletContainer.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:10px;">Nenhum saldo em aberto neste período.</div>';
                } else {
                    walletContainer.innerHTML = `
                    <div style="max-height: 200px; overflow-y: auto;">
                        <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
                            <thead class="fin-debtor-thead" style="position: sticky; top: 0;">
                                <tr style="border-bottom: 2px solid #f1f5f9; text-align: left; color: #64748b;">
                                    <th style="padding: 8px;">Cliente</th>
                                    <th style="padding: 8px;">Qtd Pendente</th>
                                    <th style="padding: 8px;">Total Devido</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sortedDebtors.map(([name, data]) => `
                                    <tr style="border-bottom: 1px solid #f8fafc;">
                                        <td style="padding: 8px; font-weight: 600; color: #1e293b;">${this.escapeChatHtml(name)}</td>
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

            const elExpKpi = document.getElementById('fin-total-expenses');
            if (elExpKpi) elExpKpi.innerText = `R$ ${totalExpensesKpi.toFixed(2)}`;

            this.syncFinancialStatusFilterUi();
            if (this.renderFinancialGoals) void this.renderFinancialGoals();
        } catch (fatalError) {
            console.error("Critical Error in renderFinancial:", fatalError);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#ef4444;">
                <i class="ph-bold ph-warning-circle" style="font-size:1.5rem;"></i><br>
                Erro ao carregar dados. Tente recarregar a página.
            </td></tr>`;
            this.resetFinancialSummaryCardsToZero();
            const wErr = document.getElementById('debtor-wallet-widget');
            if (wErr) wErr.innerHTML = '';
            this.syncFinancialStatusFilterUi();
        }
    },

    // --- FINANCIAL HISTORY LOGIC ---

    async logFinancialAction(actionType, entityId, description, extraData = {}) {
        if (!window.supabase) return; // Only log if online

        try {
            const user = window.currentUser?.email || window.authService?.user?.email || 'admin';
            const idText = String(entityId || '');
            await window.supabase.from('financial_history').insert({
                action_type: actionType,
                entity_type: idText.startsWith('EXP') ? 'expense' : 'manual_debt',
                entity_id: entityId,
                description: description,
                changed_by: user,
                old_value: extraData.old ? JSON.stringify(extraData.old) : null,
                new_value: extraData.new ? JSON.stringify(extraData.new) : JSON.stringify(extraData || {})
            });
            console.log(`Admin: Action logged (${actionType})`);
        } catch (e) {
            console.error("Admin: Failed to log action", e);
        }
    },

    async openFinancialHistory() {
        const modal = document.getElementById('modal-financial-history');
        const tbody = document.getElementById('financial-history-body');
        if (!modal || !tbody) return;
        modal.classList.add('open');
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Carregando...</td></tr>';

        if (!window.supabase) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Histórico disponível apenas online.</td></tr>';
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
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Nenhum histórico encontrado.</td></tr>';
                return;
            }

            tbody.innerHTML = data.map(log => {
                const date = new Date(log.created_at).toLocaleString('pt-BR');
                let badgeColor = '#64748b';
                let actionLabel = this.escapeChatHtml(String(log.action_type || ''));

                if (log.action_type === 'payment') { badgeColor = '#10b981'; actionLabel = 'Pagamento'; }
                if (log.action_type === 'create') { badgeColor = '#3b82f6'; actionLabel = 'Criação'; }
                if (log.action_type === 'delete') { badgeColor = '#ef4444'; actionLabel = 'Exclusão'; }

                const descEsc = this.escapeChatHtml(String(log.description || '-'));
                return `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px; font-size:0.9rem; color:#64748b;">${date}</td>
                        <td style="padding:10px;">
                            <span style="background:${badgeColor}; color:white; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${actionLabel}</span>
                        </td>
                        <td style="padding:10px; font-size:0.95rem; color:#334155;">${descEsc}</td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:red;">Erro ao carregar histórico.</td></tr>';
        }
    },

    syncFinancialStatusFilterUi() {
        const status = this.currentStatusFilter || 'all';
        const container = document.querySelector('#financial');
        if (!container) return;
        container.querySelectorAll('[data-fin-status]').forEach(btn => {
            const st = btn.getAttribute('data-fin-status');
            const active = st === status;
            if (active) {
                btn.classList.remove('filter-btn-ghost');
                btn.classList.add('filter-btn-action', 'active');
                btn.style.opacity = '1';
                btn.style.boxShadow = '0 0 0 2px #6366f1';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.classList.remove('filter-btn-action', 'active');
                btn.classList.add('filter-btn-ghost');
                btn.style.opacity = '0.6';
                btn.style.boxShadow = 'none';
                btn.style.transform = 'scale(1)';
            }
        });
    },

    async filterStatus(status) {
        this.currentStatusFilter = status;
        this.syncFinancialStatusFilterUi();
        if (this._financialRenderCache) {
            this.renderFinancial({
                isBackground: true,
                useCachedData: true,
                startDate: this._lastFinancialStartDate,
                endDate: this._lastFinancialEndDate
            });
        } else {
            this.renderFinancial();
        }
        const map = { all: 'Todos', pending: 'A receber', paid: 'Pagos' };
        if (typeof Swal !== 'undefined') {
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'info', title: `Filtro: ${map[status] || status}` });
        }
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
                    
                    <div style="margin-top: 15px; display:flex; flex-direction:column; gap:8px;">
                        <button class="btn-primary" onclick="adminApp.downloadFinancialQuotePDF('${orderId}')" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 10px; font-size: 0.95rem; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border: none; border-radius: 6px; cursor: pointer; color: white; font-weight: 600;">
                            <i class="ph-bold ph-file-pdf" style="font-size: 1.1rem;"></i> Baixar Orçamento em PDF
                        </button>
                        <button class="btn-secondary" onclick="adminApp.openDossier('${orderId}')" style="width: 100%; display: flex; justify-content: center; align-items: center; gap: 8px; padding: 10px; font-size: 0.95rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; color: #334155; font-weight: 600; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <i class="ph-bold ph-pencil-simple" style="font-size: 1.1rem;"></i> Editar no Dossiê
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
            window.open('../pages/quote.html?source=admin', '_blank');
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
        const sid = String(id ?? '').trim();
        const list = this.lastFinancialRecords || [];
        const record = list.find(r => String(r.id ?? '').trim() === sid);
        if (!record) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'warning', title: 'Registro não encontrado', text: 'Recarregue a aba Financeiro e tente de novo.', timer: 3500, showConfirmButton: false });
            }
            return;
        }

        document.getElementById('modal-manual-debt').classList.add('open');
        document.querySelector('#modal-manual-debt h3').innerText = 'Editar Lancamento';

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

    /** Legado: mesmo comportamento que clearAllChats (sem reload). */
    forceClearChats() {
        this.clearAllChats();
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

    // --- EXP. CSV (ver na tela ou baixar) ---
    buildFinancialCsvBlob: function () {
        const records = this.getFinancialExportRecords();
        const map = this.lastPaymentsMap || {};
        const esc = (v) => this.escapeFinancialCsvField(v);
        const meta = this.getFinancialExportMeta();
        const prelude = [meta.periodLine, meta.filterLine];
        if (meta.searchLine) prelude.push(meta.searchLine);
        const preludeCsv = prelude.map((line) => esc(line)).join('\n') + '\n\n';

        const header = ['Tipo', 'ID', 'Cliente', 'Data', 'Itens', 'Total (R$)', 'Pago (R$)', 'Restante (R$)']
            .map((h) => esc(h))
            .join(',');
        let csvContent = preludeCsv + `${header}\n`;

        records.forEach((r) => {
            const date = new Date(r.date).toLocaleDateString('pt-BR');
            const total = Number(r.total) || 0;
            const paid = Number(map[r.id] ?? map[String(r.id)]) || 0;
            const debt = Math.max(0, total - paid);
            const tipo = r.type === 'expense' ? 'Despesa' : 'Receita';
            let itemsStr = '';
            if (r.items) {
                if (typeof r.items === 'string') {
                    itemsStr = r.items;
                } else if (Array.isArray(r.items)) {
                    itemsStr = r.items.map((i) => (i && i.name != null ? String(i.name) : '')).filter(Boolean).join(' | ');
                }
            }
            const row = [
                tipo,
                String(r.id ?? ''),
                r.customer_name || 'Desconhecido',
                date,
                itemsStr,
                total.toFixed(2),
                paid.toFixed(2),
                debt.toFixed(2)
            ]
                .map((c) => esc(c))
                .join(',');
            csvContent += `${row}\n`;
        });

        return new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
    },

    exportFinancialToCSV: function () {
        if (!this.getFinancialExportRecords().length) {
            Swal.fire('Atenção', 'Nenhum registro para exportar. Carregue a lista ou ajuste os filtros.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Exportar planilha (CSV)',
            html:
                '<p style="margin:0 0 10px;color:#475569;font-size:0.95rem;">Use os dados <strong>visíveis agora</strong> na tabela financeira.</p>' +
                '<p style="margin:0;color:#64748b;font-size:0.875rem;">Abrir no navegador para conferir ou baixar o arquivo?</p>',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            focusConfirm: false,
            confirmButtonText: 'Baixar CSV',
            denyButtonText: 'Ver na tela',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#10b981',
            denyButtonColor: '#3b82f6',
            cancelButtonColor: '#94a3b8',
            reverseButtons: true
        }).then((result) => {
            if (!result.isConfirmed && !result.isDenied) return;

            const blob = this.buildFinancialCsvBlob();
            const fileName = `marcaviva_financeiro_${this.getFinancialExportFileSuffix()}.csv`;

            if (result.isConfirmed) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                Swal.fire({ title: 'Download iniciado', text: fileName, icon: 'success', timer: 2500 });
            } else {
                const url = URL.createObjectURL(blob);
                const win = window.open(url, '_blank');
                if (win == null) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Não foi possível abrir',
                        text: 'Permita pop-ups ou use Baixar CSV.',
                        confirmButtonColor: '#3b82f6'
                    });
                }
                setTimeout(() => URL.revokeObjectURL(url), 120000);
            }
        });
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
            if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Nome e valor alvo sao obrigatorios!', 'warning');
            else alert('Nome e valor alvo sao obrigatorios!');
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
                if (typeof Swal !== 'undefined') Swal.fire('Erro', 'Erro ao salvar meta.', 'error');
                else alert('Erro ao salvar meta.');
            } else {
                Swal.fire('Novo Sonho!', 'Meta criada com sucesso.', 'success');
                this.closeModals();
                this.fetchGoals(); // Refresh
            }
        } else {
            if (typeof Swal !== 'undefined') Swal.fire('Atencao', 'Funcionalidade disponivel apenas online.', 'info');
            else alert('Funcionalidade disponivel apenas online.');
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

    /**
     * Exportação “completa” (legado): baixa **todo** o `financial_records` na nuvem ou `mv_manual_orders` offline,
     * **sem** filtro de período. Para o que está visível na aba Financeiro, use `exportFinancialToCSV`.
     */
    async exportFinancials() {
        let data = [];
        if (window.supabase) {
            const { data: dbData } = await window.supabase
                .from('financial_records')
                .select('*')
                .order('created_at', { ascending: false });
            if (dbData) data = dbData;
        } else {
            try {
                data = JSON.parse(SafeStorage.getItem('mv_manual_orders') || '[]');
            } catch (e) {
                data = [];
            }
        }

        if (data.length === 0) {
            if (typeof Swal !== 'undefined') Swal.fire('Vazio', 'Nada para exportar.', 'info');
            return;
        }

        const esc = (v) => this.escapeFinancialCsvField(v);
        const header = ['Data', 'Descrição', 'Tipo', 'Valor (R$)', 'Status', 'Cliente']
            .map((h) => esc(h))
            .join(',');
        let csvContent = `${header}\n`;

        data.forEach((row) => {
            const date = new Date(row.created_at || row.date).toLocaleDateString('pt-BR');
            const desc = String(row.description || '').replace(/\s+/g, ' ').trim();
            const type = row.type === 'expense' ? 'Despesa' : 'Receita';
            const value = row.total != null ? Number(row.total).toFixed(2) : '0.00';
            const status = row.status === 'paid' ? 'Pago' : 'Pendente';
            const client = String(row.customer_name || '');
            const line = [date, desc, type, value, status, client].map((c) => esc(c)).join(',');
            csvContent += `${line}\n`;
        });

        const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `marca_viva_financeiro_completo_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Exportação completa',
                text: 'Arquivo com todo o histórico (sem filtro de período). Na aba Financeiro use Exportar CSV para exportar só o período visível.',
                timer: 4200
            });
        }
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
            if (typeof Swal !== 'undefined') {
                Swal.fire('Erro', 'N\u00e3o foi poss\u00edvel criar o backup: ' + (error.message || String(error)), 'error');
            }
        }
    },

    // === Gráficos do dashboard (pedidos, consulta leve) ===
    async renderCharts() {
        if (!window.Chart) return;

        const mapProtocolsToIncome = (rows) =>
            (rows || []).map((p) => ({
                created_at: p.created_at,
                total: Number(p.total_amount),
                type: 'income',
                category: 'Pedidos'
            }));

        try {
            if (!window.supabase) {
                this.renderRevenueChart([]);
                this.renderCategoriesChart([]);
                return;
            }

            const since = new Date();
            since.setDate(since.getDate() - 90);
            const { data: protocols, error } = await window.supabase
                .from('protocols')
                .select('created_at, total_amount')
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            const mapped = mapProtocolsToIncome(protocols || []);
            this.renderRevenueChart(mapped);
            this.renderCategoriesChart(mapped);
        } catch (e) {
            console.error('Chart Error:', e);
            this.renderRevenueChart([]);
            this.renderCategoriesChart([]);
        }
    },

    renderRevenueChart(financials) {
        const ctx = document.getElementById('chart-revenue');
        if (!ctx) return;

        const now = new Date();
        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            last30Days.push(this.formatFinDateLocal(d));
        }

        const dailyRevenue = {};
        last30Days.forEach((date) => {
            dailyRevenue[date] = 0;
        });

        (financials || []).forEach((rec) => {
            if (rec.type !== 'income') return;
            const key = this.formatFinDateLocal(new Date(rec.created_at));
            if (Object.prototype.hasOwnProperty.call(dailyRevenue, key)) {
                dailyRevenue[key] += parseFloat(rec.total) || 0;
            }
        });

        // Destroy existing chart if any
        if (this._revenueChart) this._revenueChart.destroy();

        this._revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last30Days.map((key) => {
                    const p = key.split('-').map(Number);
                    if (p.length !== 3) return key;
                    return `${String(p[2]).padStart(2, '0')}/${String(p[1]).padStart(2, '0')}`;
                }),
                datasets: [{
                    label: 'Receita diaria (pedidos)',
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

        // Count by type (simplificado; pode evoluir com categorias reais)
        const categories = {};
        (financials || []).forEach(rec => {
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

        const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const labels = sorted.length ? sorted.map(([name]) => name) : ['Sem dados'];
        const data = sorted.length ? sorted.map(([, count]) => count) : [1];
        const colors = sorted.length ? palette.slice(0, sorted.length) : ['#94a3b8'];

        this._categoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors
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
            html += `<option value="${root.name}">${root.name}</option>`;
        });

        // Add "Other"
        html += '<option value="Outros">Outros</option>';
        // Allow creating new? Select doesn't allow typing easily.
        // User manages cats in Settings now.

        select.innerHTML = html;
        
        const subSelect = document.getElementById('prod-subcategory');
        if (subSelect) {
            subSelect.innerHTML = '<option value="">Selecione a Categoria Principal primeiro...</option>';
        }
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

        const { value: formValues } = await Swal.fire({
            title: title,
            html: `
                <input id="swal-cat-name-admin" class="swal2-input" placeholder="Nome da Categoria">
                <div style="margin-top: 15px; text-align: left; display: flex; align-items: center; gap: 8px; justify-content: center;">
                    <input type="checkbox" id="swal-cat-featured-admin" style="width: 20px; height: 20px;">
                    <label for="swal-cat-featured-admin" style="font-weight: 500; cursor: pointer;">Fixar no Menu Principal do Site? ⭐</label>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Salvar',
            confirmButtonColor: '#ea580c',
            preConfirm: () => {
                const name = document.getElementById('swal-cat-name-admin').value;
                if (!name) {
                    Swal.showValidationMessage('O nome é obrigatório');
                    return false;
                }
                const featured = document.getElementById('swal-cat-featured-admin').checked;
                return { name, featured };
            }
        });

        if (formValues) {
            await this.createCategory(formValues.name, parentId, formValues.featured);
        }
    },

    async createCategory(name, parentId, featured = false) {
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

        const payload = { name, slug, featured };
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



// --- SIMPLIFIED KANBAN: Order Management Functions ---
adminApp.currentOrderFilter = 'all';

window.adminApp.searchProtocols = function (term) {
    if (window.ProtocolsManager && window.ProtocolsManager.searchProtocols) {
        window.ProtocolsManager.searchProtocols(term);
    }
};

window.adminApp.uploadMockupGestao = async function (protocolId) {
    const input = document.getElementById(`mockup-upload-gestao-${protocolId}`);
    if (!input || !input.files || input.files.length === 0) {
        Swal.fire('Atenção', 'Selecione um arquivo (PDF, PNG ou JPG) para enviar primeiro.', 'warning');
        return;
    }

    const file = input.files[0];

    // 1. Perguntar o Identificador (Nome da Arte)
    const { value: artName } = await Swal.fire({
        title: 'Identificar Arquivo',
        text: 'Qual produto ou peça este arquivo representa?',
        input: 'text',
        inputPlaceholder: 'Ex: Camiseta Frente, Mochila Costas...',
        showCancelButton: true,
        confirmButtonText: 'Subir Arquivo',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) return 'Escreva um nome para ajudar a confecção!'
        }
    });

    if (!artName) {
        input.value = "";
        return;
    }

    try {
        Swal.showLoading();
        if (!window.StorageManager) throw new Error("StorageManager não inicializado.");

        // Upload with unique timestamp and random string
        const stamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileUrl = await window.StorageManager.uploadFile(file, `order_mockups/${protocolId}_${stamp}_${randomString}`, 'products');

        if (!fileUrl) throw new Error("Falha ao gerar URL do arquivo.");

        // Atualizar Array no DB em vez de Substituir a String Inteira
        // Primeiro precisamos resgatar a current state (o ProtolsManager deve nos fornecer ou fetch raw)
        const cachedProtocol = window.ProtocolsManager && window.ProtocolsManager.state
            ? window.ProtocolsManager.state.protocols.find(p => p.id === protocolId)
            : null;

        let currentMockups = [];
        if (cachedProtocol && cachedProtocol.mockup_url) {
            try {
                currentMockups = cachedProtocol.mockup_url.startsWith('[') ? JSON.parse(cachedProtocol.mockup_url) : [{ name: 'Arte Principal', url: cachedProtocol.mockup_url }];
            } catch (e) { }
        } else {
            // Fallback to fetch se não tiver no cache (raro)
            const { data: pDB } = await window.supabase.from('protocols').select('mockup_url').eq('id', protocolId).single();
            if (pDB && pDB.mockup_url) {
                try {
                    currentMockups = pDB.mockup_url.startsWith('[') ? JSON.parse(pDB.mockup_url) : [{ name: 'Arte Principal', url: pDB.mockup_url }];
                } catch (e) { }
            }
        }

        currentMockups.push({ name: artName, url: fileUrl });
        const newJsonStr = JSON.stringify(currentMockups);

        // Salvar JSON no banco
        await KanbanService.updateProtocolDetails(protocolId, { mockup_url: newJsonStr });

        // Aviso Sucesso Silencioso
        const Toast = Swal.mixin({
            toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true
        });
        Toast.fire({ icon: "success", title: "Arte anexada com sucesso!" });

        // Recarrega visualização
        if (window.ProtocolsManager && window.ProtocolsManager.viewDetails) {
            window.ProtocolsManager.viewDetails(protocolId);
            window.ProtocolsManager.loadProtocols();
        }

    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Não foi possível fazer o upload da arte: ' + error.message, 'error');
    }
};

window.adminApp.removeMockupGestao = async function (protocolId, mockupIndex) {
    const cachedProtocol = window.ProtocolsManager && window.ProtocolsManager.state
        ? window.ProtocolsManager.state.protocols.find(p => p.id === protocolId)
        : null;

    let currentMockups = [];
    if (cachedProtocol && cachedProtocol.mockup_url) {
        try {
            currentMockups = cachedProtocol.mockup_url.startsWith('[') ? JSON.parse(cachedProtocol.mockup_url) : [{ name: 'Arte Principal', url: cachedProtocol.mockup_url }];
        } catch (e) { }
    }

    const arteAlvo = currentMockups[mockupIndex];
    if (!arteAlvo) return;

    const { isConfirmed } = await Swal.fire({
        title: 'Remover Arte?',
        html: `O arquivo <strong>"${arteAlvo.name}"</strong> será desvinculado permanentemente deste pedido.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sim, remover'
    });

    if (!isConfirmed) return;

    try {
        Swal.showLoading();

        currentMockups.splice(mockupIndex, 1);
        const newJsonStr = currentMockups.length > 0 ? JSON.stringify(currentMockups) : null;

        await KanbanService.updateProtocolDetails(protocolId, { mockup_url: newJsonStr });

        Swal.close();
        if (window.ProtocolsManager && window.ProtocolsManager.viewDetails) {
            window.ProtocolsManager.viewDetails(protocolId);
            window.ProtocolsManager.loadProtocols();
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Erro', 'Falha ao remover a arte.', 'error');
    }
};

adminApp.updateOrdersStats = function () {
    if (typeof ProtocolsManager === 'undefined' || !ProtocolsManager.state || !ProtocolsManager.state.protocols) return;

    const stats = { pending: 0, production: 0, completed: 0, total: ProtocolsManager.state.protocols.length };

    ProtocolsManager.state.protocols.forEach(order => {
        const status = order.status || 'inquiry';
        if (status === 'inquiry' || status === 'pending' || status === 'approved') stats.pending++;
        else if (status === 'production') stats.production++;
        else if (status === 'completed' || status === 'delivered') stats.completed++;
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
    if (typeof ProtocolsManager === 'undefined') return;
    const term =
        searchTerm != null && searchTerm !== ''
            ? searchTerm
            : (document.getElementById('orders-search')?.value || '');
    if (ProtocolsManager.searchProtocols) ProtocolsManager.searchProtocols(term);
    else ProtocolsManager.loadProtocols();
};

adminApp.refreshOrders = async function (evt) {
    const btn = evt && evt.target ? evt.target.closest('button') : null;
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
            <div id="new-order-scroll" style="text-align: left; max-height: min(72vh, 640px); overflow-x: hidden; overflow-y: auto; padding-right: 4px; max-width: 100%; box-sizing: border-box; word-wrap: break-word;">
                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <h4 style="margin: 0 0 12px 0; color: #334155;">📋 Dados do Cliente</h4>
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Nome *</label>
                        <input id="client-name" class="swal2-input" placeholder="Nome do cliente" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 12px;">
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Email</label>
                            <input id="client-email" type="email" class="swal2-input" placeholder="email@exemplo.com" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
                        </div>
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Telefone</label>
                            <input id="client-phone" class="swal2-input" placeholder="(31) 99999-9999" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
                        </div>
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <h4 style="margin: 0 0 6px 0; color: #334155;">📦 Itens do pedido</h4>
                    <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #64748b; line-height: 1.35; word-wrap: break-word;">
                        Em cada item: <strong>1ª linha</strong> = nome curto (aparece no Kanban). <strong>Linhas de baixo</strong> = o que é o produto, cores, logo, referência… (opcional).
                    </p>
                    <div id="products-list" style="max-width: 100%; overflow-x: hidden;"></div>
                    <button type="button" onclick="adminApp.addProductRow()" class="swal2-confirm swal2-styled" 
                        style="margin-top: 10px; background: #22c55e; max-width: 100%; box-sizing: border-box;">
                        <i class="ph-bold ph-plus"></i> Adicionar item
                    </button>
                </div>

                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <h4 style="margin: 0 0 12px 0; color: #334155;">🚚 Frete &amp; pagamento</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 12px; margin-bottom: 12px;">
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Frete (R$)</label>
                            <input id="order-shipping" type="number" class="swal2-input" placeholder="0" step="0.01" min="0" value="0" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;" oninput="adminApp.updateTotal()">
                        </div>
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Sinal / já recebido (R$)</label>
                            <input id="order-paid" type="number" class="swal2-input" placeholder="0" step="0.01" min="0" value="0" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;" oninput="adminApp.updateTotal()">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr)); gap: 12px; margin-bottom: 12px;">
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Forma de pagamento</label>
                            <select id="order-pay-method" class="swal2-input" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box; cursor: pointer;">
                                <option value="">A definir</option>
                                <option value="pix">PIX</option>
                                <option value="transfer">Transferência</option>
                                <option value="card">Cartão</option>
                                <option value="boleto">Boleto</option>
                                <option value="cash">Dinheiro</option>
                            </select>
                        </div>
                        <div style="min-width: 0;">
                            <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Canal de origem</label>
                            <select id="order-channel" class="swal2-input" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box; cursor: pointer;">
                                <option value="">Não informado</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="instagram">Instagram</option>
                                <option value="site">Site</option>
                                <option value="referral">Indicação</option>
                                <option value="event">Evento / feira</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Prazo desejado (entrega)</label>
                        <input id="order-desired-date" type="date" class="swal2-input" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
                    </div>
                </div>

                <div style="background: #f8fafc; padding: 12px; border-radius: 8px; max-width: 100%; box-sizing: border-box; overflow-x: hidden;">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; font-weight: 600; margin-bottom: 5px; font-size: 0.9rem;">Observações</label>
                        <textarea id="order-notes" class="swal2-textarea" placeholder="Observações internas, endereço de entrega, NF..." style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box; min-height: 72px;"></textarea>
                    </div>
                    <div style="font-size: 0.9rem; color: #64748b; padding: 8px 0; border-top: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px;"><span style="min-width: 0;">Subtotal itens</span><span style="white-space: nowrap;">R$ <span id="order-subtotal-items">0,00</span></span></div>
                        <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px 12px;"><span style="min-width: 0;">Frete</span><span style="white-space: nowrap;">R$ <span id="order-shipping-display">0,00</span></span></div>
                    </div>
                    <div style="text-align: right; font-size: clamp(0.95rem, 4vw, 1.1rem); font-weight: 700; color: #334155; padding-top: 10px; border-top: 2px solid #e2e8f0; word-break: break-word;">
                        Total do pedido: R$ <span id="order-total">0,00</span>
                    </div>
                    <div style="text-align: right; font-size: 0.85rem; color: #059669; margin-top: 6px; line-height: 1.4; word-break: break-word;">
                        Já recebido: R$ <span id="order-paid-display">0,00</span><br><span style="display:inline-block; margin-top:2px;">Resta: R$ <span id="order-balance">0,00</span></span>
                    </div>
                </div>
            </div>
        `,
        width: 'min(720px, calc(100vw - 20px))',
        customClass: { popup: 'mv-swal-new-order' },
        showCancelButton: true,
        confirmButtonText: 'Criar Pedido',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        didOpen: () => {
            if (!document.getElementById('mv-swal-new-order-css')) {
                const st = document.createElement('style');
                st.id = 'mv-swal-new-order-css';
                st.textContent = '.mv-swal-new-order.swal2-popup{max-width:min(720px,calc(100vw - 20px))!important;width:100%!important;box-sizing:border-box;padding-left:12px;padding-right:12px;}' +
                    '.mv-swal-new-order .swal2-html-container{overflow-x:hidden!important;max-width:100%!important;padding:0 2px!important;box-sizing:border-box;}' +
                    '.mv-swal-new-order .swal2-actions{flex-wrap:wrap!important;gap:8px!important;}';
                document.head.appendChild(st);
            }
            const popup = typeof Swal !== 'undefined' && Swal.getPopup ? Swal.getPopup() : null;
            if (popup) {
                popup.style.overflowX = 'hidden';
                popup.style.maxWidth = 'min(720px, calc(100vw - 20px))';
            }
            const hc = typeof Swal !== 'undefined' && Swal.getHtmlContainer ? Swal.getHtmlContainer() : null;
            if (hc) {
                hc.style.overflowX = 'hidden';
                hc.style.maxWidth = '100%';
            }
            adminApp.addProductRow();
            const phoneEl = document.getElementById('client-phone');
            if (phoneEl) {
                phoneEl.addEventListener('input', function () {
                    let d = this.value.replace(/\D/g, '').slice(0, 11);
                    if (d.length > 10) {
                        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
                    } else if (d.length > 6) {
                        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
                    } else if (d.length > 2) {
                        this.value = '(' + d.slice(0, 2) + ') ' + d.slice(2);
                    } else if (d.length > 0) {
                        this.value = d.length === 1 ? '(' + d : '(' + d;
                    }
                });
            }
        },
        preConfirm: () => {
            const clientName = document.getElementById('client-name').value.trim();
            const clientEmail = document.getElementById('client-email').value.trim();
            const clientPhone = document.getElementById('client-phone').value.trim();
            const notesRaw = document.getElementById('order-notes').value.trim();
            const shipping = parseFloat(document.getElementById('order-shipping').value) || 0;
            let paidAmount = parseFloat(document.getElementById('order-paid').value) || 0;
            const paymentMethod = (document.getElementById('order-pay-method') || {}).value || '';
            const channel = (document.getElementById('order-channel') || {}).value || '';
            const desiredDate = (document.getElementById('order-desired-date') || {}).value || '';

            if (!clientName) {
                Swal.showValidationMessage('Nome do cliente é obrigatório');
                return false;
            }

            const products = [];
            document.querySelectorAll('.product-row').forEach(row => {
                const specEl = row.querySelector('.product-spec');
                const parsed = specEl ? adminApp.parseProductItemSpec(specEl.value) : null;
                const qty = parseInt(row.querySelector('.product-qty').value) || 0;
                const price = parseFloat(row.querySelector('.product-price').value) || 0;

                if (parsed && parsed.name && qty > 0 && price > 0) {
                    products.push({
                        name: parsed.name,
                        quantity: qty,
                        unit_price: price,
                        total_price: qty * price,
                        description: parsed.description || ''
                    });
                }
            });

            if (products.length === 0) {
                Swal.showValidationMessage('Cada item precisa de texto na 1ª linha (nome), quantidade maior que zero e preço.');
                return false;
            }

            const itemsSubtotal = products.reduce((sum, p) => sum + p.total_price, 0);
            const totalAmount = itemsSubtotal + shipping;

            if (paidAmount < 0) paidAmount = 0;
            if (paidAmount > totalAmount + 0.009) {
                Swal.showValidationMessage('Valor recebido não pode ser maior que o total do pedido');
                return false;
            }

            const channelLabels = { whatsapp: 'WhatsApp', instagram: 'Instagram', site: 'Site', referral: 'Indicação', event: 'Evento / feira', other: 'Outro' };
            const noteLines = [];
            if (channel) noteLines.push('Canal: ' + (channelLabels[channel] || channel));
            if (desiredDate) {
                const [y, m, d] = desiredDate.split('-');
                if (y && m && d) noteLines.push('Prazo desejado (entrega): ' + d + '/' + m + '/' + y);
            }
            if (shipping > 0.009) noteLines.push('Frete: R$ ' + shipping.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            if (notesRaw) noteLines.push(notesRaw);
            const notes = noteLines.length ? noteLines.join('\n') : '';

            let paymentStatus = 'pending';
            if (paidAmount >= totalAmount - 0.009 && totalAmount > 0) {
                paymentStatus = 'paid_full';
            } else if (paidAmount > 0.009) {
                paymentStatus = 'partial';
            }

            return {
                clientName,
                clientEmail,
                clientPhone,
                notes,
                products,
                totalAmount,
                itemsSubtotal,
                shipping,
                paidAmount,
                paymentMethod,
                paymentStatus
            };
        }
    });

    if (formData) {
        await this.createNewOrder(formData);
    }
};

/** 1ª linha = nome do item (lista/Kanban); demais linhas = detalhes → customization_details.text */
adminApp.parseProductItemSpec = function (raw) {
    const t = (raw || '').trim();
    if (!t) return null;
    const lines = t.split(/\r?\n/).map(function (l) { return l.trim(); });
    const first = (lines[0] || '').trim();
    if (!first) return null;
    const name = first.length > 200 ? first.slice(0, 200) : first;
    const rest = lines.slice(1).filter(Boolean).join('\n').trim();
    return { name: name, description: rest };
};

adminApp.addProductRow = function () {
    const container = document.getElementById('products-list');
    const row = document.createElement('div');
    row.className = 'product-row';
    row.style.cssText = 'padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; max-width: 100%; box-sizing: border-box; overflow-x: hidden;';

    row.innerHTML = `
        <textarea class="swal2-textarea product-spec" rows="3" spellcheck="false"
            placeholder="Caneca cerâmica 325ml\nBranca, logo frente em laser, Pantone 485 C, caixa kraft"
            style="margin: 0 0 10px 0; width: 100%; max-width: 100%; box-sizing: border-box; min-height: 64px; font-size: 0.9rem; resize: vertical; overflow-x: hidden;"></textarea>
        <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; max-width: 100%;">
            <div style="min-width: 0;">
                <label style="display:block; font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Qtd</label>
                <input type="number" class="swal2-input product-qty" min="1" value="1" oninput="adminApp.updateTotal()" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
            </div>
            <div style="min-width: 0;">
                <label style="display:block; font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Preço unit.</label>
                <input type="number" class="swal2-input product-price" placeholder="0,00" step="0.01" min="0" oninput="adminApp.updateTotal()" style="margin: 0; width: 100%; max-width: 100%; box-sizing: border-box;">
            </div>
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; max-width: 100%;">
            <div style="min-width: 0;">
                <span style="font-size:0.7rem; font-weight:700; color:#64748b; text-transform:uppercase;">Subtotal</span>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.95rem; word-break: break-word;">R$ <span class="product-total">0,00</span></div>
            </div>
            <button type="button" onclick="this.closest('.product-row').remove(); adminApp.updateTotal();" title="Remover item"
                style="flex-shrink: 0; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; cursor: pointer;">
                <i class="ph-bold ph-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(row);
    adminApp.updateTotal();
};

adminApp._fmtMoney = function (n) {
    return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

adminApp.updateTotal = function () {
    let itemsSub = 0;
    document.querySelectorAll('.product-row').forEach(row => {
        const qty = parseInt(row.querySelector('.product-qty').value) || 0;
        const price = parseFloat(row.querySelector('.product-price').value) || 0;
        const productTotal = qty * price;
        const pt = row.querySelector('.product-total');
        if (pt) pt.textContent = adminApp._fmtMoney(productTotal);
        itemsSub += productTotal;
    });
    const shipEl = document.getElementById('order-shipping');
    const paidEl = document.getElementById('order-paid');
    const shipping = shipEl ? (parseFloat(shipEl.value) || 0) : 0;
    const paid = paidEl ? (parseFloat(paidEl.value) || 0) : 0;
    const grand = itemsSub + shipping;
    const balance = Math.max(0, grand - paid);

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = adminApp._fmtMoney(val);
    };
    set('order-subtotal-items', itemsSub);
    set('order-shipping-display', shipping);
    set('order-total', grand);
    set('order-paid-display', paid);
    set('order-balance', balance);
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

        const protocolRow = {
            id: orderId,
            client_name: formData.clientName,
            client_email: formData.clientEmail || null,
            client_phone: formData.clientPhone || null,
            total_amount: formData.totalAmount,
            paid_amount: formData.paidAmount != null ? formData.paidAmount : 0,
            payment_status: formData.paymentStatus || 'pending',
            status: 'inquiry',
            column_id: 1,
            notes: formData.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        if (formData.paymentMethod) protocolRow.payment_method = formData.paymentMethod;

        const { error: protocolError } = await window.supabase
            .from('protocols')
            .insert(protocolRow);

        if (protocolError) throw protocolError;

        const items = formData.products.map(product => {
            const row = {
                protocol_id: orderId,
                product_name: product.name,
                quantity: product.quantity,
                unit_price: product.unit_price,
                total_price: product.total_price
            };
            const desc = (product.description || '').trim();
            if (desc) row.customization_details = { text: desc };
            return row;
        });

        const { error: itemsError } = await window.supabase
            .from('protocol_items')
            .insert(items);

        if (itemsError) throw itemsError;

        const fmt = (n) => (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        await Swal.fire({
            icon: 'success',
            title: 'Pedido Criado!',
            html: `
                <p>Pedido <strong>${orderId}</strong> foi criado com sucesso!</p>
                <p><strong>Cliente:</strong> ${formData.clientName}</p>
                <p><strong>Total:</strong> R$ ${fmt(formData.totalAmount)}</p>
                ${(formData.paidAmount || 0) > 0.009 ? `<p><strong>Já recebido:</strong> R$ ${fmt(formData.paidAmount)} · <strong>Resta:</strong> R$ ${fmt(formData.totalAmount - formData.paidAmount)}</p>` : ''}
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

// Merge with existing window.adminApp (important for modularity)
// Final merge to ensure any properties added by scripts that ran before this one are preserved.
// Though with the current script order (admin.js first), this is mostly defensive.
window.adminApp = Object.assign(window.adminApp || {}, adminApp);
