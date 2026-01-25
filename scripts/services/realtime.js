/**
 * Marca Viva - Realtime Admin Updates + Smart Polling
 * Escuta mudanças no banco de dados e atualiza o painel automaticamente.
 * Polling só ativa se cair a conexão.
 */

const RealtimeManager = {
    subscription: null,
    debounceTimers: {},
    pollingInterval: null,
    isConnected: false,

    init() {
        if (!window.supabase) {
            console.error("Realtime: Supabase não encontrado.");
            this.updateStatus('error', 'Sem conexão');
            return;
        }

        console.log("Realtime: Inicializando escuta de eventos...");
        this.updateStatus('connecting', 'Conectando...');

        // 1. WebSocket Subscription (A preferência)
        this.subscription = window.supabase
            .channel('admin-dashboard-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public' },
                (payload) => {
                    this.handleEvent(payload);
                }
            )
            .subscribe((status) => {
                console.log("Realtime Status:", status);
                if (status === 'SUBSCRIBED') {
                    this.isConnected = true;
                    this.updateStatus('live', 'Ao Vivo');
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.isConnected = false;
                    this.updateStatus('error', 'Desconectado (Usando Backup)');
                }
            });

        // 2. Polling Fallback (Backup silencioso)
        // Só roda se a conexão cair (!isConnected)
        this.startPolling(5000);
    },

    handleEvent(payload) {
        console.log("Realtime Event recebido:", payload);
        const { table } = payload;
        this.refreshViews(table);
    },

    refreshViews(tableOrScope) {
        // Passa flag 'isBackground: true' para não mostrar "Carregando..."
        const options = { isBackground: true };

        switch (tableOrScope) {
            case 'orders':
            case 'order_items':
            case 'financial':
                this.scheduleUpdate('kanban', () => {
                    if (window.adminApp) {
                        if (adminApp.renderKanban) adminApp.renderKanban(options); // Pass option
                        if (adminApp.renderFinancial) adminApp.renderFinancial(options); // Pass option
                        if (adminApp.renderDashboard) adminApp.renderDashboard();
                    }
                });
                break;

            case 'financial_records':
            case 'order_payments':
                this.scheduleUpdate('financial', () => {
                    if (window.adminApp && adminApp.renderFinancial) adminApp.renderFinancial(options);
                });
                break;

            case 'inventory_items':
            case 'inventory_movements':
            case 'products':
            case 'inventory':
                this.scheduleUpdate('inventory', () => {
                    if (window.adminApp) {
                        if (adminApp.renderInventoryView) adminApp.renderInventoryView(options);
                        if (adminApp.renderProductsTable) adminApp.renderProductsTable(options);
                        if (adminApp.renderDashboard) adminApp.renderDashboard();
                        if (adminApp.renderInputsTable) adminApp.renderInputsTable(options);
                    }
                });
                break;

            case 'all':
                // Full Refresh (apenas se desconectado)
                this.scheduleUpdate('all', () => {
                    if (window.adminApp) {
                        if (adminApp.renderKanban) adminApp.renderKanban(options);
                        if (adminApp.renderFinancial) adminApp.renderFinancial(options);
                        // Outros menos visíveis não precisam de options se não piscam
                    }
                });
                break;
        }
    },

    startPolling(ms) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => {
            // SÓ ATUALIZA SE A CONEXÃO ESTIVER CAÍDA
            if (!this.isConnected) {
                console.log("Realtime: Conexão perdida, executando fallback...");
                this.refreshViews('all');
            }
        }, ms);
    },

    scheduleUpdate(key, callback) {
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        this.debounceTimers[key] = setTimeout(() => {
            callback();
            delete this.debounceTimers[key];
        }, 1000);
    },

    updateStatus(state, msg) {
        const el = document.getElementById('realtime-indicator');
        if (!el) return;

        let color = '#94a3b8';
        let dotColor = '#cbd5e1';

        if (state === 'live') {
            color = '#10b981'; // green
            dotColor = '#10b981';
        } else if (state === 'error') {
            color = '#f59e0b'; // orange
            dotColor = '#f59e0b';
        }

        el.innerHTML = `
            <span style="height:8px;width:8px;background:${dotColor};border-radius:50%;display:inline-block;margin-right:6px;box-shadow: 0 0 0 2px ${dotColor}33;"></span>
            <span style="color:${color};font-weight:600;font-size:0.75rem;">${msg}</span>
        `;
    }
};

window.RealtimeManager = RealtimeManager;
