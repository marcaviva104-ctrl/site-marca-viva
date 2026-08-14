/**
 * Admin Protocols Management
 * Handles listing, approving, and rejecting budget protocols.
 */

const ProtocolsManager = {
    /** Incrementado a cada loadProtocols — evita corrida (2 chamadas: skeleton da 2ª apaga a tabela da 1ª). */
    _loadProtocolsSeq: 0,

    /** Cache session (stale-while-revalidate): lista aparece em ~0ms na 2ª visita / troca de aba. */
    _PROTOCOLS_SWR_STORAGE_KEY: 'mv_admin_protocols_swr_v2',
    _PROTOCOLS_SWR_MAX_AGE_MS: 3 * 60 * 1000,

    _protocolsSwrKey() {
        const f = String(ProtocolsManager.state.filter || 'all');
        const d0 = String(ProtocolsManager.state.dateStart || '');
        const d1 = String(ProtocolsManager.state.dateEnd || '');
        return `${f}|${d0}|${d1}`;
    },

    _mapRawRowsToState(rawList) {
        return (rawList || []).map((p) => {
            let items = [];
            if (p.items) {
                try {
                    items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
                } catch (e) {
                    items = [];
                }
            }
            if (!Array.isArray(items)) items = [];
            return { ...p, items };
        });
    },

    /** Se houver cache válido para o filtro atual, preenche a tabela na hora e devolve true. */
    _tryProtocolsSwr(mySeq) {
        try {
            const raw = sessionStorage.getItem(ProtocolsManager._PROTOCOLS_SWR_STORAGE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || parsed.k !== ProtocolsManager._protocolsSwrKey()) return false;
            if (!parsed.ts || Date.now() - parsed.ts > ProtocolsManager._PROTOCOLS_SWR_MAX_AGE_MS) return false;
            if (!Array.isArray(parsed.rows)) return false;
            if (mySeq !== ProtocolsManager._loadProtocolsSeq) return false;
            ProtocolsManager.state.protocols = ProtocolsManager._mapRawRowsToState(parsed.rows);
            ProtocolsManager.render();
            if (typeof adminApp !== 'undefined' && adminApp.updateOrdersStats) {
                adminApp.updateOrdersStats();
            }
            ProtocolsManager.updateBadge();
            const meta = document.getElementById('orders-list-meta');
            if (meta) meta.textContent = 'Lista em cache · sincronizando com o servidor…';
            return true;
        } catch (e) {
            return false;
        }
    },

    _saveProtocolsSwr() {
        try {
            const rows = (ProtocolsManager.state.protocols || []).map((p) => ({ ...p }));
            sessionStorage.setItem(
                ProtocolsManager._PROTOCOLS_SWR_STORAGE_KEY,
                JSON.stringify({
                    k: ProtocolsManager._protocolsSwrKey(),
                    ts: Date.now(),
                    rows
                })
            );
        } catch (e) {
            /* quota / privado */
        }
    },

    escapeHtml: (s) =>
        String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;'),

    /** HTML da linha de carregamento (substitui skeleton solto na tabela). */
    getOrdersLoadingHtml: () => `
        <tr>
            <td colspan="7" class="orders-loading-cell">
                <div class="orders-loading-block">
                    <i class="ph-bold ph-spinner orders-report__spin" aria-hidden="true"></i>
                    <strong>Carregando pedidos</strong>
                    <span>Buscando os registros no Supabase. Pode levar alguns segundos se o projeto estiver em repouso ou a rede estiver lenta.</span>
                    <div class="orders-skeleton-mini" aria-hidden="true">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                    </div>
                </div>
            </td>
        </tr>
    `,

    updateListMeta: (visibleCount) => {
        const el = document.getElementById('orders-list-meta');
        if (!el) return;
        const loaded = (ProtocolsManager.state.protocols && ProtocolsManager.state.protocols.length) || 0;
        const t = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        let parts = [`Atualizado às ${t}`, `${visibleCount} visível(is) na tabela`, `${loaded} pedido(s) carregado(s)`];
        const ds = ProtocolsManager.state.dateStart;
        const de = ProtocolsManager.state.dateEnd;
        if (ds || de) {
            parts.push(`período no servidor: ${ds || '…'} a ${de || '…'}`);
        } else if (loaded >= 50) {
            parts.push('lista limitada aos 50 mais recentes');
        }
        el.textContent = parts.join(' · ');
    },

    state: {
        protocols: [],
        filter: 'all', // Changed from inquiry to all so orders are immediately visible
        search: '',
        paymentFilter: 'all',
        dateStart: '',
        dateEnd: ''
    },

    getCurrentActor: () => {
        const user = window.authService?.user || null;
        return {
            id: user?.id || null,
            email: user?.email || null,
            role: user?.role || null
        };
    },

    logAudit: async ({ action, entityType = 'protocol', entityId = null, beforeData = null, afterData = null, metadata = null }) => {
        try {
            if (!window.supabase) return;

            const actor = ProtocolsManager.getCurrentActor();
            const payload = {
                actor_id: actor.id,
                actor_email: actor.email,
                actor_role: actor.role,
                action,
                entity_type: entityType,
                entity_id: entityId ? String(entityId) : null,
                before_data: beforeData,
                after_data: afterData,
                metadata: metadata || {}
            };

            const { error } = await window.supabase
                .from('admin_audit_logs')
                .insert(payload);

            if (error) {
                // Non-blocking by design: operational actions should not fail due to audit issues.
                console.warn('Audit log non-blocking error:', error.message || error);
            }
        } catch (auditErr) {
            console.warn('Audit log exception (ignored):', auditErr);
        }
    },

    init: () => {
        console.log("Protocols Manager Initialized");
        // Expose to global adminApp if needed or just use directly
        window.adminApp = window.adminApp || {};
        window.adminApp.openProtocols = ProtocolsManager.openProtocols;
        window.adminApp.filterProtocols = ProtocolsManager.setFilter;
        window.adminApp.setOrdersPaymentFilter = ProtocolsManager.setPaymentFilter;
        window.adminApp.setOrdersDateRange = ProtocolsManager.setDateRange;
        window.adminApp.clearOrdersAdvancedFilters = ProtocolsManager.clearAdvancedFilters;
        window.adminApp.approveProtocol = ProtocolsManager.approve;
        window.adminApp.rejectProtocol = ProtocolsManager.reject;
        window.adminApp.promoteProtocol = ProtocolsManager.promoteStatus;
        window.adminApp.notifyCustomerCompleted = ProtocolsManager.notifyCustomerCompleted;
        window.adminApp.viewProtocolDetails = ProtocolsManager.viewDetails;
        window.adminApp.printProtocol = ProtocolsManager.printProtocol;
    },

    openProtocols: () => {
        // Switch View (handled by admin.js logic usually, but we ensure data load)
        ProtocolsManager.loadProtocols();
    },

    loadProtocols: async () => {
        const mySeq = ++ProtocolsManager._loadProtocolsSeq;
        const listBody = document.getElementById('protocols-list-body');

        // Meta: resposta rápida; cache SWR cobre 2ª carga; timeout curto evita espera longa na rede ruim.
        const LIST_QUERY_TIMEOUT_MS = 12000;
        const LIST_QUERY_RETRIES = 1;
        const PAYMENTS_QUERY_TIMEOUT_MS = 10000;
        const withTimeout = (promise, ms, label) =>
            Promise.race([
                promise,
                new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    label ||
                                        `Tempo esgotado (${Math.round(ms / 1000)}s). Verifique a conexão ou atualize a página.`
                                )
                            ),
                        ms
                    )
                )
            ]);

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        /** Colunas usadas na lista/ações rápidas — evita trazer linha inteira (payload menor). */
        const PROTOCOLS_LIST_COLUMNS =
            'id, client_id, client_name, client_email, client_phone, created_at, ' +
            'total_amount, final_amount, status, payment_status, items, wants_nfe, tax_amount';

        const swrHit = ProtocolsManager._tryProtocolsSwr(mySeq);
        if (!swrHit && listBody && mySeq === ProtocolsManager._loadProtocolsSeq) {
            listBody.innerHTML = ProtocolsManager.getOrdersLoadingHtml();
            const meta = document.getElementById('orders-list-meta');
            if (meta) meta.textContent = 'Carregando…';
        }

        try {
            // Lista: só colunas de protocols (sem join protocol_items — muito mais rápido).
            // Itens completos vêm em viewDetails / editProtocol / printProtocol.
            const buildListQuery = () => {
                const hasServerDate = !!(ProtocolsManager.state.dateStart || ProtocolsManager.state.dateEnd);
                const cap = hasServerDate ? 200 : 50;
                let q = window.supabase
                    .from('protocols')
                    .select(PROTOCOLS_LIST_COLUMNS)
                    .order('created_at', { ascending: false })
                    .limit(cap);
                if (ProtocolsManager.state.filter !== 'all') {
                    q = q.eq('status', ProtocolsManager.state.filter);
                }
                if (ProtocolsManager.state.dateStart) {
                    const startD = new Date(`${ProtocolsManager.state.dateStart}T00:00:00`);
                    if (!Number.isNaN(startD.getTime())) {
                        q = q.gte('created_at', startD.toISOString());
                    }
                }
                if (ProtocolsManager.state.dateEnd) {
                    const endD = new Date(`${ProtocolsManager.state.dateEnd}T23:59:59.999`);
                    if (!Number.isNaN(endD.getTime())) {
                        q = q.lte('created_at', endD.toISOString());
                    }
                }
                return q;
            };

            let data;
            let error;
            let lastErr;
            for (let attempt = 0; attempt <= LIST_QUERY_RETRIES; attempt++) {
                if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;
                try {
                    const res = await withTimeout(
                        buildListQuery(),
                        LIST_QUERY_TIMEOUT_MS,
                        'Lista de pedidos demorou demais. Verifique a rede ou o Supabase.'
                    );
                    data = res.data;
                    error = res.error;
                    if (!error) {
                        lastErr = null;
                        break;
                    }
                    lastErr = error;
                } catch (e) {
                    lastErr = e;
                    if (attempt < LIST_QUERY_RETRIES) {
                        await sleep(600 * (attempt + 1));
                        continue;
                    }
                    throw e;
                }
                if (error && attempt < LIST_QUERY_RETRIES) {
                    await sleep(600 * (attempt + 1));
                    continue;
                }
                if (error) break;
            }

            if (error) throw error;
            if (lastErr && !data) throw lastErr;

            if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;

            ProtocolsManager.state.protocols = (data || []).map(p => {
                let items = [];
                if (p.items) {
                    try {
                        items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
                    } catch (e) {
                        items = [];
                    }
                }
                if (!Array.isArray(items)) items = [];
                return { ...p, items };
            });

            ProtocolsManager._saveProtocolsSwr();

            // Render first to avoid blocking UI while payments load
            if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;
            ProtocolsManager.render();
            if (typeof adminApp !== 'undefined' && adminApp.updateOrdersStats) {
                adminApp.updateOrdersStats();
            }
            ProtocolsManager.updateBadge();

            // Fetch payments in background (non-blocking)
            const protocolIds = ProtocolsManager.state.protocols.map(p => p.id);
            ProtocolsManager.state.paymentsMap = {};
            ProtocolsManager.state.paymentsDetailsCard = {};

            if (protocolIds.length > 0 && window.supabase) {
                try {
                    const paymentsQuery = window.supabase
                        .from('order_payments')
                        .select('order_id, amount, payment_method, paid_at, created_at, notes')
                        .in('order_id', protocolIds);

                    const { data: paymentsData, error: paymentsError } = await withTimeout(
                        paymentsQuery,
                        PAYMENTS_QUERY_TIMEOUT_MS,
                        'Pagamentos dos pedidos demoraram demais.'
                    );

                    if (paymentsError) {
                        console.warn('Erro não-crítico ao buscar pagamentos:', paymentsError);
                    } else if (paymentsData) {
                        if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;
                        const paymentsMap = {};
                        const paymentsDetailsCard = {};

                        paymentsData.forEach(p => {
                            // Sum for the badge/display map
                            paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + Number(p.amount);

                            // History for the PDF
                            if (!paymentsDetailsCard[p.order_id]) paymentsDetailsCard[p.order_id] = [];
                            paymentsDetailsCard[p.order_id].push(p);
                        });

                        ProtocolsManager.state.paymentsMap = paymentsMap;
                        ProtocolsManager.state.paymentsDetailsCard = paymentsDetailsCard;
                        if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;
                        ProtocolsManager.render();
                    }
                } catch (paymentErr) {
                    console.warn('Exceção ao buscar pagamentos:', paymentErr);
                }
            }

        } catch (err) {
            if (mySeq !== ProtocolsManager._loadProtocolsSeq) return;
            console.error('Erro ao carregar protocolos DO BANCO:', err);
            let errorMessage = 'Erro desconhecido.';
            if (err) {
                errorMessage = err.message || err.details || JSON.stringify(err);
            }
            const safe = ProtocolsManager.escapeHtml(errorMessage);
            if (listBody) {
                listBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="orders-loading-cell">
                            <div class="orders-error-panel">
                                <h3>Não foi possível carregar a lista</h3>
                                <p>Verifique a internet, se o projeto Supabase está ativo e tente novamente.</p>
                                <code>${safe}</code>
                                <button type="button" class="btn-primary" onclick="window.ProtocolsManager && window.ProtocolsManager.loadProtocols()">
                                    <i class="ph-bold ph-arrows-clockwise"></i> Tentar de novo
                                </button>
                            </div>
                        </td>
                    </tr>`;
            }
            const meta = document.getElementById('orders-list-meta');
            if (meta) meta.textContent = 'Lista não atualizada — erro ao buscar dados.';
        }
    },

    setFilter: (filter) => {
        ProtocolsManager.state.filter = filter;

        // Update UI Buttons
        const container = document.querySelector('#orders .filter-toolbar');
        if (container) {
            container.querySelectorAll('.filter-btn-ghost, .filter-btn-action').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === filter) btn.classList.add('active');
            });
        }

        ProtocolsManager.loadProtocols();
    },

    searchProtocols: (term) => {
        ProtocolsManager.state.search = term;
        ProtocolsManager.render();
    },

    setPaymentFilter: (paymentFilter) => {
        ProtocolsManager.state.paymentFilter = paymentFilter || 'all';
        ProtocolsManager.render();
    },

    setDateRange: (start, end) => {
        ProtocolsManager.state.dateStart = start || '';
        ProtocolsManager.state.dateEnd = end || '';
        const dateStartInput = document.getElementById('orders-date-start');
        const dateEndInput = document.getElementById('orders-date-end');
        if (dateStartInput) dateStartInput.value = ProtocolsManager.state.dateStart;
        if (dateEndInput) dateEndInput.value = ProtocolsManager.state.dateEnd;
        try {
            sessionStorage.removeItem(ProtocolsManager._PROTOCOLS_SWR_STORAGE_KEY);
        } catch (e) { /* ignore */ }
        ProtocolsManager.loadProtocols();
    },

    clearAdvancedFilters: (options = {}) => {
        const { reload = true } = options;
        ProtocolsManager.state.filter = 'all';
        ProtocolsManager.state.paymentFilter = 'all';
        ProtocolsManager.state.dateStart = '';
        ProtocolsManager.state.dateEnd = '';
        ProtocolsManager.state.search = '';
        const container = document.querySelector('#orders .filter-toolbar');
        if (container) {
            container.querySelectorAll('.filter-btn-ghost, .filter-btn-action').forEach((btn) => {
                btn.classList.remove('active');
                if (btn.dataset.filter === 'all') btn.classList.add('active');
            });
        }
        const paymentSelect = document.getElementById('orders-payment-filter');
        const dateStartInput = document.getElementById('orders-date-start');
        const dateEndInput = document.getElementById('orders-date-end');
        const searchInput = document.getElementById('orders-search');
        if (paymentSelect) paymentSelect.value = 'all';
        if (dateStartInput) dateStartInput.value = '';
        if (dateEndInput) dateEndInput.value = '';
        if (searchInput) searchInput.value = '';
        try {
            sessionStorage.removeItem(ProtocolsManager._PROTOCOLS_SWR_STORAGE_KEY);
        } catch (e) { /* ignore */ }
        if (reload) ProtocolsManager.loadProtocols();
    },

    updateBadge: async () => {
        // Count pending
        try {
            const { count, error } = await window.supabase
                .from('protocols')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'inquiry');

            const badge = document.getElementById('protocols-badge');
            if (badge) {
                if (!error && count > 0) {
                    badge.innerText = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (e) { }
    },

    render: () => {
        const container = document.getElementById('protocols-list-body');
        if (!container) return;

        const list = ProtocolsManager.state.protocols;
        const paymentsMap = ProtocolsManager.state.paymentsMap || {};

        // Badges for status
        const badges = {
            'inquiry': '<span class="status-badge status-warning">Aguardando Aprovação</span>',
            'pending': '<span class="status-badge status-warning">Aguardando Aprovação</span>',
            'approved': '<span class="status-badge status-success">Aprovado</span>',
            'rejected': '<span class="status-badge status-danger">Rejeitado</span>',
            'production': '<span class="status-badge status-info">Em Produção</span>',
            'completed': '<span class="status-badge status-success">Concluído</span>',
            'cancelled': '<span class="status-badge status-danger">Cancelado</span>'
        };

        // Actions for status
        const getActions = (p) => ({
            'inquiry': `
                <button onclick="adminApp.approveProtocol('${p.id}')" class="btn-icon text-success" data-tooltip="Aprovar Protocolo">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button onclick="adminApp.rejectProtocol('${p.id}')" class="btn-icon text-danger" data-tooltip="Rejeitar Protocolo">
                    <i class="ph-bold ph-x"></i>
                </button>
            `,
            'pending': `
                <button onclick="adminApp.approveProtocol('${p.id}')" class="btn-icon text-success" data-tooltip="Aprovar Protocolo">
                    <i class="ph-bold ph-check"></i>
                </button>
                <button onclick="adminApp.rejectProtocol('${p.id}')" class="btn-icon text-danger" data-tooltip="Rejeitar Protocolo">
                    <i class="ph-bold ph-x"></i>
                </button>
            `,
            'approved': `
                <button onclick="adminApp.promoteProtocol('${p.id}', 'production', 'Mandar para Produção?')" class="btn-icon text-primary" data-tooltip="Mandar para Produção">
                    <i class="ph-bold ph-gear"></i>
                </button>
            `,
            'production': `
                <button onclick="adminApp.promoteProtocol('${p.id}', 'completed', 'Finalizar Pedido?')" class="btn-icon text-success" data-tooltip="Concluir Pedido">
                    <i class="ph-bold ph-check-circle"></i>
                </button>
            `,
            'completed': `
                <button onclick="adminApp.notifyCustomerCompleted('${p.id}')" class="btn-icon text-primary" data-tooltip="Avisar Cliente via WhatsApp">
                    <i class="ph-bold ph-whatsapp-logo"></i>
                </button>
            `
        });

        // Search
        const normalize = (value) => (value || '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        const searchQuery = normalize(ProtocolsManager.state.search);
        const paymentFilter = ProtocolsManager.state.paymentFilter || 'all';
        const dateStart = ProtocolsManager.state.dateStart ? new Date(`${ProtocolsManager.state.dateStart}T00:00:00`) : null;
        const dateEnd = ProtocolsManager.state.dateEnd ? new Date(`${ProtocolsManager.state.dateEnd}T23:59:59.999`) : null;

        let filtered = ProtocolsManager.state.protocols.filter(p => {
            if (ProtocolsManager.state.filter !== 'all' && p.status !== ProtocolsManager.state.filter) return false;

            if (paymentFilter !== 'all') {
                const paymentStatus = (p.payment_status || '').toLowerCase();
                const isPaid = paymentStatus.includes('paid');
                if (paymentFilter === 'paid' && !isPaid) return false;
                if (paymentFilter === 'pending' && isPaid) return false;
            }

            if (dateStart || dateEnd) {
                const createdAt = new Date(p.created_at);
                if (dateStart && createdAt < dateStart) return false;
                if (dateEnd && createdAt > dateEnd) return false;
            }

            if (searchQuery) {
                const clientName = normalize(p.client_name);
                const clientEmail = normalize(p.client_email);
                const protocolId = normalize(String(p.id || ''));
                return (
                    clientName.includes(searchQuery) ||
                    clientEmail.includes(searchQuery) ||
                    protocolId.includes(searchQuery)
                );
            }
            return true;
        });

        if (filtered.length === 0) {
            // 5. Empty States Premium Display
            let emptyIcon = ProtocolsManager.state.filter === 'inquiry' ? 'ph-clock' :
                ProtocolsManager.state.filter === 'production' ? 'ph-gear' : 'ph-package';

            let emptyMessage = ProtocolsManager.state.filter === 'inquiry' ? 'Nenhuma aprovação pendente' :
                ProtocolsManager.state.filter === 'production' ? 'Nada em produção no momento' : 'Nenhum pedido encontrado';

            const emptyHint =
                ProtocolsManager.state.protocols.length > 0
                    ? 'Nenhum resultado com os filtros atuais. Limpe a busca ou amplie o período.'
                    : 'Os pedidos aparecerão aqui após o carregamento.';

            container.innerHTML = `
                <tr>
                    <td colspan="7" class="orders-empty-state" style="text-align:center;">
                        <i class="ph-duotone ${emptyIcon}" style="font-size: 3rem; color: #cbd5e1; margin-bottom: 4px;"></i>
                        <div class="orders-empty-title">${emptyMessage}</div>
                        <div class="orders-empty-hint">${emptyHint}</div>
                    </td>
                </tr>
            `;
            ProtocolsManager.updateListMeta(0);
            return;
        }

        container.innerHTML = filtered.map(p => {
            const date = new Date(p.created_at);
            let rawId = p.id.toString();
            // Evita hash duplo caso já venha do BD
            const displayId = rawId.startsWith('#') ? rawId : '#' + rawId;

            // 3. Relative Time Logic inline (Safe fallback)
            let dateDisplay = ProtocolsManager.formatRelativeTime(p.created_at);
            let timeDisplay = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Quick Copy injection
            const copyIdHtml = `<i class="ph-bold ph-copy quick-copy" data-tooltip="Copiar ID" onclick="adminApp.copyToClipboard('${displayId}', this)"></i>`;

            return `
                <tr>
                    <td style="font-family:monospace; font-weight:600; color:#475569;">
                        ${displayId.slice(0, 8)} ${copyIdHtml}
                    </td>
                    <td>
                        <div style="font-weight:600; color:#1e293b;">${p.client_name || 'Desconhecido'}</div>
                        <div style="font-size:0.8rem; color:#64748b;">${p.client_email || 'Sem email'}</div>
                    </td>
                    <td>
                        <div style="font-weight:500; color:#475569;">${dateDisplay}</div>
                        <div style="font-size:0.8rem; color:#94a3b8;">${timeDisplay}</div>
                    </td>
                    <td>
                        <div style="font-weight:600; color:#3b82f6;">R$ ${(p.final_amount != null && p.final_amount !== '' ? Number(p.final_amount) : Number(p.total_amount || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        ${(() => {
                const t = Number(p.total_amount || 0);
                const f = p.final_amount != null && p.final_amount !== '' ? Number(p.final_amount) : null;
                if (f == null || Number.isNaN(f) || Math.abs(f - t) < 0.005) return '';
                return `<div class="orders-row-total-note">Subtotal R$ ${t.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>`;
            })()}
                    </td>
                    <td>${badges[p.status] || `<span class="status-badge" style="background:#f1f5f9; color:#475569;">${p.status}</span>`}</td>
                    <td>
                        ${(p.payment_status === 'paid' || p.payment_status === 'paid_full') ? '<span class="status-badge status-success" style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph-bold ph-check"></i> Pago</span>' : (p.payment_status === 'partial' ? '<span class="status-badge" style="padding: 4px 8px; font-size: 0.75rem; background:#fef3c7;color:#b45309;"><i class="ph-bold ph-coins"></i> Parcial</span>' : '<span class="status-badge status-warning" style="padding: 4px 8px; font-size: 0.75rem;"><i class="ph-bold ph-clock"></i> Pendente</span>')}
                    </td>
                    <td style="text-align:center; white-space:nowrap;">
                        ${getActions(p)[p.status] || ''}
                        <button onclick="adminApp.editProtocol('${p.id}')" class="btn-icon" data-tooltip="Editar Pedido" style="background:#eff6ff; color:#3b82f6; border:none; padding:8px; border-radius:6px; cursor:pointer; margin-right:2px;" onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                            <i class="ph-bold ph-pencil"></i>
                        </button>
                        <button onclick="adminApp.viewProtocolDetails('${p.id}')" class="btn-icon" data-tooltip="Ver Detalhes, Produção e Opções" style="background:#f1f5f9; color:#475569; border:none; padding:8px; border-radius:6px; cursor:pointer;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        ProtocolsManager.updateListMeta(filtered.length);
    },

    viewDetails: async (id) => {
        try {
            // 1. Fetch fresh data including items to ensure they exist
            const { data: p, error: fetchErr } = await window.supabase
                .from('protocols')
                .select('*, protocol_items (*)')
                .eq('id', id)
                .single();

            if (fetchErr) throw fetchErr;

            let items = p.protocol_items || [];
            // Fallback to old items column if it was a JSON string
            if (items.length === 0 && p.items) {
                try {
                    items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
                } catch (e) { items = []; }
            }

            let itemsHtml = '<i>Sem itens registrados</i>';
            if (items && Array.isArray(items)) {
                itemsHtml = `
                    <table style="width:100%; font-size:0.9rem; border-collapse:collapse; margin-top:10px;">
                        <thead style="background:#f1f5f9;">
                            <tr><th style="padding:5px; text-align:left;">Item</th><th style="padding:5px; text-align:right;">Qtd</th></tr>
                        </thead>
                        <tbody>
                            ${items.map(item => {
                    let fileLink = '';
                    let fileName = item.fileName || 'Arquivo';
                    if (item.fileUrl) {
                        fileLink = `<br><a href="${item.fileUrl}" target="_blank" style="color:#0ea5e9; font-size:0.8rem; text-decoration:none;">
                                        <i class="ph-bold ph-file-pdf"></i> ${fileName}
                                    </a>`;
                    }

                    // Customization details & Description
                    let details = '';
                    if (item.configuration) {
                        const c = item.configuration;
                        if (c.printMode) details += `<br><small style="color:#64748b">Modo: ${c.printMode === 'color' ? 'Colorido' : 'P&B'}</small>`;
                        if (c.stdPages) details += `<br><small style="color:#64748b">Normal: ${c.stdPages} | Cheia: ${c.heavyPages}</small>`;
                    }

                    // Collect all other possible description fields
                    let extraInfo = [];
                    if (item.description) extraInfo.push(item.description);
                    if (item.notes) extraInfo.push(item.notes);
                    if (item.observation) extraInfo.push(item.observation);
                    if (item.customization_details || item.customization) {
                        let cust = item.customization_details || item.customization;
                        if (typeof cust === 'string') {
                            try { cust = JSON.parse(cust); } catch (e) { }
                        }
                        if (typeof cust === 'object' && cust !== null) {
                            let custDisplay = cust.text || cust.customization || '';
                            if (!custDisplay) {
                                custDisplay = Object.entries(cust)
                                    .filter(([k]) => !['fileUrl', 'fileName', 'configuration'].includes(k))
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(' | ');
                            }
                            if (custDisplay) extraInfo.push(custDisplay);
                        } else if (cust) {
                            extraInfo.push(cust);
                        }
                    }

                    if (extraInfo.length > 0) {
                        details += `<br><small style="color:#64748b">${extraInfo.join(' | ')}</small>`;
                    }

                    return `
                                <tr>
                                    <td style="padding:8px 5px; border-bottom:1px solid #e2e8f0;">
                                        <div style="font-weight:600;">${item.product_name || item.name || 'Item'}</div>
                                        ${details}
                                        ${fileLink}
                                    </td>
                                    <td style="padding:8px 5px; border-bottom:1px solid #e2e8f0; text-align:right; vertical-align:top;">${item.quantity || item.qty}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                `;
            }

            Swal.fire({
                title: `Protocolo ${String(id).startsWith('#') ? String(id).slice(0, 9) : '#' + String(id).slice(0, 8)}`,
                html: `
                <div style="text-align:left;">
                    <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-bottom:10px;">
                        <p style="margin:2px 0;"><strong>Cliente:</strong> ${p.client_name}</p>
                        <p style="margin:2px 0;"><strong>Email:</strong> ${p.client_email}</p>
                        <p style="margin:2px 0;"><strong>Total:</strong> R$ ${(p.final_amount || p.total_amount)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <p style="margin:4px 0;">
                            <strong>NF-e:</strong>
                            ${p.wants_nfe !== false
                        ? '<span style="color:#10b981; font-weight:600;">🧾 Com Nota Fiscal</span>'
                        : '<span style="color:#ef4444; font-weight:600;">✂️ Sem Nota Fiscal</span>'}
                        </p>
                        ${(p.notes || p.description) ? `<p style="margin:8px 0; padding:8px; background:#fff; border-left:3px solid #f59e0b; font-style:italic;"><strong>Obs:</strong> ${p.notes || p.description}</p>` : ''}
                    </div>
                    <strong>Itens do Pedido:</strong>
                    ${itemsHtml}

                    <div style="margin-top:15px; padding:10px; border-radius:8px; border:1px solid #e2e8f0; background:#f8fafc;">
                        <strong style="display:block; margin-bottom:10px;">🖼️ Projetos e Artes (Múltiplos)</strong>
                        
                        <div style="margin-bottom:12px;">
                            <input type="file" id="mockup-upload-gestao-${id}" accept=".pdf,.png,.jpg,.jpeg" style="width:100%; font-size:0.8rem; margin-bottom:8px; border:1px solid #cbd5e1; border-radius:4px; padding:4px;">
                            <button onclick="adminApp.uploadMockupGestao('${id}')" style="width:100%; background:#3b82f6; color:white; border:none; padding:8px; border-radius:6px; font-weight:600; cursor:pointer;">
                                <i class="ph-bold ph-plus"></i> Adicionar Nova Arte
                            </button>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap:6px;">
                            ${(() => {
                        let mockups = [];
                        try {
                            if (p.mockup_url) {
                                mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Principal', url: p.mockup_url }];
                            }
                        } catch (e) { }

                        if (mockups.length === 0) return '<div style="font-size:0.8rem; color:#94a3b8; text-align:center;">Nenhum arquivo anexado.</div>';

                        return mockups.map((m, index) => {
                            const isImage = m.url.match(/\.(jpeg|jpg|png|gif)$/i) !== null;
                            return `
                                  <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1px solid #e2e8f0; padding:6px 8px; border-radius:6px;">
                                      <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                                          ${isImage ?
                                    `<img src="${m.url}" style="width:30px; height:30px; border-radius:4px; object-fit:cover; border:1px solid #e2e8f0; margin-right:8px;" alt="mini">`
                                    :
                                    `<div style="width:30px; height:30px; border-radius:4px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; margin-right:8px; color:#64748b;">
                                                  <i class="ph-bold ph-file-pdf"></i>
                                              </div>`
                                }
                                          <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; font-size:0.8rem; color:#334155;">
                                              ${m.name || 'Arte ' + (index + 1)}
                                          </div>
                                      </div>
                                      <div style="display:flex; gap:4px;">
                                          <a href="${m.url}" target="_blank" style="background:#10b981; color:white; padding:4px 10px; border-radius:4px; text-decoration:none; display:flex; align-items:center; font-size:0.75rem; font-weight:bold; gap:4px;" title="Ver/Abrir em Nova Aba">
                                              <i class="ph-bold ph-eye"></i> Ver Arte
                                          </a>
                                          <button onclick="adminApp.removeMockupGestao('${id}', ${index})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:4px; padding:4px 8px; cursor:pointer;" title="Remover Arte">
                                              <i class="ph-bold ph-trash"></i>
                                          </button>
                                      </div>
                                  </div>
                              `}).join('');
                    })()}
                        </div>
                    </div>

                    <div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">
                        <button onclick="window.adminApp.toggleNFe('${id}');"
                            style="width:100%; background:${p.wants_nfe !== false ? '#fef2f2' : '#f0fdf4'}; color:${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; border:1px solid ${p.wants_nfe !== false ? '#ef4444' : '#10b981'}; padding:10px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer;">
                            ${p.wants_nfe !== false ? '✂️ Remover Imposto (Sem NF-e)' : '🧾 Restaurar Nota Fiscal'}
                        </button>
                        <button onclick="window.adminApp.selectPaymentAndPrint('${id}');"
                            style="width:100%; background:#6366f1; color:white; border:none; padding:10px 16px; border-radius:8px; font-size:0.9rem; font-weight:600; cursor:pointer;">
                            💳 Gerar Orçamento (com taxa de pagamento)
                        </button>
                        <button onclick="window.adminApp.printProtocol('${id}');"
                            style="width:100%; background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; padding:8px 16px; border-radius:8px; font-size:0.85rem; cursor:pointer;">
                            🖨️ Imprimir Ordem de Produção (sem taxa)
                        </button>
                    </div>
                </div>
            `,
                showCloseButton: true,
                focusConfirm: false,
                showCancelButton: (p.status === 'inquiry' || p.status === 'pending'),
                confirmButtonText: 'Fechar',
                cancelButtonText: 'Rejeitar',
                denyButtonText: 'Aprovar',
                showDenyButton: (p.status === 'inquiry' || p.status === 'pending'),
                width: '600px'
            }).then((result) => {
                if (result.isDenied) {
                    ProtocolsManager.approve(id);
                } else if (result.dismiss === Swal.DismissReason.cancel) {
                    ProtocolsManager.reject(id);
                }
            });
        } catch (e) {
            console.error('Error opening protocol details:', e);
            Swal.fire('Erro', 'Não foi possível carregar os detalhes do protocolo.', 'error');
        }
    },


    approve: async (id) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Aprovar Protocolo?',
            text: "Isso transformará o protocolo em um Pedido (Kanban).",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Sim, Aprovar'
        });

        if (!isConfirmed) return;

        // Call RPC 'promote_request_to_protocol' or direct update
        // Using direct update for status first, then maybe create order

        try {
            const prev = ProtocolsManager.state.protocols.find(i => i.id === id);

            // 1. Update Status
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: 'approved' })
                .eq('id', id);

            if (error) throw error;

            // 2. Ideally trigger a backend function to create the Order
            // For now frontend logic:
            const p = ProtocolsManager.state.protocols.find(i => i.id === id);

            // Create Order in 'orders' table
            /* 
               Assuming logic exists or we rely on the procedure. 
               Let's assume the user wants the RPC call:
            */
            const { error: rpcError } = await window.supabase
                .rpc('promote_request_to_protocol', { request_id: id });

            if (rpcError) {
                console.warn('RPC Error (fallback to manual):', rpcError);
                // Fallback: Just marking as approved visually
            }

            await ProtocolsManager.logAudit({
                action: 'protocol_approved',
                entityId: id,
                beforeData: { status: prev?.status || null },
                afterData: { status: 'approved' },
                metadata: { rpc_fallback_error: rpcError?.message || null }
            });

            Swal.fire('Aprovado!', 'O protocolo foi aprovado com sucesso.', 'success');
            ProtocolsManager.loadProtocols();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível aprovar.', 'error');
        }
    },

    validateProtocolBeforeProduction: async (id) => {
        const protocol = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!protocol) return true;

        const hasMockup = !!protocol.mockup_url;
        const hasPositiveTotal = Number(protocol.total_amount || 0) > 0;

        if (hasMockup && hasPositiveTotal) return true;

        const warnings = [];
        if (!hasMockup) warnings.push('Sem arte/mockup anexado.');
        if (!hasPositiveTotal) warnings.push('Total do pedido zerado.');

        const result = await Swal.fire({
            title: 'Pendencias antes de enviar para producao',
            html: `<div style="text-align:left;">${warnings.map(w => `<div style="margin:6px 0; color:#ef4444;">- ${w}</div>`).join('')}</div>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Continuar assim mesmo',
            cancelButtonText: 'Voltar e corrigir'
        });

        return result.isConfirmed;
    },

    promoteStatus: async (id, newStatus, title) => {
        const { isConfirmed } = await Swal.fire({
            title: title || 'Atualizar Status?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            confirmButtonText: 'Sim, Confirmar'
        });

        if (!isConfirmed) return;

        try {
            if (newStatus === 'production') {
                const canProceed = await ProtocolsManager.validateProtocolBeforeProduction(id);
                if (!canProceed) return;
            }

            const prev = ProtocolsManager.state.protocols.find(i => i.id === id);
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            await ProtocolsManager.logAudit({
                action: 'protocol_status_changed',
                entityId: id,
                beforeData: { status: prev?.status || null },
                afterData: { status: newStatus }
            });

            Swal.fire('Status Atualizado!', 'O pedido mudou de fase com sucesso.', 'success');
            ProtocolsManager.loadProtocols();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
        }
    },

    notifyCustomerCompleted: async (id) => {
        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        try {
            // O proprio protocolo ja carrega telefone e nome do cliente.
            let phone = p.client_phone ? String(p.client_phone).replace(/[^0-9]/g, '') : '';
            let name = p.client_name ? String(p.client_name).split(' ')[0] : 'Cliente';

            // So consulta o cadastro (profiles) se o telefone nao veio no pedido.
            if (!phone && p.client_id) {
                const { data: client } = await window.supabase
                    .from('profiles')
                    .select('phone, full_name')
                    .eq('id', p.client_id)
                    .single();

                if (client) {
                    if (client.phone) phone = String(client.phone).replace(/[^0-9]/g, '');
                    if (!p.client_name && client.full_name) name = client.full_name.split(' ')[0];
                }
            }

            if (!phone) {
                // If the user doesn't have a phone on record, prompt the admin
                const { value: typedPhone } = await Swal.fire({
                    title: 'Número do Cliente Misto',
                    text: 'Não encontramos o telefone no cadastro. Qual o WhatsApp do cliente?',
                    input: 'text',
                    inputPlaceholder: 'Ex: 11999999999',
                    showCancelButton: true,
                    confirmButtonText: 'Enviar'
                });

                if (typedPhone) {
                    phone = typedPhone.replace(/[^0-9]/g, '');
                } else {
                    return;
                }
            }

            // Prefix with 55 if length is local (10 or 11 digits)
            if (phone.length === 10 || phone.length === 11) {
                phone = '55' + phone;
            }

            const protocolName = p.id.startsWith('#') ? p.id : '#' + p.id;
            const msg = `Olá ${name}! Tudo bem?\n\nPassando para avisar que o seu pedido *${protocolName.slice(0, 8)}* na *Marca Viva* já está produzido, embalado e pronto! 🎉📦\n\nPor favor, confirme como deseja proceder com a retirada ou entrega do seu material.\n\nQualquer dúvida, estamos à disposição!`;

            const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Houve um erro ao buscar os dados do cliente para o WhatsApp.', 'error');
        }
    },

    reject: async (id) => {
        const { isConfirmed } = await Swal.fire({
            title: 'Rejeitar Protocolo?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim, Rejeitar'
        });

        if (!isConfirmed) return;

        try {
            const prev = ProtocolsManager.state.protocols.find(i => i.id === id);
            const { error } = await window.supabase
                .from('protocols')
                .update({ status: 'rejected' })
                .eq('id', id);

            if (error) throw error;

            await ProtocolsManager.logAudit({
                action: 'protocol_rejected',
                entityId: id,
                beforeData: { status: prev?.status || null },
                afterData: { status: 'rejected' }
            });

            // Remove espelho no financeiro e invalida cache da aba Financeiro
            try {
                await window.supabase.from('financial_records').delete().eq('id', id);
            } catch (_) { /* tabela/linha pode não existir */ }
            if (window.adminApp) {
                try {
                    window.adminApp._financialRenderCache = null;
                } catch (_) { /* */ }
                if (typeof window.adminApp.renderFinancial === 'function') {
                    void window.adminApp.renderFinancial({ isBackground: true });
                }
            }

            Swal.fire('Rejeitado', 'O protocolo foi rejeitado.', 'info');
            ProtocolsManager.loadProtocols();
        } catch (e) {
            Swal.fire('Erro', 'Erro ao rejeitar.', 'error');
        }
    },

    // --- MANUAL PROTOCOL LOGIC ---
    manualState: {
        clientId: null,
        items: []
    },

    openNewProtocolModal: () => {
        // Reset State
        ProtocolsManager.manualState = { clientId: null, items: [] };

        // Reset Fields
        document.getElementById('new-prot-client-search').value = '';
        document.getElementById('new-prot-client-name').value = '';
        document.getElementById('new-prot-client-phone').value = '';
        document.getElementById('new-prot-client-email').value = '';
        document.getElementById('new-prot-client-id').value = '';
        document.getElementById('new-prot-items-body').innerHTML = '';
        document.getElementById('new-prot-total').innerText = 'R$ 0,00';

        // Open Modal (using adminApp logic or direct class)
        document.getElementById('modal-new-protocol').classList.add('open');
    },

    searchClient: async (query) => {
        const resultsDiv = document.getElementById('client-search-results');
        if (query.length < 3) {
            resultsDiv.style.display = 'none';
            return;
        }

        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('id, full_name, email, phone')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(5);

            if (data && data.length > 0) {
                resultsDiv.innerHTML = data.map(c => `
                    <div onclick="adminApp.selectClient('${c.id}', '${c.full_name}', '${c.email}', '${c.phone}')" 
                         style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; hover:background:#f8fafc;">
                        <strong>${c.full_name || 'Sem nome'}</strong><br>
                        <small>${c.email}</small>
                    </div>
                `).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.style.display = 'none';
            }
        } catch (e) { console.error(e); }
    },

    selectClient: (id, name, email, phone) => {
        document.getElementById('new-prot-client-id').value = id;
        document.getElementById('new-prot-client-name').value = name !== 'null' ? name : '';
        document.getElementById('new-prot-client-email').value = email !== 'null' ? email : '';
        document.getElementById('new-prot-client-phone').value = phone !== 'null' ? phone : '';
        document.getElementById('client-search-results').style.display = 'none';
        ProtocolsManager.manualState.clientId = id;
    },

    searchProductProtocol: async (query) => {
        const resultsDiv = document.getElementById('prod-search-results');
        if (query.length < 3) {
            resultsDiv.style.display = 'none';
            return;
        }

        try {
            const { data } = await window.supabase
                .from('products')
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(10);

            if (data && data.length > 0) {
                resultsDiv.innerHTML = data.map(p => `
                    <div onclick="adminApp.addItemToProtocol('${p.id}', '${p.name?.replace(/'/g, "\\'")}', ${p.price})" 
                         style="padding:10px; cursor:pointer; border-bottom:1px solid #eee; display:flex; justify-content:space-between;">
                        <span>${p.name}</span>
                        <strong>R$ ${p.price?.toFixed(2)}</strong>
                    </div>
                `).join('');
                resultsDiv.style.display = 'block';
            } else {
                resultsDiv.style.display = 'none';
            }
        } catch (e) { }
    },

    addItem: (id, name, price) => {
        // Check if exists
        const existing = ProtocolsManager.manualState.items.find(i => i.id === id);
        if (existing) {
            existing.qty++;
        } else {
            ProtocolsManager.manualState.items.push({ id, name, price, qty: 1 });
        }

        document.getElementById('prod-search-results').style.display = 'none';
        document.getElementById('new-prot-prod-search').value = ''; // clear
        ProtocolsManager.renderManualItems();
    },

    renderManualItems: () => {
        const tbody = document.getElementById('new-prot-items-body');
        let total = 0;

        tbody.innerHTML = ProtocolsManager.manualState.items.map((item, index) => {
            const subtotal = item.price * item.qty;
            total += subtotal;
            return `
                <tr>
                    <td style="padding:10px;">${item.name}</td>
                    <td style="padding:10px;">
                        <input type="number" value="${item.qty}" min="1" 
                            onchange="adminApp.updateItemQty(${index}, this.value)"
                            style="width:60px; padding:5px; border:1px solid #ddd; border-radius:4px;">
                    </td>
                    <td style="padding:10px;">R$ ${item.price.toFixed(2)}</td>
                    <td style="padding:10px;">R$ ${subtotal.toFixed(2)}</td>
                    <td style="padding:10px; text-align:center;">
                        <button onclick="adminApp.removeItemProtocol(${index})" style="color:red; background:none; border:none; cursor:pointer;">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('new-prot-total').innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    },

    updateItemQty: (index, qty) => {
        if (qty < 1) return;
        ProtocolsManager.manualState.items[index].qty = parseInt(qty);
        ProtocolsManager.renderManualItems();
    },

    removeItem: (index) => {
        ProtocolsManager.manualState.items.splice(index, 1);
        ProtocolsManager.renderManualItems();
    },

    saveManualProtocol: async () => {
        const name = document.getElementById('new-prot-client-name').value;
        const email = document.getElementById('new-prot-client-email').value;
        const phone = document.getElementById('new-prot-client-phone').value;
        const userId = document.getElementById('new-prot-client-id').value || null;

        if (!name || !email) {
            Swal.fire('Erro', 'Nome e Email são obrigatórios.', 'error');
            return;
        }

        if (ProtocolsManager.manualState.items.length === 0) {
            Swal.fire('Erro', 'Adicione pelo menos um produto.', 'error');
            return;
        }

        // Calculate Total
        const total = ProtocolsManager.manualState.items.reduce((acc, i) => acc + (i.price * i.qty), 0);

        // Prepare Data
        const payload = {
            client_name: name,
            client_email: email,
            client_phone: phone, // Assuming column exists or stored in json
            user_id: userId, // Link if known
            items: ProtocolsManager.manualState.items,
            total_amount: total,
            status: 'inquiry',
            created_at: new Date()
        };

        try {
            Swal.showLoading();

            // 1. Check if email exists in profiles but NO userId was selected
            if (!userId && email) {
                const { data: profile } = await window.supabase
                    .from('profiles')
                    .select('id')
                    .eq('email', email)
                    .single();

                if (profile) payload.user_id = profile.id;
            }

            const { error } = await window.supabase
                .from('protocols')
                .insert(payload);

            if (error) throw error;

            Swal.fire('Sucesso', 'Protocolo criado!', 'success');
            ProtocolsManager.loadProtocols(); // Reload list
            adminApp.closeModals();

        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Falha ao salvar protocolo.', 'error');
        }
    },

    // Global Utility Functions inserted within ProtocolsManager 
    copyToClipboard: (text, element) => {
        navigator.clipboard.writeText(text).then(() => {
            // Give visual feedback using the class defined in admin.html
            const originalClass = element.className;
            element.className = 'ph-bold ph-check-circle quick-copy copy-feedback';
            element.setAttribute('data-tooltip', 'Copiado!');
            setTimeout(() => {
                element.className = originalClass;
                element.setAttribute('data-tooltip', 'Copiar ID');
            }, 1000);
        }).catch(err => console.error("Clipboard falhou:", err));
    },

    formatRelativeTime: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoje";
        if (diffDays === 1) return "Ontem";
        if (diffDays < 7) return `Há ${diffDays} dias`;

        return date.toLocaleDateString('pt-BR');
    },

    printProtocol: async (id) => {
        try {
            const { data: p, error: fetchErr } = await window.supabase
                .from('protocols')
                .select('*, protocol_items (*)')
                .eq('id', id)
                .single();

            if (fetchErr) throw fetchErr;

            let items = p.protocol_items || [];
            // Fallback to legacy column
            if (items.length === 0 && p.items) {
                try {
                    items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items;
                } catch (e) { items = []; }
            }
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { items = []; }
            }

            // Map data to Quote HTML format
            // Se o protocolo for muito antigo e não tiver itens no banco, criamos um item genérico com o Total.
            if (!items || items.length === 0) {
                items = [{
                    name: `Orçamento/Pedido #${p.id.slice(0, 8)}`,
                    qty: 1,
                    price: p.total_amount || 0
                }];
            }

            // Fetch payment history
            let paidAmount = 0;
            let payments = [];
            if (window.supabase) {
                try {
                    const { data: payData, error: payErr } = await window.supabase
                        .from('order_payments')
                        .select('amount, payment_method, notes, paid_at, created_at')
                        .eq('order_id', p.id)
                        .order('created_at', { ascending: false });

                    if (!payErr && payData) {
                        payments = payData;
                        paidAmount = payData.reduce((sum, pay) => sum + Number(pay.amount), 0);
                    }
                } catch (e) {
                    console.warn("Failed to fetch payments for print", e);
                }
            }

            const printData = {
                id: p.id,
                customer_name: p.client_name || 'Cliente',
                client_email: p.client_email && p.client_email !== 'null' ? p.client_email : 'Não informado',
                total_amount: p.total_amount || 0,
                date: p.created_at,
                items: items.map(i => {
                    let customStr = '';
                    if (i.configuration) {
                        customStr += i.configuration.printMode ? (i.configuration.printMode === 'color' ? 'Modo: Colorido' : 'Modo: P&B') : '';
                        customStr += i.configuration.stdPages ? ` | Pág. Normal: ${i.configuration.stdPages} | Cheia: ${i.configuration.heavyPages}` : '';
                    }

                    // Collect all other possible description fields for print
                    let extraPrint = [];
                    if (i.description) extraPrint.push(i.description);
                    if (i.notes) extraPrint.push(i.notes);
                    if (i.observation) extraPrint.push(i.observation);
                    if (i.customization_details) extraPrint.push(i.customization_details);
                    if (i.customization) extraPrint.push(i.customization);

                    if (extraPrint.length > 0) {
                        customStr += (customStr ? ' | ' : '') + extraPrint.join(' | ');
                    }
                    return {
                        product_name: i.product_name || i.name || 'Item do Pedido',
                        quantity: i.quantity || i.qty || 1,
                        unit_price: parseFloat(i.unit_price || i.price) || 0,
                        customization: customStr,
                        fileName: i.fileName || ''
                    };
                }),
                paidAmount: paidAmount,
                payments: payments,
                notes: p.notes || '',
                description: p.description || ''
            };

            // Set data into local storage exactly as Admin module 5 does
            localStorage.setItem('mv_admin_print_data', JSON.stringify(printData));

            // Open the new premium Quote PDF layout window
            window.open(`../pages/quote.html?source=admin&id=${encodeURIComponent(p.id)}`, '_blank');

        } catch (e) {
            console.error('Error opening quote print:', e);
            alert('Erro ao gerar Ordem de Produção visual.');
        }
    },

    // =========================================================================
    // TOGGLE NF-e: Remove ou restaura o imposto do protocolo
    // Botão no detalhe do pedido: "✂️ Sem Nota Fiscal"
    // =========================================================================
    toggleNFe: async (id) => {
        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        const currentWantsNFe = p.wants_nfe !== false; // default true
        const baseAmount = p.total_amount || 0;

        // Determinar alíquota (tenta pegar do primeiro item)
        let taxRate = 6; // padrão 6%
        if (p.items && p.items.length > 0 && p.items[0].tax_rate != null) {
            taxRate = parseFloat(p.items[0].tax_rate) || 6;
        }

        if (currentWantsNFe) {
            // Está COM NF-e → vai REMOVER o imposto (desconto)
            const taxAmount = baseAmount * (taxRate / 100);
            const newTotal = baseAmount - taxAmount;

            const { isConfirmed } = await Swal.fire({
                title: '✂️ Remover Imposto?',
                html: `
                    <div style="text-align:left; font-size:0.95rem;">
                        <p>O cliente <strong>não quer Nota Fiscal</strong>.</p>
                        <div style="background:#f8fafc; padding:12px; border-radius:8px; margin-top:10px;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span>Total original:</span><strong>R$ ${baseAmount.toFixed(2)}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#ef4444;">
                                <span>Desconto (${taxRate}% imposto):</span><strong>- R$ ${taxAmount.toFixed(2)}</strong>
                            </div>
                            <div style="display:flex; justify-content:space-between; font-size:1.1rem; color:#10b981; border-top:1px solid #e2e8f0; padding-top:8px; margin-top:5px;">
                                <span><b>Novo total:</b></span><strong>R$ ${newTotal.toFixed(2)}</strong>
                            </div>
                        </div>
                    </div>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                confirmButtonText: '✂️ Sim, remover imposto',
                cancelButtonText: 'Cancelar'
            });

            if (!isConfirmed) return;

            const { error } = await window.supabase
                .from('protocols')
                .update({
                    wants_nfe: false,
                    tax_amount: taxAmount,
                    total_amount: parseFloat(newTotal.toFixed(2)),
                    final_amount: parseFloat(newTotal.toFixed(2))
                })
                .eq('id', id);

            if (error) { Swal.fire('Erro', error.message, 'error'); return; }
            await ProtocolsManager.logAudit({
                action: 'protocol_nfe_removed',
                entityId: id,
                beforeData: {
                    wants_nfe: true,
                    total_amount: baseAmount
                },
                afterData: {
                    wants_nfe: false,
                    total_amount: parseFloat(newTotal.toFixed(2)),
                    tax_amount: taxAmount
                }
            });
            Swal.fire('Feito!', `Imposto removido. Novo total: R$ ${newTotal.toFixed(2)}`, 'success');

        } else {
            // Está SEM NF-e → vai RESTAURAR o imposto
            const taxAmount = p.tax_amount || 0;
            const restoredTotal = baseAmount + taxAmount;

            const { isConfirmed } = await Swal.fire({
                title: '🧾 Restaurar Nota Fiscal?',
                html: `<p>O cliente <strong>quer receber Nota Fiscal</strong>.<br>O imposto de R$ ${taxAmount.toFixed(2)} será adicionado de volta.</p>
                       <p style="font-size:1.1rem; margin-top:10px;">Novo total: <strong style="color:#3b82f6;">R$ ${restoredTotal.toFixed(2)}</strong></p>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                confirmButtonText: '🧾 Sim, restaurar NF-e'
            });

            if (!isConfirmed) return;

            const { error } = await window.supabase
                .from('protocols')
                .update({
                    wants_nfe: true,
                    tax_amount: 0,
                    total_amount: parseFloat(restoredTotal.toFixed(2)),
                    final_amount: parseFloat(restoredTotal.toFixed(2))
                })
                .eq('id', id);

            if (error) { Swal.fire('Erro', error.message, 'error'); return; }
            await ProtocolsManager.logAudit({
                action: 'protocol_nfe_restored',
                entityId: id,
                beforeData: {
                    wants_nfe: false,
                    total_amount: baseAmount,
                    tax_amount: taxAmount
                },
                afterData: {
                    wants_nfe: true,
                    total_amount: parseFloat(restoredTotal.toFixed(2)),
                    tax_amount: 0
                }
            });
            Swal.fire('Restaurado!', `NF-e reativada. Total: R$ ${restoredTotal.toFixed(2)}`, 'success');
        }

        ProtocolsManager.loadProtocols();
    },

    // =========================================================================
    // SELECIONAR PAGAMENTO + CALCULAR TAXA MP + ABRIR ORÇAMENTO
    // Fórmula: total_cobrado = valor_liquido ÷ (1 - taxa_mp)
    // =========================================================================
    selectPaymentAndPrint: async (id) => {
        const MP_FEES = {
            pix: { label: 'PIX', rate: 0.0099 },
            boleto: { label: 'Boleto', rate: 0.0349, fixed: 3.49 },
            debito: { label: 'Cartão de Débito', rate: 0.0349 },
            credito_1x: { label: 'Crédito 1x', rate: 0.0498 },
            credito_2x: { label: 'Crédito 2x', rate: 0.0647 },
            credito_3x: { label: 'Crédito 3x', rate: 0.0720 },
            credito_6x: { label: 'Crédito 6x', rate: 0.0969 },
            credito_12x: { label: 'Crédito 12x', rate: 0.1499 },
        };

        const p = ProtocolsManager.state.protocols.find(i => i.id === id);
        if (!p) return;

        const valorBase = p.final_amount || p.total_amount || 0;

        const optionsHtml = Object.entries(MP_FEES).map(([key, mp]) => {
            const totalCobrado = mp.fixed
                ? (valorBase + mp.fixed) / (1 - mp.rate)
                : valorBase / (1 - mp.rate);
            const fee = totalCobrado - valorBase;
            return `<option value="${key}">
                ${mp.label} (+R$ ${fee.toFixed(2)}) → Total: R$ ${totalCobrado.toFixed(2)}
            </option>`;
        }).join('');

        const { value: selectedMethod } = await Swal.fire({
            title: '💳 Forma de Pagamento',
            html: `
                <p style="color:#64748b; margin-bottom:12px;">Selecione como o cliente vai pagar.</p>
                <select id="swal-payment-select" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.95rem;">
                    <option value="">— Sem acréscimo (transferência direta) —</option>
                    ${optionsHtml}
                </select>
                <p style="margin-top:10px; font-size:0.8rem; color:#94a3b8;">A taxa do Mercado Pago será repassada ao cliente.</p>
            `,
            showCancelButton: true,
            confirmButtonText: '🖨️ Gerar Orçamento',
            cancelButtonText: 'Cancelar',
            preConfirm: () => document.getElementById('swal-payment-select').value
        });

        if (selectedMethod === undefined) return; // cancelled

        let finalTotal = valorBase;
        let paymentFee = 0;
        let paymentLabel = 'Transferência Direta';

        if (selectedMethod && MP_FEES[selectedMethod]) {
            const mp = MP_FEES[selectedMethod];
            paymentLabel = mp.label;
            finalTotal = mp.fixed
                ? (valorBase + mp.fixed) / (1 - mp.rate)
                : valorBase / (1 - mp.rate);
            paymentFee = finalTotal - valorBase;

            // Salvar no banco
            await window.supabase.from('protocols').update({
                payment_method: selectedMethod,
                payment_fee: parseFloat(paymentFee.toFixed(2)),
                final_amount: parseFloat(finalTotal.toFixed(2))
            }).eq('id', id);
        }

        await ProtocolsManager.logAudit({
            action: 'protocol_payment_adjusted_for_quote',
            entityId: id,
            beforeData: {
                base_amount: valorBase
            },
            afterData: {
                total_amount: parseFloat(finalTotal.toFixed(2)),
                payment_method: selectedMethod || 'direct_transfer',
                payment_fee: parseFloat(paymentFee.toFixed(2))
            }
        });

        // Montar dados para o quote.html com os novos totais
        let items = p.items || [];
        if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = []; } }
        if (!items.length) items = [{ name: `Pedido #${p.id.slice(0, 8)}`, qty: 1, price: p.total_amount || 0 }];

        // Fetch payment history
        let paidAmount = 0;
        let payments = [];
        if (window.supabase) {
            try {
                const { data: payData, error: payErr } = await window.supabase
                    .from('order_payments')
                    .select('amount, payment_method, notes, paid_at, created_at')
                    .eq('order_id', p.id)
                    .order('created_at', { ascending: false });

                if (!payErr && payData) {
                    payments = payData;
                    paidAmount = payData.reduce((sum, pay) => sum + Number(pay.amount), 0);
                }
            } catch (e) {
                console.warn("Failed to fetch payments for print", e);
            }
        }

        const printData = {
            id: p.id,
            customer_name: p.client_name || 'Cliente',
            client_email: p.client_email || '',
            total_amount: parseFloat(finalTotal.toFixed(2)),
            base_amount: valorBase,
            payment_method: paymentLabel,
            payment_fee: parseFloat(paymentFee.toFixed(2)),
            wants_nfe: p.wants_nfe !== false,
            date: p.created_at,
            items: items.map(i => ({
                product_name: i.product_name || i.name || 'Item',
                quantity: i.quantity || i.qty || 1,
                unit_price: parseFloat(i.unit_price || i.price) || 0,
                customization: i.customization_details || i.customization || '',
                fileName: i.fileName || ''
            })),
            paidAmount: paidAmount,
            payments: payments
        };

        localStorage.setItem('mv_admin_print_data', JSON.stringify(printData));
        window.open(`../pages/quote.html?source=admin&id=${encodeURIComponent(p.id)}`, '_blank');
    }

};


// Global Exposure for HTML onclicks
window.adminApp = window.adminApp || {};

// ─────────────────────────────────────────────────────────
//  EDIT PROTOCOL — State & Functions
// ─────────────────────────────────────────────────────────
ProtocolsManager.editState = {
    protocolId: null,
    items: []
};

ProtocolsManager.editProtocol = async (id) => {
    try {
        const { data: p, error } = await window.supabase
            .from('protocols')
            .select('*, protocol_items (*)')
            .eq('id', id)
            .single();

        if (error) throw error;

        ProtocolsManager.editState.protocolId = id;

        const rawItems = p.protocol_items || [];
        ProtocolsManager.editState.items = rawItems.map(i => ({
            dbId: i.id,
            name: i.product_name || '',
            qty: i.quantity || 1,
            price: Number(i.unit_price) || 0
        }));

        const rawId = String(id);
        const displayId = rawId.startsWith('#') ? rawId : '#' + rawId;
        document.getElementById('edit-prot-id-label').textContent   = displayId;
        document.getElementById('edit-prot-client-name').value      = p.client_name      || '';
        document.getElementById('edit-prot-client-email').value     = p.client_email     || '';
        document.getElementById('edit-prot-client-phone').value     = p.client_phone     || '';
        document.getElementById('edit-prot-status').value           = p.status           || 'inquiry';
        document.getElementById('edit-prot-payment-status').value   = p.payment_status   || 'pending';
        document.getElementById('edit-prot-total').value            = (p.total_amount || 0).toFixed(2);
        document.getElementById('edit-prot-notes').value            = p.notes            || '';

        // Datas — converter ISO para formato yyyy-mm-dd do input[type=date]
        const toDateInput = (iso) => iso ? iso.substring(0, 10) : '';
        document.getElementById('edit-prot-created-date').value  = toDateInput(p.created_at);
        document.getElementById('edit-prot-delivery-date').value = toDateInput(p.delivery_date || '');

        ProtocolsManager.renderEditItems();

        const modal = document.getElementById('modal-edit-protocol');
        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('edit-prot-client-name')?.focus(), 100);

    } catch (e) {
        console.error('Erro ao abrir edição:', e);
        Swal.fire('Erro', 'Não foi possível carregar os dados do pedido.', 'error');
    }
};

ProtocolsManager.renderEditItems = () => {
    const tbody = document.getElementById('edit-prot-items-body');
    if (!tbody) return;

    const items = ProtocolsManager.editState.items;

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="padding:20px; text-align:center; color:#94a3b8; font-size:0.85rem; font-style:italic;">
                    Nenhum item. Clique em "Adicionar Item" para começar.
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = items.map((item, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 12px;">
                <input type="text" value="${(item.name || '').replace(/"/g, '&quot;')}"
                    onchange="adminApp.updateEditItem(${idx}, 'name', this.value)"
                    style="border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px;
                           width:100%; font-size:0.875rem; outline:none; color:#1e293b;"
                    onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'"
                    placeholder="Nome do produto">
            </td>
            <td style="padding:9px 8px; text-align:center;">
                <input type="number" value="${item.qty}" min="1"
                    onchange="adminApp.updateEditItem(${idx}, 'qty', this.value)"
                    style="border:1px solid #e2e8f0; border-radius:6px; padding:6px;
                           width:60px; text-align:center; font-size:0.875rem; outline:none;"
                    onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'">
            </td>
            <td style="padding:9px 8px; text-align:right;">
                <div style="display:flex; align-items:center; justify-content:flex-end; gap:4px;">
                    <span style="color:#94a3b8; font-size:0.8rem;">R$</span>
                    <input type="number" value="${item.price.toFixed(2)}" min="0" step="0.01"
                        onchange="adminApp.updateEditItem(${idx}, 'price', this.value)"
                        style="border:1px solid #e2e8f0; border-radius:6px; padding:6px;
                               width:80px; text-align:right; font-size:0.875rem; outline:none;"
                        onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#e2e8f0'">
                </div>
            </td>
            <td style="padding:9px 8px; text-align:center;">
                <button onclick="adminApp.removeEditItem(${idx})" style="
                    background:#fef2f2; color:#ef4444; border:1px solid #fecaca;
                    border-radius:6px; padding:5px 8px; cursor:pointer;" title="Remover">
                    <i class="ph-bold ph-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
};

ProtocolsManager.addEditItem = () => {
    ProtocolsManager.editState.items.push({ dbId: null, name: '', qty: 1, price: 0 });
    ProtocolsManager.renderEditItems();
    setTimeout(() => {
        const inputs = document.querySelectorAll('#edit-prot-items-body input[type="text"]');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
};

ProtocolsManager.removeEditItem = (idx) => {
    ProtocolsManager.editState.items.splice(idx, 1);
    ProtocolsManager.renderEditItems();
};

ProtocolsManager.updateEditItem = (idx, field, value) => {
    if (!ProtocolsManager.editState.items[idx]) return;
    if (field === 'qty')   ProtocolsManager.editState.items[idx].qty   = Math.max(1, parseInt(value) || 1);
    if (field === 'price') ProtocolsManager.editState.items[idx].price = Math.max(0, parseFloat(value) || 0);
    if (field === 'name')  ProtocolsManager.editState.items[idx].name  = value;
};

ProtocolsManager.saveEditProtocol = async () => {
    const id = ProtocolsManager.editState.protocolId;
    if (!id) return;

    const btn = document.getElementById('btn-save-edit-protocol');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-spinner"></i> Salvando...'; }

    try {
        const beforeSnapshot = {
            protocolId: id,
            itemsCount: ProtocolsManager.editState.items.length
        };

        const name    = document.getElementById('edit-prot-client-name').value.trim();
        const email   = document.getElementById('edit-prot-client-email').value.trim();
        const phone   = document.getElementById('edit-prot-client-phone').value.trim();
        const status  = document.getElementById('edit-prot-status').value;
        const payment = document.getElementById('edit-prot-payment-status').value;
        const total        = parseFloat(document.getElementById('edit-prot-total').value) || 0;
        const notes        = document.getElementById('edit-prot-notes').value.trim();
        const createdDate  = document.getElementById('edit-prot-created-date').value  || null;
        const deliveryDate = document.getElementById('edit-prot-delivery-date').value || null;

        if (!name) {
            Swal.fire('Atenção', 'O nome do cliente é obrigatório.', 'warning');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações'; }
            return;
        }

        // 1. Atualiza protocolo — monta objeto dinamicamente para evitar campos undefined
        const updatePayload = {
            client_name:    name,
            client_email:   email   || null,
            client_phone:   phone   || null,
            status:         status,
            payment_status: payment,
            total_amount:   total,
            notes:          notes   || null,
            updated_at:     new Date().toISOString()
        };

        // Data do pedido — adiciona só se preenchida (evitar undefined no Supabase)
        // Usar T12:00:00 para evitar bug de fuso horário que volta um dia
        if (createdDate) {
            updatePayload.created_at = new Date(createdDate + 'T12:00:00').toISOString();
        }

        // Prazo de entrega (coluna delivery_date — requer ALTER TABLE no Supabase)
        if (deliveryDate) {
            updatePayload.delivery_date = deliveryDate;
        } else {
            updatePayload.delivery_date = null;
        }

        const { error: updateErr } = await window.supabase
            .from('protocols')
            .update(updatePayload)
            .eq('id', id);

        if (updateErr) throw updateErr;

        // 2. Remove itens antigos
        const { error: deleteErr } = await window.supabase
            .from('protocol_items')
            .delete()
            .eq('protocol_id', id);

        if (deleteErr) throw deleteErr;

        // 3. Insere novos itens (apenas com nome preenchido)
        const items = ProtocolsManager.editState.items.filter(i => (i.name || '').trim());
        if (items.length > 0) {
            const payload = items.map(i => ({
                protocol_id:  id,
                product_name: i.name.trim(),
                quantity:     i.qty,
                unit_price:   i.price,
                total_price:  i.price * i.qty
            }));
            const { error: insertErr } = await window.supabase
                .from('protocol_items')
                .insert(payload);
            if (insertErr) throw insertErr;
        }

        // 4. Fecha e atualiza
        ProtocolsManager.closeEditProtocolModal();
        await ProtocolsManager.loadProtocols();

        await ProtocolsManager.logAudit({
            action: 'protocol_edited',
            entityId: id,
            beforeData: beforeSnapshot,
            afterData: {
                status,
                payment_status: payment,
                total_amount: total,
                items_count: items.length,
                delivery_date: deliveryDate || null
            }
        });

        Swal.fire({
            icon: 'success', title: 'Pedido Atualizado!',
            text: 'Alterações salvas com sucesso.',
            timer: 2000, showConfirmButton: false,
            toast: true, position: 'top-end'
        });

    } catch (e) {
        console.error('Erro ao salvar edição:', e);
        Swal.fire('Erro', 'Não foi possível salvar: ' + (e.message || 'Erro desconhecido'), 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ph-bold ph-floppy-disk"></i> Salvar Alterações'; }
    }
};

ProtocolsManager.closeEditProtocolModal = () => {
    const modal = document.getElementById('modal-edit-protocol');
    if (modal) modal.style.display = 'none';
    ProtocolsManager.editState = { protocolId: null, items: [] };
};

// Fechar clicando no backdrop
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-edit-protocol');
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) ProtocolsManager.closeEditProtocolModal();
    });
});

// Main Management Actions
window.adminApp.loadProtocols = ProtocolsManager.loadProtocols;
window.adminApp.viewProtocolDetails = ProtocolsManager.viewDetails; // Map standard name
window.adminApp.openNewProtocolModal = ProtocolsManager.openNewProtocolModal;
window.adminApp.searchClient = ProtocolsManager.searchClient;
window.adminApp.selectClient = ProtocolsManager.selectClient;
window.adminApp.searchProductProtocol = ProtocolsManager.searchProductProtocol;
window.adminApp.addItemToProtocol = ProtocolsManager.addItem;
window.adminApp.updateItemQty = ProtocolsManager.updateItemQty;
window.adminApp.removeItemProtocol = ProtocolsManager.removeItem;
window.adminApp.saveManualProtocol = ProtocolsManager.saveManualProtocol;
window.adminApp.copyToClipboard = ProtocolsManager.copyToClipboard;
window.adminApp.formatRelativeTime = ProtocolsManager.formatRelativeTime;
window.adminApp.searchProtocols = ProtocolsManager.searchProtocols;
window.adminApp.setOrdersPaymentFilter = ProtocolsManager.setPaymentFilter;
window.adminApp.setOrdersDateRange = ProtocolsManager.setDateRange;
window.adminApp.clearOrdersAdvancedFilters = ProtocolsManager.clearAdvancedFilters;

// Feature Specifics (Fiscal & Payment)
window.adminApp.toggleNFe = ProtocolsManager.toggleNFe;
window.adminApp.selectPaymentAndPrint = ProtocolsManager.selectPaymentAndPrint;
window.adminApp.printProtocol = ProtocolsManager.printProtocol;

// Edit Protocol
window.adminApp.editProtocol           = ProtocolsManager.editProtocol;
window.adminApp.saveEditProtocol       = ProtocolsManager.saveEditProtocol;
window.adminApp.closeEditProtocolModal = ProtocolsManager.closeEditProtocolModal;
window.adminApp.addEditItem            = ProtocolsManager.addEditItem;
window.adminApp.removeEditItem         = ProtocolsManager.removeEditItem;
window.adminApp.updateEditItem         = ProtocolsManager.updateEditItem;


// Mount globally BEFORE any DOMContentLoaded events fire!
window.ProtocolsManager = ProtocolsManager;

// Auto Init if document ready
document.addEventListener('DOMContentLoaded', () => {
    ProtocolsManager.init();
});
