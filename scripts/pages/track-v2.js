/**
 * Track Page v2 - Client Order Tracking
 * Real-time order status visualization
 */

// Status definitions
const STATUS_CONFIG = {
    inquiry: {
        label: 'Aguardando Aprovação',
        icon: '🕒',
        color: '#f59e0b',
        description: 'Seu pedido está sendo analisado'
    },
    approved: {
        label: 'Pedido Aprovado',
        icon: '✅',
        color: '#3b82f6',
        description: 'Pedido aprovado! Iniciando produção'
    },
    design: {
        label: 'Criando Design',
        icon: '🎨',
        color: '#8b5cf6',
        description: 'Estamos criando a arte personalizada'
    },
    awaiting_payment: {
        label: 'Aguardando Pagamento',
        icon: '💰',
        color: '#f59e0b',
        description: 'Aguardando confirmação do pagamento'
    },
    production: {
        label: 'Em Produção',
        icon: '⚙️',
        color: '#f97316',
        description: 'Estamos confeccionando seus produtos!'
    },
    ready: {
        label: 'Pronto para Retirar',
        icon: '📦',
        color: '#10b981',
        description: 'Seu pedido está pronto!'
    },
    delivered: {
        label: 'Entregue',
        icon: '🎉',
        color: '#6366f1',
        description: 'Pedido entregue com sucesso!'
    }
};

// Timeline steps (order matters!)
const TIMELINE_STEPS = [
    { id: 'inquiry', label: 'Pedido Recebido' },
    { id: 'approved', label: 'Pedido Aprovado' },
    { id: 'design', label: 'Design Criado' },
    { id: 'awaiting_payment', label: 'Pagamento Confirmado' },
    { id: 'production', label: 'Em Produção' },
    { id: 'ready', label: 'Pronto' },
    { id: 'delivered', label: 'Entregue' }
];

let currentOrder = null;

// Check URL params on load
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const protocol = params.get('protocol') || params.get('id');

    if (protocol) {
        document.getElementById('protocolInput').value = protocol;
        searchOrder();
    }
});

async function searchOrder() {
    const input = document.getElementById('protocolInput').value.trim();

    if (!input) {
        showError('Por favor, digite o código do pedido');
        return;
    }

    // Normalize input (remove # if present)
    const protocolId = input.startsWith('#') ? input : `#${input}`;

    showLoading();

    try {
        console.log('🔍 Searching for order:', protocolId);

        if (!window.supabase) {
            throw new Error('Supabase não está carregado. Verifique sua conexão.');
        }

        // Fetch order WITHOUT the profiles JOIN (since FK was removed)
        const { data, error } = await window.supabase
            .from('protocols')
            .select(`
                *,
                items:protocol_items(*)
            `)
            .eq('id', protocolId)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }

        if (!data) {
            throw new Error('Pedido não encontrado. Verifique o código e tente novamente.');
        }

        console.log('✅ Order found:', data);
        currentOrder = data;
        displayOrder(data);

    } catch (err) {
        console.error('❌ Error:', err);
        showError(err.message || 'Erro ao buscar pedido. Tente novamente.');
    }
}

function showLoading() {
    document.getElementById('searchBox').style.display = 'none';
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('orderContent').style.display = 'none';
}

function showError(message) {
    document.getElementById('searchBox').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
    document.getElementById('orderContent').style.display = 'none';
    document.getElementById('errorMessage').textContent = message;
}

function resetSearch() {
    document.getElementById('searchBox').style.display = 'block';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('orderContent').style.display = 'none';
    document.getElementById('protocolInput').value = '';
    document.getElementById('protocolInput').focus();
}

function displayOrder(order) {
    console.log('📊 Displaying order:', order);

    // Hide loading/search, show content
    document.getElementById('searchBox').style.display = 'none';
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
    document.getElementById('orderContent').style.display = 'block';

    // Order Header
    document.getElementById('orderId').textContent = order.id;
    // Client data is stored directly in protocols table (client_name, client_email)
    document.getElementById('clientName').textContent = order.client_name || 'Cliente';
    document.getElementById('orderDate').textContent = new Date(order.created_at).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Current Status
    const status = order.status || 'inquiry';
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.inquiry;

    document.getElementById('currentIcon').textContent = config.icon;
    document.getElementById('currentStatus').textContent = config.label;
    document.getElementById('currentDesc').textContent = config.description;

    // Update current status card color
    const statusCard = document.querySelector('.status-current');
    statusCard.style.background = `linear-gradient(135deg, ${config.color} 0%, ${adjustColor(config.color, -20)} 100%)`;

    // Progress Timeline
    renderTimeline(status, order);

    // Order Details
    renderDetails(order);

    // WhatsApp Button - use client_phone stored in protocols
    const phone = order.client_phone || '5511999999999'; // Default if not found
    const message = `Olá! Vim acompanhar meu pedido ${order.id}`;
    document.getElementById('whatsappBtn').href = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

function renderTimeline(currentStatus, order) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    const currentIndex = TIMELINE_STEPS.findIndex(step => step.id === currentStatus);

    TIMELINE_STEPS.forEach((step, index) => {
        const item = document.createElement('div');
        item.className = 'timeline-item';

        if (index < currentIndex) {
            item.classList.add('completed');
        } else if (index === currentIndex) {
            item.classList.add('current');
        } else {
            item.classList.add('pending');
        }

        const icon = document.createElement('div');
        icon.className = 'timeline-icon';

        if (index < currentIndex) {
            icon.innerHTML = '<i class="ph-bold ph-check"></i>';
        } else if (index === currentIndex) {
            icon.innerHTML = '<i class="ph-bold ph-circle"></i>';
        } else {
            icon.innerHTML = '<i class="ph-bold ph-circle"></i>';
        }

        const content = document.createElement('div');
        content.className = 'timeline-content';

        const title = document.createElement('div');
        title.className = 'timeline-title';
        title.textContent = step.label;

        const date = document.createElement('div');
        date.className = 'timeline-date';

        if (index < currentIndex) {
            date.textContent = '✓ Concluído';
        } else if (index === currentIndex) {
            date.textContent = 'Em andamento...';
        } else {
            date.textContent = 'Aguardando';
        }

        content.appendChild(title);
        content.appendChild(date);
        item.appendChild(icon);
        item.appendChild(content);
        timeline.appendChild(item);
    });
}

function renderDetails(order) {
    const grid = document.getElementById('detailsGrid');
    grid.innerHTML = '';

    // Total Amount
    addDetail(grid, 'Valor Total', `R$ ${(order.total_amount || 0).toFixed(2)}`);

    // Payment Status
    const paymentLabels = {
        pending: '⏳ Pendente',
        partial: '⚠️ Parcial',
        paid_full: '✅ Pago'
    };
    addDetail(grid, 'Pagamento', paymentLabels[order.payment_status] || paymentLabels.pending);

    // Items Count
    const itemsCount = order.items?.length || 0;
    addDetail(grid, 'Itens', `${itemsCount} produto(s)`);

    // Notes (if any)
    if (order.notes) {
        addDetail(grid, 'Observações', order.notes);
    }
}

function addDetail(container, label, value) {
    const item = document.createElement('div');
    item.className = 'detail-item';

    const labelEl = document.createElement('div');
    labelEl.className = 'detail-label';
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.className = 'detail-value';
    valueEl.textContent = value;

    item.appendChild(labelEl);
    item.appendChild(valueEl);
    container.appendChild(item);
}

// Helper: Adjust color brightness
function adjustColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

// Auto-refresh every 30 seconds (optional)
setInterval(() => {
    if (currentOrder) {
        console.log('🔄 Auto-refreshing order status...');
        searchOrder();
    }
}, 30000);
