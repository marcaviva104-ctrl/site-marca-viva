/**
 * Marca Viva - Constantes Globais
 * Fonte única de verdade para status, textos e configurações do sistema.
 * USO: window.MV.STATUS.INQUIRY, window.MV.STATUS_LABEL[status], etc.
 */

window.MV = window.MV || {};

// ─────────────────────────────────────────────
// STATUS DOS PEDIDOS (protocols.status)
// ─────────────────────────────────────────────
MV.STATUS = Object.freeze({
    INQUIRY: 'inquiry',           // Orçamento recebido (padrão B2B)
    AWAITING_PAYMENT: 'awaiting_payment',  // Aguardando pagamento
    PENDING: 'pending',           // Pendente (alias mais genérico)
    APPROVED: 'approved',          // Arte/Orçamento aprovado
    PRODUCTION: 'production',        // Em produção
    DONE: 'done',              // Finalizado / pronto para envio
    DELIVERED: 'delivered',         // Entregue ao cliente
    CANCELLED: 'cancelled'          // Cancelado
});

// Labels amigáveis para exibir no front-end
MV.STATUS_LABEL = Object.freeze({
    [MV.STATUS.INQUIRY]: 'Aguardando Análise',
    [MV.STATUS.AWAITING_PAYMENT]: 'Aguardando Pagamento',
    [MV.STATUS.PENDING]: 'Pendente',
    [MV.STATUS.APPROVED]: 'Aprovado',
    [MV.STATUS.PRODUCTION]: 'Em Produção',
    [MV.STATUS.DONE]: 'Finalizado',
    [MV.STATUS.DELIVERED]: 'Entregue',
    [MV.STATUS.CANCELLED]: 'Cancelado'
});

// Cor do badge por status (para a UI)
MV.STATUS_COLOR = Object.freeze({
    [MV.STATUS.INQUIRY]: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' }, // laranja
    [MV.STATUS.AWAITING_PAYMENT]: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' }, // amarelo
    [MV.STATUS.PENDING]: { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' }, // cinza
    [MV.STATUS.APPROVED]: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }, // azul
    [MV.STATUS.PRODUCTION]: { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }, // roxo
    [MV.STATUS.DONE]: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }, // verde
    [MV.STATUS.DELIVERED]: { bg: '#f0fdf4', text: '#15803d', border: '#86efac' }, // verde escuro
    [MV.STATUS.CANCELLED]: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }, // vermelho
});

// ─────────────────────────────────────────────
// PAYMENT STATUS (protocols.payment_status)
// ─────────────────────────────────────────────
MV.PAYMENT = Object.freeze({
    PENDING: 'pending',
    PAID: 'paid',
    REFUNDED: 'refunded',
    FAILED: 'failed'
});

MV.PAYMENT_LABEL = Object.freeze({
    [MV.PAYMENT.PENDING]: 'Pendente',
    [MV.PAYMENT.PAID]: 'Pago',
    [MV.PAYMENT.REFUNDED]: 'Reembolsado',
    [MV.PAYMENT.FAILED]: 'Falhou'
});

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Retorna o label de um status (com fallback seguro)
 * @param {string} status
 */
MV.getStatusLabel = function (status) {
    return MV.STATUS_LABEL[status] || status || 'Desconhecido';
};

/**
 * Gera o HTML do badge de status
 * @param {string} status
 */
MV.getStatusBadge = function (status) {
    const color = MV.STATUS_COLOR[status] || MV.STATUS_COLOR[MV.STATUS.PENDING];
    const label = MV.getStatusLabel(status);
    return `<span style="display:inline-block; padding:3px 10px; border-radius:99px; font-size:0.78rem; font-weight:600;
        background:${color.bg}; color:${color.text}; border:1px solid ${color.border};">${label}</span>`;
};

/**
 * Normaliza status legados para o padrão atual
 * @param {string} status
 */
MV.normalizeStatus = function (status) {
    const map = {
        'pending': MV.STATUS.INQUIRY,      // legado
        'paid': MV.STATUS.AWAITING_PAYMENT,
        'shipped': MV.STATUS.DELIVERED,
        'completed': MV.STATUS.DONE
    };
    return map[status] || status;
};

console.log('✅ MV Constants carregadas:', Object.keys(MV.STATUS).length, 'status definidos.');
