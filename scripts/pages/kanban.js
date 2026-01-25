// scripts/pages/kanban.js
import { KanbanService } from '../services/KanbanService.js';

// Estado global da tela
const state = {
    cols: [],
    protocols: []
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Auth to be ready (max 2 seconds)
    let attempts = 0;
    const interval = setInterval(async () => {
        attempts++;
        if (window.authService && window.authService.user) {
            clearInterval(interval);
            console.log("Kanban: Auth ready, user:", window.authService.user.email);
            await loadBoard();
            initDragAndDrop();
        } else if (attempts > 10) { // 2s wait (10 * 200ms)
            // Se demorar muito, tenta carregar mesmo assim (pode falhar se RLS estiver ativo)
            clearInterval(interval);
            console.warn("Kanban: Auth timeout. Loading anyway...");
            await loadBoard();
            initDragAndDrop();
        }
    }, 200);
});

// 1. Carregar Dados
async function loadBoard() {
    try {
        // Busca colunas e cartas em paralelo
        // O Service agora retorna { success: true/false, data: ... }
        // MAS getColumns e getProtocols ainda retornam dados diretos ou throw no service (para leitura)
        // Vamos manter o padrão de leitura atual do service (throw em erro crítico) 
        // mas preparar para o futuro.
        // REVISÃO: O service novo dá throw em erro crítico de leitura. OK.

        const [cols, protocols] = await Promise.all([
            KanbanService.getColumns(),
            KanbanService.getProtocols()
        ]);

        state.cols = cols;
        state.protocols = protocols;

        if (state.cols.length === 0) {
            document.getElementById('board').innerHTML = '<div style="color:white; padding:20px;">Nenhuma coluna encontrada. Verifique se o SQL foi rodado.</div>';
        } else {
            renderBoard();
        }
    } catch (error) {
        console.error('Erro ao carregar Kanban:', error);
        document.getElementById('board').innerHTML = `<div style="color:#ef4444; padding:20px;">Erro ao carregar: ${error.message} <br> (Você está logado como admin?)</div>`;
    }
}

// ... (renderBoard e createCardElement mantidos iguais) ...

// 3. Drag & Drop (A Mágica)
function initDragAndDrop() {
    const containers = document.querySelectorAll('.column-content');

    containers.forEach(container => {
        new Sortable(container, {
            group: 'kanban',
            animation: 150,
            ghostClass: 'sortable-ghost',
            delay: 100, // Evita clique acidental no mobile

            // Quando soltar o card...
            onEnd: async function (evt) {
                const itemEl = evt.item;
                const newColId = evt.to.dataset.colId;
                const oldColId = evt.from.dataset.colId; // Para reverter
                const cardId = itemEl.dataset.id;

                // Se mudou de coluna
                if (evt.to !== evt.from) {
                    console.log(`Movendo card ${cardId} para coluna ${newColId}`);

                    // Chamada Segura
                    const result = await KanbanService.moveCard(cardId, newColId);

                    if (result.success) {
                        // Sucesso silencioso (ou Toast)
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000,
                            timerProgressBar: true,
                        });
                        Toast.fire({
                            icon: 'success',
                            title: 'Card movido com sucesso'
                        });
                    } else {
                        // Falha: Reverter visual e avisar
                        console.error('Erro ao mover:', result.error);

                        Swal.fire({
                            icon: 'error',
                            title: 'Erro ao mover',
                            text: result.error.message || 'Falha na comunicação com o servidor.'
                        });

                        // Força recarregar para voltar o card pro lugar (solução simples para rollback)
                        // Poderíamos mover o elemento DOM de volta manualmente, mas reload garante sync.
                        setTimeout(() => loadBoard(), 1000);
                    }
                }
            }
        });
    });
}
