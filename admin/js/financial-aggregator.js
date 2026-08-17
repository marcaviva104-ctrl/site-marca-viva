/**
 * FinancialAggregator - fonte única de dados financeiros do admin.
 *
 * Antes desta extração, Dashboard (renderDashboard/renderCharts) e Financeiro
 * (renderFinancial) tinham cada um sua própria query, divergentes entre si:
 * Dashboard lia só `financial_records`, Financeiro cruzava `protocols` +
 * `financial_records` + `order_payments`. Resultado: os números não batiam
 * entre as duas telas. Este módulo centraliza a busca+merge (mesma lógica que
 * já existia dentro de renderFinancial) para que qualquer view do admin use
 * exatamente os mesmos dados para o mesmo período.
 */
window.FinancialAggregator = (function () {
    const QUERY_TIMEOUT_MS = 30000;
    const CACHE_TTL_MS = 30000;
    const cache = new Map(); // `${startISO}_${endISO}[_margin]` -> { ts, data }

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

    function cacheKey(startDate, endDate, options) {
        return `${startDate.toISOString()}_${endDate.toISOString()}${options.withMargin ? '_margin' : ''}`;
    }

    function isDroppedStatus(record) {
        const st = (record && record.status ? record.status : '').toString().toLowerCase();
        return st === 'rejected' || st === 'cancelled';
    }

    function readLocalManualOrders() {
        try {
            const raw = (window.SafeStorage ? window.SafeStorage.getItem('mv_manual_orders') : localStorage.getItem('mv_manual_orders')) || '[]';
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('FinancialAggregator: mv_manual_orders invalido, ignorando.', e);
            return [];
        }
    }

    async function fetchOrders(startDate, endDate) {
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
                const all = await withTimeout(window.OrderManager.getAllOrders(), 'OrderManager.getAllOrders');
                return (all || []).filter((row) => {
                    const d = new Date(row.date);
                    return d >= startDate && d <= endDate;
                });
            }
            return [];
        } catch (e) {
            console.error('FinancialAggregator: system orders failed (ignored)', e);
            return [];
        }
    }

    async function fetchCloudManualRecords(startDate, endDate) {
        if (!window.supabase) return [];
        try {
            const finCols = 'id, customer_name, total, created_at, status, type, category, description';
            const query = window.supabase
                .from('financial_records')
                .select(finCols)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .order('created_at', { ascending: false });
            const { data, error } = await withTimeout(query, 'financial_records query');
            if (error || !data) return [];
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
            console.error('FinancialAggregator: manual fetch failed', err);
            return [];
        }
    }

    async function fetchRecords(startDate, endDate) {
        const [orders, cloudManualOrders] = await Promise.all([
            fetchOrders(startDate, endDate),
            fetchCloudManualRecords(startDate, endDate)
        ]);

        const cleanOrders = (orders || []).filter((o) => !isDroppedStatus(o));
        const cleanCloudManual = (cloudManualOrders || []).filter((o) => !isDroppedStatus(o));

        const localManualOrders = readLocalManualOrders()
            .map((l) => ({ ...l, isManual: true, source: 'local' }))
            .filter((o) => {
                const d = o.date ? new Date(o.date) : null;
                if (!d || Number.isNaN(d.getTime())) return false;
                return d >= startDate && d <= endDate;
            })
            .filter((o) => !isDroppedStatus(o));

        // Merge manual entries: cloud é a verdade, local só entra se ainda não sincronizou
        const manualMap = new Map();
        cleanCloudManual.forEach((o) => manualMap.set(o.id, o));
        localManualOrders.forEach((o) => {
            if (!manualMap.has(o.id)) manualMap.set(o.id, o);
        });

        return [...cleanOrders, ...Array.from(manualMap.values())];
    }

    async function attachMargin(records) {
        if (!window.supabase || records.length === 0) return records;
        try {
            const orderIds = records.map((o) => String(o.id)).filter(Boolean);
            const itemsByOrder = {};
            const CHUNK = 200;
            for (let i = 0; i < orderIds.length; i += CHUNK) {
                const chunk = orderIds.slice(i, i + CHUNK);
                const { data: itemsData, error } = await withTimeout(
                    window.supabase.from('protocol_items')
                        .select('protocol_id, product_name, quantity, unit_price')
                        .in('protocol_id', chunk),
                    `protocol_items chunk ${Math.floor(i / CHUNK) + 1}`
                );
                if (!error && itemsData) {
                    itemsData.forEach((it) => {
                        if (!itemsByOrder[it.protocol_id]) itemsByOrder[it.protocol_id] = [];
                        itemsByOrder[it.protocol_id].push({
                            name: it.product_name,
                            quantity: it.quantity,
                            price: Number(it.unit_price) || 0
                        });
                    });
                }
            }
            records.forEach((o) => {
                if (!o.isManual) o.items = itemsByOrder[String(o.id)] || o.items || [];
            });
        } catch (e) {
            console.warn('FinancialAggregator: falha ao buscar itens para margem (ignorado).', e);
        }
        return records;
    }

    async function fetchPayments(records) {
        const paymentsMap = {};
        let totalAccount = 0;
        let totalCash = 0;

        const allRecordIds = records.map((r) => String(r.id || '')).filter(Boolean);
        if (allRecordIds.length === 0) return { paymentsMap, totalAccount, totalCash };

        if (window.supabase) {
            try {
                const CHUNK = 200;
                for (let i = 0; i < allRecordIds.length; i += CHUNK) {
                    const chunk = allRecordIds.slice(i, i + CHUNK);
                    const { data: pay, error } = await withTimeout(
                        window.supabase.from('order_payments')
                            .select('order_id, amount, payment_method')
                            .in('order_id', chunk),
                        `order_payments chunk ${Math.floor(i / CHUNK) + 1}`
                    );
                    if (!error && pay) {
                        pay.forEach((p) => {
                            const amt = Number(p.amount) || 0;
                            paymentsMap[p.order_id] = (paymentsMap[p.order_id] || 0) + amt;
                            if (p.payment_method === 'cash') totalCash += amt;
                            else totalAccount += amt;
                        });
                    }
                }
            } catch (e) {
                console.error('FinancialAggregator: payment fetch error', e);
            }
        } else {
            let rawLocalPayments = {};
            try {
                const raw = (window.SafeStorage ? window.SafeStorage.getItem('mv_payments') : localStorage.getItem('mv_payments')) || '{}';
                rawLocalPayments = JSON.parse(raw) || {};
            } catch (e) {
                console.warn('FinancialAggregator: mv_payments invalido, ignorando.', e);
            }
            Object.entries(rawLocalPayments).forEach(([orderId, amount]) => {
                if (!allRecordIds.includes(String(orderId))) return;
                paymentsMap[orderId] = Number(amount) || 0;
                totalAccount += Number(amount) || 0;
            });
        }

        return { paymentsMap, totalAccount, totalCash };
    }

    /**
     * Fonte única de verdade para dados financeiros num período. Retorna os
     * registros mesclados (protocols + financial_records, cloud+local) e o
     * mapa de pagamentos — igual ao que renderFinancial() já calculava sozinho.
     * @param {{ withMargin?: boolean, skipCache?: boolean }} options
     */
    async function getFinancialSummary(startDate, endDate, options = {}) {
        const key = cacheKey(startDate, endDate, options);
        if (!options.skipCache) {
            const hit = cache.get(key);
            if (hit && (Date.now() - hit.ts) < CACHE_TTL_MS) {
                return hit.data;
            }
        }

        let records = await fetchRecords(startDate, endDate);
        if (options.withMargin) {
            records = await attachMargin(records);
        }
        const { paymentsMap, totalAccount, totalCash } = await fetchPayments(records);

        const result = { records, paymentsMap, totalAccount, totalCash };
        cache.set(key, { ts: Date.now(), data: result });
        return result;
    }

    /**
     * Totais (Saldo/A Receber/Despesas) a partir de um conjunto de registros já
     * carregado — separado de getFinancialSummary para poder ser recalculado
     * sobre uma lista filtrada (ex.: filtro de status/busca do Financeiro) sem
     * refazer a busca ao banco.
     */
    function computeTotals(records, paymentsMap) {
        let totalReceivable = 0;
        let totalPaid = 0; // saldo líquido do período: pagamentos recebidos - despesas
        let totalExpenses = 0;
        (records || []).forEach((r) => {
            const isExpense = r.type === 'expense';
            const paid = (paymentsMap && paymentsMap[r.id]) || 0;
            const total = Number(r.total) || 0;
            const debt = total - paid;
            if (isExpense) {
                totalPaid -= total;
                totalExpenses += total;
            } else {
                if (debt > 0.01) totalReceivable += debt;
                totalPaid += paid;
            }
        });
        return { totalReceivable, totalPaid, totalExpenses };
    }

    function invalidateCache() {
        cache.clear();
    }

    return { getFinancialSummary, computeTotals, invalidateCache };
})();
