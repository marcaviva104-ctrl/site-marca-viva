// scripts/pages/kanban.js
// import { KanbanService } from '../services/KanbanService.js'; // Removed: Loaded globally
console.log("KANBAN: Script Starting...");
// alert("DEBUG: Script Start"); // Uncomment if needed, but console is safer.
// Let's just use console for now, user likely can't see alert if blocked.
// Actually, user said 'same thing', maybe cache is strong.
// I'll add a cache buster variable.
const KANBAN_VERSION = "2.1-fix";

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
// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Safe Event Listeners Binding
    const modal = document.getElementById('protocol-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'protocol-modal') window.closeProtocolModal();
        });
    }

    const searchInput = document.getElementById('kanban-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.kanban-card');

            cards.forEach(card => {
                // Safe check for elements
                const titleEl = card.querySelector('.card-title');
                const clientEl = card.querySelector('.card-client'); // Note: smart card structure might differ

                // Fallback for smart card structure if classes are different
                const textContent = card.innerText.toLowerCase();

                if (textContent.includes(term)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

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


// --- 3. MODAL & INTERACTIVITY ---

window.openProtocolModal = function (protocolId) {
    if (window.ProtocolDetailView) {
        ProtocolDetailView.open(protocolId);
    } else {
        console.error("ProtocolDetailView not loaded");
    }
};

window.closeProtocolModal = function () {
    document.getElementById('protocol-modal').style.display = 'none';
};

// Close on outside click
// Event listeners moved to DOMContentLoaded


// Update render to include onclick
// Smart Card Render
function renderCard(p) {
    const client = p.client || {};
    const meta = client.raw_user_meta_data || {};
    const clientName = meta.name || p.client_name || 'Cliente';
    const total = p.total_amount || 0;
    const isPaid = p.payment_status === 'paid_full';

    // Priority Logic
    let borderClass = '';
    let priorityIcon = '';
    if (p.priority === 'urgent') {
        borderClass = 'border-urgent'; // Red Border
        priorityIcon = '<span title="Urgente" style="color:#ef4444;">🔥</span>';
    } else if (p.priority === 'high') {
        borderClass = 'border-high'; // Orange Border
        priorityIcon = '<span title="Alta Prioridade" style="color:#f59e0b;">⚡</span>';
    }

    // Due Date Logic
    let dateBadge = '';
    if (p.due_date) {
        const due = new Date(p.due_date);
        const today = new Date();
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let dueColor = '#64748b'; // Gray
        let dueText = due.toLocaleDateString('pt-BR').slice(0, 5); // dd/mm

        if (diffDays < 0) {
            dueColor = '#ef4444'; // Overdue (Red)
            dueText = `ATRASADO (${Math.abs(diffDays)}d)`;
            borderClass = 'border-urgent'; // Force red border
        } else if (diffDays <= 2) {
            dueColor = '#f59e0b'; // Warning (Orange)
            dueText = diffDays === 0 ? 'HOJE' : (diffDays === 1 ? 'AMANHÃ' : dueText);
        }

        dateBadge = `<span style="background:${dueColor}20; color:${dueColor}; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">🕒 ${dueText}</span>`;
    }

    // Image Preview (First item)
    // Assuming we might have an image url in the product item later, currently just placeholder icon if no image
    // For now, let's use a generic 'Shirt' icon or the product name
    const mainItem = p.items && p.items[0] ? p.items[0].product_name : 'Pedido Personalizado';

    return `
        <div class="kanban-card ${borderClass}" draggable="true" ondragstart="drag(event)" id="${p.id}" onclick="openProtocolModal('${p.id}')">
            <div class="card-header-smart" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <div class="card-tags" style="gap:4px;">
                   ${priorityIcon}
                   <span class="tag tag-id">#${p.id.toString().slice(0, 6)}</span>
                </div>
                ${dateBadge}
            </div>

            <div class="card-main-content" style="display:flex; gap:10px; align-items:center;">
                <div class="card-icon" style="background:#f1f5f9; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">
                    👕
                </div>
                <div style="flex:1;">
                    <div class="card-title" style="font-size:0.95rem; margin:0; line-height:1.2;">${clientName.split(' ')[0]}</div>
                    <div style="font-size:0.8rem; color:#64748b;">${mainItem}</div>
                </div>
            </div>
            
            <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding-top:8px; border-top:1px solid #f1f5f9;">
                <div class="financial-status">
                    ${isPaid
            ? '<i class="ph-bold ph-check-circle" style="color:#10b981;"></i> <span style="color:#10b981; font-size:0.8rem;">Pago</span>'
            : '<i class="ph-bold ph-circle" style="color:#cbd5e1;"></i> <span style="color:#94a3b8; font-size:0.8rem;">Pendente</span>'}
                </div>
                <span class="k-price" style="font-weight:600;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
            </div>
        </div>
    `;
}

// Override the loop in renderProductionBoard to use renderCard helper
// We need to inject renderCard into the map calls in renderProductionBoard and renderInbox if they are hardcoded.
// Actually, let's redefine renderProductionBoard entirely to be safe since I can't effectively partial match the map function easily without risk.

function renderProductionBoard() {
    const board = document.getElementById('board');
    board.className = 'kanban-board';
    board.innerHTML = state.cols.map(col => `
        <div class="column" data-col-id="${col.id}">
            <div class="column-header" style="border-top: 3px solid ${col.color || '#ccc'}">
                <h3>${col.title} <span class="count">${state.protocols.filter(p => p.column_id === col.id).length}</span></h3>
            </div>
            <div class="column-content" id="col-${col.id}" ondrop="drop(event)" ondragover="allowDrop(event)">
                ${state.protocols
            .filter(p => p.column_id === col.id)
            .map(p => renderCard(p))
            .join('')}
            </div>
        </div>
    `).join('');
}

function renderInbox() {
    const board = document.getElementById('board');
    board.className = 'kanban-board inbox-view'; // Add class for styling if needed

    if (state.requests.length === 0) {
        board.innerHTML = `<div style="text-align:center; color:white; width:100%; margin-top:50px;">Nenhum pedido novo no momento.</div>`;
        return;
    }

    board.innerHTML = `
        <div class="column" style="min-width: 600px; margin: 0 auto;">
             <div class="column-header" style="border-top: 3px solid #ef4444;">
                <h3>📥 Entrada (Aguardando Análise) <span class="count">${state.requests.length}</span></h3>
            </div>
            <div class="column-content">
                 ${state.requests.map(p => renderCard(p)).join('')}
            </div>
        </div>
    `;
}
// End of duplicated block cleanup


// End of duplicated block cleanup 2


// --- 5. FILTERS & SEARCH ---

// Search listener moved to DOMContentLoaded


// 3. Logic: Approve & Confirm Logic
window.kanban = {
    switchView: (viewName) => {
        state.currentView = viewName;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`view - ${viewName} `).classList.add('active');
        render();
    },

    // Step 1: Promote Request -> Production (Official Protocol)
    promoteToProtocol: async (requestId) => {
        const result = await Swal.fire({
            title: 'Gerar Protocolo Oficial?',
            text: `Isso transformará o pedido ${requestId} em um Protocolo de Produção(#MV).`,
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
                    Swal.fire('Sucesso!', `Protocolo < b > ${apiRes.data.new_id}</b > criado!`, 'success');
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
            text: `O valor caiu na conta ? O pedido ${requestId} irá para PRODUÇÃO oficial(#MV).`,
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
                    Swal.fire('Produção Iniciada!', `Protocolo < b > ${apiRes.data.new_id}</b > gerado com sucesso.`, 'success');
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
