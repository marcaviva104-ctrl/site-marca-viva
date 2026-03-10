// scripts/pages/track.js
// ADAPTADO PARA RODAR SEM SERVIDOR (file://)

// import { KanbanService } from '../services/KanbanService.js'; (Removed)

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Get Protocol ID from URL (?id=MV-...)
    const params = new URLSearchParams(window.location.search);
    const protocolId = params.get('id');

    if (protocolId) {
        document.querySelector('.input-track').value = protocolId;
        await searchProtocol(protocolId);
    }

    // 2. Setup Search Form
    const searchForm = document.querySelector('.search-box');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const inputVal = document.querySelector('.input-track').value;
            if (inputVal) await searchProtocol(inputVal);
        });
    }
});

async function searchProtocol(id) {
    if (!id.startsWith('#')) id = '#' + id; // Auto-fix missing #

    // Pega o Service global
    const KanbanService = window.KanbanService;

    if (!KanbanService) {
        console.error("FATAL: KanbanService não carregado.");
        Swal.fire('Erro', 'Sistema não carregou corretamente. Recarregue a página.', 'error');
        return;
    }

    try {
        Swal.showLoading();

        const allProtocols = await KanbanService.getProtocols();
        const protocol = allProtocols.find(p => p.id === id);

        Swal.close();

        if (protocol) {
            renderResult(protocol);
        } else {
            Swal.fire('Não encontrado', 'Verifique o código ou faça login.', 'error');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Falha ao buscar protocolo.', 'error');
    }
}

function renderResult(protocol) {
    // Hide Search, Show Result
    document.getElementById('search-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';

    // Update Header
    document.querySelector('.protocol-badge').innerText = protocol.id;

    // Determine Status Text
    // TODO: Map Column ID to Text Name (Need getColumns)
    // For now, simplified mapping
    let statusText = "Em Processamento";
    if (protocol.column_id === 1) statusText = "Recebido / Entrada";
    if (protocol.column_id === 2) statusText = "Aguardando Pagamento";
    if (protocol.column_id === 3) statusText = "Criação de Arte";
    if (protocol.column_id === 4) statusText = "Aprovação Necessária";
    if (protocol.column_id >= 5) statusText = "EM PRODUÇÃO 🚀";

    document.querySelector('#result-view h3').innerText = `Pedido ${statusText}`;

    // Render Timeline (Simplified)
    const steps = [
        { id: 1, label: 'Recebido' },
        { id: 2, label: 'Pagamento' },
        { id: 3, label: 'Arte' },
        { id: 5, label: 'Produção' },
        { id: 6, label: 'Enviado' }
    ];

    const timelineContainer = document.querySelector('.timeline');
    timelineContainer.innerHTML = steps.map(step => {
        const isActive = protocol.column_id >= step.id;
        return `
            <div class="step ${isActive ? 'active' : ''}">
                <div class="step-dot"></div>
                <div class="step-title">${step.label}</div>
                <div class="step-date">${isActive ? 'Concluído' : 'Aguardando'}</div>
            </div>
        `;
    }).join('');
}
