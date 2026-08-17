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

let cachedColumns = null;

async function getColumnsCached() {
    if (!cachedColumns) {
        cachedColumns = await window.KanbanService.getColumns();
    }
    return cachedColumns;
}

async function searchProtocol(id) {
    if (!id.startsWith('#')) id = '#' + id; // Auto-fix missing #

    if (!window.supabase) {
        console.error("FATAL: Supabase não carregado.");
        Swal.fire('Erro', 'Sistema não carregou corretamente. Recarregue a página.', 'error');
        return;
    }

    try {
        Swal.showLoading();

        // Busca só este pedido, na view pública de rastreio (protocol_tracking) —
        // ela não tem nome/e-mail/telefone/valor, só status. Antes esta página
        // baixava TODOS os pedidos de TODOS os clientes só pra achar um ID
        // (window.KanbanService.getProtocols() sem filtro).
        const [{ data: protocol, error }, columns] = await Promise.all([
            window.supabase
                .from('protocol_tracking')
                .select('*')
                .eq('id', id)
                .maybeSingle(),
            getColumnsCached()
        ]);

        Swal.close();

        if (error) throw error;

        if (protocol) {
            renderResult(protocol, columns);
        } else {
            Swal.fire('Não encontrado', 'Verifique o código ou faça login.', 'error');
        }

    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Falha ao buscar protocolo.', 'error');
    }
}

function renderResult(protocol, columns) {
    // Hide Search, Show Result
    document.getElementById('search-view').style.display = 'none';
    document.getElementById('result-view').style.display = 'block';

    // Update Header
    document.querySelector('.protocol-badge').innerText = protocol.id;

    // Status e timeline vêm das colunas reais do kanban (mesma fonte que o
    // admin usa), em vez de textos fixos que ficavam dessincronizados do
    // fluxo real (ex: coluna 4 nunca aparecia na timeline antiga).
    const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
    const currentIndex = sortedColumns.findIndex(col => col.id === protocol.column_id);
    const currentColumn = currentIndex >= 0 ? sortedColumns[currentIndex] : null;

    const statusText = currentColumn ? currentColumn.title : "Em Processamento";
    document.querySelector('#result-view h3').innerText = `Pedido: ${statusText}`;

    const timelineContainer = document.querySelector('.timeline');
    timelineContainer.innerHTML = sortedColumns.map((col, index) => {
        const isActive = currentIndex >= 0 && index <= currentIndex;
        return `
            <div class="step ${isActive ? 'active' : ''}">
                <div class="step-dot"></div>
                <div class="step-title">${col.title}</div>
                <div class="step-date">${isActive ? 'Concluído' : 'Aguardando'}</div>
            </div>
        `;
    }).join('');
}
