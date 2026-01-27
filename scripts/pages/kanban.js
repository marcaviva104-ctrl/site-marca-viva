// scripts/pages/kanban.js
import { KanbanService } from '../services/KanbanService.js';

// Global State
const state = {
    cols: [], // Kanban Columns
    protocols: [], // Production Protocols
    requests: [], // New Inbox Requests
    currentView: 'production' // 'production' or 'inbox'
};

// Sound asset for notifications
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
function playNotificationSound() {
    // Simple Beep using Oscillator (No external file needed)
    try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc.start();
        osc.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.error("Audio error:", e);
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Auth
    let attempts = 0;
    const interval = setInterval(async () => {
        attempts++;
        if (window.authService && window.authService.user) {
            clearInterval(interval);
            console.log("Kanban: Auth ready.");

            // Initial Load
            await loadData();

            // Start Polling for Notifications (every 30s)
            startNotificationService();

        } else if (attempts > 10) {
            clearInterval(interval);
            console.warn("Kanban: Auth timeout. Loading anyway...");
            await loadData();
        }
    }, 200);
});

// 1. Data Loading
async function loadData() {
    try {
        // Fetch All Data needed
        // Note: In real app, we would have specific endpoints. 
        // Here we filter client-side or assume getProtocols returns everything for Admin.
        const [cols, allProtocols] = await Promise.all([
            KanbanService.getColumns(),
            KanbanService.getProtocols() // Fetches everything
        ]);

        state.cols = cols;

        // Split data based on 'column_id' or status
        // Inbox = column_id 0 (Ag. Aprovação)
        state.requests = allProtocols.filter(p => p.column_id === 0 || p.status === 'inquiry');
        state.protocols = allProtocols.filter(p => p.column_id > 0 && p.status !== 'inquiry');

        render();
        updateInboxCount();

    } catch (error) {
        console.error('Erro ao carregar sistema:', error);
        document.getElementById('board').innerHTML = `<div style="color:red; padding:20px;">Erro: ${error.message}</div>`;
    }
}

// 2. Rendering
function render() {
    if (state.currentView === 'production') {
        renderProductionBoard();
    } else {
        renderInbox();
    }
}

function renderProductionBoard() {
    const board = document.getElementById('board');
    board.className = 'kanban-board';
    board.innerHTML = state.cols.map(col => `
        <div class="column" data-col-id="${col.id}">
            <div class="column-header" style="border-top: 3px solid ${col.color || '#ccc'}">
                <h3>${col.title} <span class="count">${state.protocols.filter(p => p.column_id === col.id).length}</span></h3>
            </div>
            <div class="column-content" data-col-id="${col.id}">
                ${state.protocols
            .filter(p => p.column_id === col.id)
            .map(card => createCardElement(card, col.id))
            .join('')}
            </div>
        </div>
    `).join('');

    initDragAndDrop();
}

function renderInbox() {
    const board = document.getElementById('board');
    board.className = 'inbox-view';

    if (state.requests.length === 0) {
        board.innerHTML = `
            <div style="text-align:center; color:white; margin-top:50px;">
                <i class="ph-duotone ph-tray" style="font-size:4rem; opacity:0.5;"></i>
                <h2>Caixa de Entrada Vazia</h2>
                <p>Nenhum novo pedido de orçamento no momento.</p>
            </div>`;
        return;
    }

    board.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
            ${state.requests.map(req => `
                <div class="request-card" style="background: white; padding: 20px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div>
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 5px;">
                            <span style="background:#fef3c7; color:#d97706; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight:bold;">NOVO PEDIDO</span>
                            <strong style="font-size: 1.1rem;">${req.id}</strong>
                        </div>
                        <div style="color: #64748b; font-size: 0.95rem;">
                            Cliente: <strong>${req.client?.email || 'Desconhecido'}</strong> <br>
                            Total: R$ ${req.total_amount ? req.total_amount.toFixed(2) : '0.00'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <a href="https://wa.me/?text=Olá, recebi seu pedido ${req.id}!" target="_blank" class="btn-secondary" style="background: #25d366; color: white; border: none; padding: 10px 16px; border-radius: 8px; display:flex; align-items:center; gap:5px; text-decoration:none;">
                            <i class="ph-bold ph-whatsapp-logo"></i> Contatar
                        </a>
                        <button onclick="kanban.promoteToProtocol('${req.id}')" style="background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; display:flex; align-items:center; gap:5px;">
                            <i class="ph-bold ph-check"></i> Gerar Protocolo
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function createCardElement(card, colId) {
    // Check if it's in "Aguardando Pagamento" (Column 3)
    let extraActions = '';

    // Convert to number just in case
    const cid = Number(colId);

    if (cid === 3) { // Awaiting Payment
        extraActions = `
            <button onclick="kanban.confirmPayment('${card.id}')" style="margin-top:10px; width:100%; padding:8px; border:none; background:#16a34a; color:white; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.85rem;">
                <i class="ph-bold ph-money"></i> Confirmar Pagamento
            </button>
        `;
    }

    return `
        <div class="kanban-card" data-id="${card.id}">
            <div class="card-header">
                <strong>${card.id}</strong>
                <i class="ph-bold ph-dots-three-vertical"></i>
            </div>
            <div class="card-body">
                <p>${card.notes || 'Sem observações'}</p>
                <div class="card-meta">
                    <span>${card.client?.email?.split('@')[0] || 'Cliente'}</span>
                    <span class="badg-price">R$ ${card.total_amount}</span>
                </div>
                ${extraActions}
            </div>
        </div>
    `;
}

// 3. Logic: Approve & Confirm Logic
window.kanban = {
    switchView: (viewName) => {
        state.currentView = viewName;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`view-${viewName}`).classList.add('active');
        render();
    },

    // Step 1: Promote Request -> Production (Official Protocol)
    promoteToProtocol: async (requestId) => {
        const result = await Swal.fire({
            title: 'Gerar Protocolo Oficial?',
            text: `Isso transformará o pedido ${requestId} em um Protocolo de Produção (#MV).`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, Aprovar',
            confirmButtonColor: '#2563eb'
        });

        if (result.isConfirmed) {
            try {
                Swal.showLoading();
                const adminId = window.authService?.user?.id;
                if (!adminId) throw new Error("Usuário não autenticado.");

                const apiRes = await KanbanService.promoteToProtocol(requestId, adminId);
                if (apiRes.success) {
                    Swal.fire('Sucesso!', `Protocolo <b>${apiRes.data.new_id}</b> criado!`, 'success');
                    loadData();
                } else {
                    throw new Error(apiRes.error.message || 'Erro desconhecido');
                }
            } catch (err) {
                console.error(err);
                Swal.fire('Erro', err.message, 'error');
            }
        }
    },

    // Step 2: Approve Art (Legacy/Normal Flow)
    approveRequest: async (requestId) => {
        const result = await Swal.fire({
            title: 'Aprovar Arte?',
            text: `O pedido ${requestId} irá para "Aguardando Pagamento".`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sim, Aprovar',
            confirmButtonColor: '#2563eb'
        });

        if (result.isConfirmed) {
            try {
                const apiRes = await KanbanService.approveRequest(requestId);
                if (apiRes.success) {
                    Swal.fire('Aprovado!', 'Aguardando pagamento do cliente.', 'success');
                    loadData();
                } else {
                    throw new Error(apiRes.error.message);
                }
            } catch (err) {
                Swal.fire('Erro', err.message, 'error');
            }
        }
    },

    // Step 2: Confirm Payment -> Production
    confirmPayment: async (requestId) => {
        const result = await Swal.fire({
            title: 'Confirmar Pagamento?',
            text: `O valor caiu na conta? O pedido ${requestId} irá para PRODUÇÃO oficial (#MV).`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sim, Iniciar Produção',
            confirmButtonColor: '#16a34a'
        });

        if (result.isConfirmed) {
            try {
                const adminId = window.authService?.user?.id;
                if (!adminId) throw new Error("Usuário não autenticado.");

                const apiRes = await KanbanService.promoteToProtocol(requestId, adminId);
                if (apiRes.success) {
                    Swal.fire('Produção Iniciada!', `Protocolo <b>${apiRes.data.new_id}</b> gerado com sucesso.`, 'success');
                    loadData();
                } else {
                    throw new Error(apiRes.error.message);
                }
            } catch (err) {
                Swal.fire('Erro', err.message, 'error');
            }
        }
    }
};

// 4. Notifications & Polling
function startNotificationService() {
    let lastCount = 0;

    setInterval(async () => {
        // Silent Check
        const allProtocols = await KanbanService.getProtocols();
        const newRequests = allProtocols.filter(p => p.column_id === 0 || p.status === 'inquiry');

        // Update Badge
        updateInboxCount(newRequests.length);

        // Check if increased
        if (newRequests.length > lastCount) {
            // New Request Arrived!
            playNotificationSound();
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer)
                    toast.addEventListener('mouseleave', Swal.resumeTimer)
                }
            })

            Toast.fire({
                icon: 'success',
                title: '🔔 Novo Pedido Recebido!',
                text: 'Verifique a Caixa de Entrada.'
            });
        }

        lastCount = newRequests.length;
        // Update state silently if needed, or just let next reload handle it
        state.requests = newRequests;

    }, 15000); // Check every 15 seconds
}

function updateInboxCount(count) {
    if (count === undefined) count = state.requests.length;

    const badge = document.getElementById('inbox-count');
    if (badge) {
        badge.innerText = count;
        badge.style.display = count > 0 ? 'inline-block' : 'none';

        // Update Button View Text if needed
        const btn = document.getElementById('view-inbox');
        if (count > 0) {
            btn.classList.add('pulse-animation'); // Can add CSS for this
        } else {
            btn.classList.remove('pulse-animation');
        }
    }
}

// 5. Drag & Drop (Production Only)
function initDragAndDrop() {
    if (state.currentView !== 'production') return;

    const containers = document.querySelectorAll('.column-content');
    containers.forEach(container => {
        new Sortable(container, {
            group: 'kanban',
            animation: 150,
            onEnd: async function (evt) {
                const itemEl = evt.item;
                const newColId = evt.to.dataset.colId;
                const cardId = itemEl.dataset.id;
                if (evt.to !== evt.from) {
                    await KanbanService.moveCard(cardId, newColId);
                }
            }
        });
    });
}
