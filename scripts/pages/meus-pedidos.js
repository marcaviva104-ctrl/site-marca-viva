/**
 * Logic for meus-pedidos.html
 * Fetches data from supabase using email/cpf matching
 */

const KanbanDictionary = {
    0: { label: 'Em Análise', step: 0 },
    1: { label: 'Caixa de Entrada', step: 0 },
    2: { label: 'Aprovando Arte', step: 1 },
    3: { label: 'Aguardando Pag.', step: 1 },
    4: { label: 'Produção', step: 2 },
    5: { label: 'Finalizado / Enviado', step: 3 }
};

async function searchOrders(event) {
    if (event) event.preventDefault();

    const inputVal = document.getElementById('search-input').value.trim();
    if (!inputVal) return;

    const loader = document.getElementById('loader');
    const resultsArea = document.getElementById('results-area');
    const emptyState = document.getElementById('empty-state');

    loader.style.display = 'block';
    resultsArea.style.display = 'none';
    emptyState.style.display = 'none';
    resultsArea.innerHTML = '<div class="results-header"><span>Pedidos encontrados</span><span class="results-count" id="results-count">0</span></div>';

    try {
        if (!window.supabase) throw new Error("Supabase indisponível");

        let { data: protocols, error } = await window.supabase
            .from('protocols')
            .select(`
                id, 
                created_at, 
                total_amount, 
                column_id, 
                status, 
                payment_status,
                items:protocol_items(product_name, quantity, unit_price, customization_details)
            `)
            .ilike('client_email', `%${inputVal}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!protocols || protocols.length === 0) {
            emptyState.style.display = 'block';
        } else {
            document.getElementById('results-count').textContent = protocols.length;
            renderOrders(protocols);
            resultsArea.style.display = 'block';
        }

    } catch (err) {
        console.error("Erro na busca:", err);
        emptyState.innerHTML = `
            <div class="empty-icon"><i class="ph-duotone ph-warning-circle"></i></div>
            <h3 style="color:#ef4444">Erro na conexão</h3>
            <p>Não foi possível conectar ao servidor.<br>Tente novamente em instantes.</p>
        `;
        emptyState.style.display = 'block';
    } finally {
        loader.style.display = 'none';
    }
}

function renderOrders(protocols) {
    const trackerStepsDef = [
        { icon: 'ph-clipboard-text', label: 'Recebido' },
        { icon: 'ph-currency-dollar', label: 'Pagamento' },
        { icon: 'ph-paint-brush', label: 'Produção' },
        { icon: 'ph-truck', label: 'Enviado' }
    ];

    const html = protocols.map(p => {
        const colId = p.column_id || 1;
        const info = KanbanDictionary[colId] || { label: 'Desconhecido', step: 0 };
        const currentStep = info.step;
        const progressPercent = (currentStep / 3) * 100;
        const date = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        const total = typeof p.total_amount === 'number' ? p.total_amount.toFixed(2).replace('.', ',') : '0,00';

        // Items list
        let itemsHtml = '';
        if (p.items && p.items.length > 0) {
            itemsHtml = p.items.map(i => `
                <div class="item-row">
                    <span class="item-name">${i.quantity}x <strong>${i.product_name}</strong></span>
                    <span class="item-price">R$ ${(i.quantity * i.unit_price).toFixed(2).replace('.', ',')}</span>
                </div>
            `).join('');
        } else {
            itemsHtml = `<div class="item-row"><span class="item-name" style="color:#94a3b8;">Sem itens detalhados</span></div>`;
        }

        // Tracker steps
        const stepsHtml = trackerStepsDef.map((step, idx) => {
            let stateClass = '';
            if (idx < currentStep) stateClass = 'done';
            else if (idx === currentStep) stateClass = 'current';
            const iconHtml = stateClass === 'done'
                ? '<i class="ph-bold ph-check"></i>'
                : `<i class="ph-bold ${step.icon}"></i>`;
            return `
                <div class="step ${stateClass}">
                    <div class="step-icon">${iconHtml}</div>
                    <div class="step-label">${step.label}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="order-card">
                <div class="order-card-top">
                    <div class="order-id-wrap">
                        <div class="order-id">Pedido #${p.id}</div>
                        <div class="order-date">
                            <i class="ph-bold ph-calendar-blank"></i>
                            ${date}
                        </div>
                    </div>
                    <div class="order-right">
                        <span class="status-badge">${info.label}</span>
                        <div class="order-total">R$ ${total}</div>
                    </div>
                </div>

                <div class="tracker-container">
                    <div class="tracker-steps">
                        <div class="tracker-line"></div>
                        <div class="tracker-progress" style="width: ${progressPercent}%;"></div>
                        ${stepsHtml}
                    </div>
                </div>

                <div class="items-section">
                    <div class="items-title">Itens do pedido</div>
                    ${itemsHtml}
                </div>

                <div class="card-footer">
                    <a href="https://wa.me/5531987398136?text=Olá! Quero saber detalhes do meu pedido: ${p.id}" target="_blank" class="btn-whatsapp">
                        <i class="ph-bold ph-whatsapp-logo"></i> Falar com suporte
                    </a>
                </div>
            </div>
        `;
    }).join('');

    // Append after the results-header
    const resultsArea = document.getElementById('results-area');
    const existingHeader = resultsArea.querySelector('.results-header');
    if (existingHeader) {
        existingHeader.insertAdjacentHTML('afterend', html);
    } else {
        resultsArea.innerHTML += html;
    }
}
