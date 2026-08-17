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
    currentView: 'production', // 'production' or 'inbox'
    employeesById: {}, // uuid -> { full_name, email } — para o badge de responsável
    myOnly: false // filtro "meus pedidos" (só o que está com assigned_to = eu)
};

// Funcionários (admin/employee) para o seletor e o badge de responsável no card.
// profiles é pequena o bastante para trazer inteira e cachear em memória.
async function fetchEmployees() {
    try {
        const { data, error } = await window.supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('role', ['admin', 'employee']);
        if (error) throw error;
        const byId = {};
        (data || []).forEach(e => { byId[e.id] = e; });
        return byId;
    } catch (e) {
        console.warn('Kanban: falha ao buscar funcionários.', e);
        return {};
    }
}

window.toggleMyOrdersOnly = function (checked) {
    state.myOnly = !!checked;
    render();
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

    const searchInput = document.getElementById('kanban-search') || document.getElementById('orders-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.kanban-card');

            cards.forEach(card => {
                const textContent = card.innerText.toLowerCase();

                // ID search: some cards format ID with '#' some without, adding safety
                const cardId = card.id ? card.id.toLowerCase() : '';

                if (textContent.includes(term) || cardId.includes(term)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // EXPOSE TO GLOBAL EVENTS (Crucial for admin.js communication)
    window.addEventListener('kanban-refresh', async () => {
        console.log('Kanban UI: Refresh triggered');
        await loadData();
    });

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
        const [cols, allProtocols, employeesById] = await Promise.all([
            KanbanService.getColumns(),
            KanbanService.getProtocols(),
            fetchEmployees()
        ]);

        state.cols = cols;
        state.employeesById = employeesById;

        const isFabrica = window.location.pathname.includes('fabrica');

        if (isFabrica) {
            // FACTORY VIEW: only show protocols authorized by admin
            const authorized = allProtocols.filter(p => p.approved_for_production === true);
            state.requests = [];
            state.protocols = authorized;
        } else {
            // ADMIN VIEW: show everything as before
            state.requests = allProtocols.filter(p => p.column_id === 0 || p.status === 'inquiry');
            state.protocols = allProtocols.filter(p => p.column_id > 0 && p.status !== 'inquiry');
        }

        render();
        updateInboxCount();

        // Update factory stats bar (only runs if in fabrica.html context)
        if (typeof window.fabUpdateStats === 'function') {
            window.fabUpdateStats(allProtocols.filter(p => p.approved_for_production === true));
        }

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
    // Always use ProtocolsManager.viewDetails â€” it fetches fresh from DB and shows a Swal modal
    if (window.adminApp && window.adminApp.viewProtocolDetails) {
        window.adminApp.viewProtocolDetails(protocolId);
    } else if (window.ProtocolsManager && window.ProtocolsManager.viewDetails) {
        window.ProtocolsManager.viewDetails(protocolId);
    } else {
        // Fallback: dossier panel if modal element exists
        if (window.ProtocolDetailView && document.getElementById('protocol-modal')) {
            window.ProtocolDetailView.open(protocolId);
        } else {
            Swal.fire('Aguardando...', 'O módulo de detalhes ainda está carregando. Tente novamente em 1 segundo.', 'info');
        }
    }
};

window.openKanbanEmployeeModal = async function (protocolId) {
    try {
        Swal.fire({ title: 'Carregando pedido...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const { data: p, error } = await window.supabase
            .from('protocols')
            .select('*, protocol_items (*)')
            .eq('id', protocolId)
            .single();

        if (error) throw error;

        let items = p.protocol_items || [];
        if (items.length === 0 && p.items) {
            try { items = typeof p.items === 'string' ? JSON.parse(p.items) : p.items; } catch (e) { items = []; }
        }

        // Items grid â€” big quantities easy to read from afar
        let itemsHtml = '<div style="color:#94a3b8; text-align:center; padding:20px;">Nenhum item listado</div>';
        if (items.length > 0) {
            itemsHtml = `<div style="display:grid; gap:10px;">` + items.map(item => {
                let details = '';
                if (item.configuration) {
                    details = item.configuration.printMode === 'color' ? 'ðŸŽ¨ Colorido' : 'â¬› Preto e Branco';
                    if (item.configuration.stdPages) details += ` | ${item.configuration.stdPages}p comuns + ${item.configuration.heavyPages}p pesadas`;
                } else if (item.customization_details || item.customization) {
                    let c = item.customization_details || item.customization;
                    if (typeof c === 'string') { try { c = JSON.parse(c); } catch (e) { } }
                    if (typeof c === 'object' && c) details = c.text || c.customization || '';
                }
                return `<div style="background:#f1f5f9; padding:12px 14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; border-left:4px solid #3b82f6;">
                    <div>
                        <div style="font-weight:700; color:#1e293b; font-size:1rem;">${item.product_name || item.name || 'Item'}</div>
                        ${details ? `<div style="font-size:0.8rem; color:#64748b; margin-top:2px;">${details}</div>` : ''}
                    </div>
                    <div style="background:#3b82f6; color:white; font-weight:900; padding:6px 16px; border-radius:20px; font-size:1.4rem; min-width:50px; text-align:center;">
                        ${item.quantity || item.qty || '?'}
                    </div>
                </div>`;
            }).join('') + `</div>`;
        }

        // Mockup gallery â€” large images, click to open fullscreen
        let mockupsHtml = `<div style="background:#fffbeb; border:1px dashed #fcd34d; border-radius:10px; padding:16px; text-align:center; color:#d97706;">
            <i class="ph-bold ph-image" style="font-size:2rem; display:block; margin-bottom:6px;"></i>
            <strong>Nenhuma arte anexada</strong><br>
            <span style="font-size:0.85rem;">Confira com o responsável pelo pedido</span>
        </div>`;

        try {
            if (p.mockup_url) {
                let mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Principal', url: p.mockup_url }];
                mockupsHtml = mockups.map((m, idx) => {
                    const isImage = /\.(jpeg|jpg|png|gif|webp)$/i.test(m.url);
                    if (isImage) {
                        return `<a href="${m.url}" target="_blank" title="Clique para ampliar"
                            style="display:block; margin-bottom:12px; border-radius:12px; overflow:hidden; border:2px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.1); transition:0.2s;">
                            <img src="${m.url}" style="width:100%; height:auto; display:block; max-height:400px; object-fit:contain; background:#f8fafc;" alt="${m.name || 'Arte'}">
                            <div style="padding:8px 12px; background:#f8fafc; font-size:0.8rem; color:#64748b; font-weight:600;">ðŸ–¼ ${m.name || `Arte ${idx + 1}`} â€” Clique para abrir</div>
                        </a>`;
                    } else {
                        return `<a href="${m.url}" target="_blank"
                            style="display:flex; align-items:center; gap:12px; padding:16px; background:#eff6ff; color:#3b82f6; text-decoration:none; font-weight:700; border-radius:12px; margin-bottom:10px; border:2px solid #bfdbfe; font-size:1rem;">
                            <i class="ph-bold ph-file-pdf" style="font-size:2rem;"></i>
                            <div>
                                <div>${m.name || 'Arquivo'}</div>
                                <div style="font-size:0.8rem; font-weight:400; color:#60a5fa;">Clique para abrir o PDF</div>
                            </div>
                        </a>`;
                    }
                }).join('');
            }
        } catch (e) { }

        const displayId = protocolId.startsWith('#') ? protocolId.slice(0, 9) : '#' + protocolId.slice(0, 8);

        Swal.fire({
            title: `<span style="font-size:1rem; color:#475569; font-weight:500;">Pedido ${displayId}</span><br><strong style="font-size:1.6rem; color:#1e293b;">${(p.client_name || 'Cliente').split(' ')[0]}</strong>`,
            html: `
                <div style="text-align:left;">
                    <h4 style="margin:16px 0 10px; color:#475569; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #f1f5f9; padding-bottom:6px;">ðŸ“¦ O que Produzir</h4>
                    ${itemsHtml}

                    <h4 style="margin:20px 0 10px; color:#475569; font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; border-bottom:2px solid #f1f5f9; padding-bottom:6px;">ðŸŽ¨ Arte / Mockup</h4>
                    ${mockupsHtml}
                </div>
            `,
            width: 640,
            showDenyButton: true,
            denyButtonText: 'ðŸ–¨ï¸ Imprimir Ficha',
            denyButtonColor: '#475569',
            confirmButtonText: '<i class="ph-bold ph-check"></i> Fechar',
            confirmButtonColor: '#3b82f6',
            customClass: { popup: 'employee-kanban-modal' }
        }).then(result => {
            if (result.isDenied) {
                window.printOrder(protocolId, p, items);
            }
        });

    } catch (err) {
        console.error('Erro ao abrir card do funcionário:', err);
        Swal.fire('Erro', 'Não foi possível carregar os detalhes.', 'error');
    }
};

window.closeProtocolModal = function () {
    const modal = document.getElementById('protocol-modal');
    if (modal) {
        modal.classList.remove('open');
        modal.style.removeProperty('display');
    }
};

/**
 * Generates a printable production order sheet.
 * @param {string} protocolId
 * @param {object} p - full protocol object
 * @param {array} items - pre-parsed items array
 */
window.printOrder = function (protocolId, p, items) {
    const displayId = protocolId.startsWith('#') ? protocolId.slice(0, 9) : '#MV-' + protocolId.slice(0, 6);
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const phone = (p.client_phone || p.phone || '').replace(/\D/g, '');
    const phoneDisplay = phone ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}` : 'Não informado';

    const itemsRows = (items || []).map((item, i) => {
        let extra = '';
        if (item.configuration) {
            extra = item.configuration.printMode === 'color' ? 'Colorido' : 'Preto e Branco';
            if (item.configuration.stdPages) extra += ` | ${item.configuration.stdPages} páginas comuns, ${item.configuration.heavyPages} páginas pesadas`;
        } else if (item.customization_details || item.customization) {
            let c = item.customization_details || item.customization;
            if (typeof c === 'string') { try { c = JSON.parse(c); } catch (e) { } }
            if (typeof c === 'object' && c) extra = c.text || c.customization || '';
        }
        return `<tr style="border-bottom:1px solid #ccc;">
            <td style="padding:8px 4px; font-size:1.1rem; font-weight:700;">${i + 1}.</td>
            <td style="padding:8px 4px; font-size:1.1rem;">${item.product_name || item.name || 'Item'}</td>
            <td style="padding:8px 4px; font-size:1.4rem; font-weight:900; text-align:center;">${item.quantity || item.qty}</td>
            <td style="padding:8px 4px; font-size:0.9rem; color:#444;">${extra}</td>
        </tr>`;
    }).join('');

    // Mockup links
    let mockupLinks = '<p style="color:#888;">Nenhuma arte anexada.</p>';
    try {
        if (p.mockup_url) {
            let mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte', url: p.mockup_url }];
            mockupLinks = mockups.map((m, i) =>
                `<p style="margin:4px 0;"><strong>${i + 1}. ${m.name || 'Arte'}:</strong> ${m.url}</p>`
            ).join('');
        }
    } catch (e) { }

    const printContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Ordem de Produção ${displayId}</title>
        <style>
            @page { margin: 15mm; }
            * { font-family: 'Segoe UI', Arial, sans-serif; }
            body { color: #000; background: #fff; }
            .header { border-bottom: 4px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
            .order-num { font-size: 3rem; font-weight: 900; letter-spacing: -2px; }
            .client-info { margin-bottom: 20px; font-size: 1rem; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th { background: #000; color: #fff; padding: 8px; text-align: left; font-size: 0.85rem; text-transform: uppercase; }
            .checklist { border: 2px solid #000; padding: 15px; margin-top: 20px; }
            .check-item { display: flex; align-items: center; margin: 10px 0; font-size: 1.1rem; font-weight: 600; }
            .box { width: 22px; height: 22px; border: 2px solid #000; display:inline-block; margin-right: 12px; flex-shrink: 0; }
            .footer { margin-top: 30px; border-top: 1px dashed #000; padding-top: 10px; font-size: 0.8rem; color: #666; }
            @media print { body { -webkit-print-color-adjust: exact; } }
        </style>
    </head>
    <body>
        <div class="header">
            <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                <div>
                    <div class="order-num">${displayId}</div>
                    <div style="font-size:1.5rem; font-weight:700;">${p.client_name}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:0.85rem; color:#555;">Emitido em: ${now}</div>
                    <div style="font-size:2rem;">MARCA VIVA</div>
                </div>
            </div>
        </div>
        
        <div class="client-info">
            <strong>Telefone:</strong> ${phoneDisplay} &nbsp;&nbsp;
            <strong>E-mail:</strong> ${p.client_email || 'Não informado'}
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width:30px;">#</th>
                    <th>Item / Produto</th>
                    <th style="width:80px; text-align:center;">Qtd</th>
                    <th>Especificações</th>
                </tr>
            </thead>
            <tbody>${itemsRows || '<tr><td colspan="4" style="padding:10px; color:#888;">Sem itens</td></tr>'}</tbody>
        </table>
        
        <div style="margin-bottom:15px;">
            <strong>Links das Artes (para baixar / ver no computador):</strong><br>
            ${mockupLinks}
        </div>
        
        <div class="checklist">
            <div style="font-size:0.8rem; font-weight:700; text-transform:uppercase; margin-bottom:8px;">Checklist de Produção</div>
            <div class="check-item"><span class="box"></span> Impresso / Produzido</div>
            <div class="check-item"><span class="box"></span> Refilado / Montado / Acabamento</div>
            <div class="check-item"><span class="box"></span> Embalado e Pronto para Retirada</div>
            <div class="check-item"><span class="box"></span> Kanban atualizado para &ldquo;Pronto&rdquo;</div>
        </div>
        
        <div class="footer">
            Marca Viva &mdash; Ficha de Produção Interna &mdash; Não mostrar ao cliente.
        </div>
    </body>
    </html>`;

    const win = window.open('', '_blank');
    win.document.open();
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
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
    const isPaid = p.payment_status === 'paid_full' || p.payment_status === 'paid';

    // Priority Logic
    let borderClass = '';
    let priorityIcon = '';
    if (p.priority === 'urgent') {
        borderClass = 'border-urgent'; // Red Border
        priorityIcon = '<span title="Urgente" style="color:#ef4444;">ðŸ”¥</span>';
    } else if (p.priority === 'high') {
        borderClass = 'border-high'; // Orange Border
        priorityIcon = '<span title="Alta Prioridade" style="color:#f59e0b;">âš¡</span>';
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

        dateBadge = `<span style="background:${dueColor}20; color:${dueColor}; font-size:0.75rem; padding:2px 6px; border-radius:4px; font-weight:bold;">ðŸ•’ ${dueText}</span>`;
    }

    // 🚀 NOVO: Lógica de Recuperação de Vendas (Coluna 3 - Análise Comercial)
    let recoveryAction = '';
    if (p.column_id === 3 && !isPaid) {
        // Force an alert border
        borderClass = 'border-urgent';

        // Add a pulsing animation to the priority icon area to draw attention
        if (!priorityIcon) {
            priorityIcon = '<span title="Análise Comercial" style="color:#ef4444; animation: pulse 2s infinite;">⚠️</span>';
        }

        // WhatsApp Recovery Button
        const phoneMessage = encodeURIComponent(`Olá ${clientName.split(' ')[0]}, vi que você tentou fazer um pedido conosco (Pedido #${p.id.toString().slice(0, 6)}), mas o pagamento ainda não foi confirmado. Posso ajudar com alguma dúvida?`);
        // We assume we might not have the phone easily accessible directly from raw_user_meta_data if not saved there, 
        // but we can put a generic link that the admin can use if they know the number, or open a prompt.
        // For standard B2B, admin usually has the contact. Let's make it a button that stops propagation to avoid opening the modal immediately.
        const phoneNum = meta.phone ? meta.phone.replace(/[^0-9]/g, '') : ((window.WhatsAppConfig && WhatsAppConfig.phone) || '5531987398136'); // Fallback to store number if client phone is missing, or admin can type it

        recoveryAction = `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ef444450; text-align: center;">
                <button onclick="event.stopPropagation(); window.open('https://wa.me/${phoneNum}?text=${phoneMessage}', '_blank')" 
                        style="background: #ef444415; color: #ef4444; border: 1px solid #ef444450; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; transition: 0.2s;">
                    <i class="ph-bold ph-whatsapp-logo"></i> Chamar no WhatsApp
                </button>
            </div>
        `;
    }

    // Image Preview (First item)
    // Assuming we might have an image url in the product item later, currently just placeholder icon if no image
    // For now, let's use a generic 'Shirt' icon or the product name
    const mainItem = p.items && p.items[0] ? p.items[0].product_name : 'Pedido Personalizado';

    // Tratar o ID para não repetir hash
    let displayId = p.id.toString();
    if (!displayId.startsWith('#')) displayId = '#' + displayId;

    // Use phosphor icon based on main item name heuristically
    let pIcon = 'ph-t-shirt';
    const mItem = mainItem.toLowerCase();
    if (mItem.includes('caneca') || mItem.includes('copo')) pIcon = 'ph-coffee';
    if (mItem.includes('crachá')) pIcon = 'ph-identification-card';
    if (mItem.includes('adesivo') || mItem.includes('rótulo')) pIcon = 'ph-sticker';
    if (mItem.includes('banner') || mItem.includes('lona')) pIcon = 'ph-presentation-chart';
    if (mItem.includes('cartão')) pIcon = 'ph-address-book';
    if (mItem.includes('folder') || mItem.includes('panfleto')) pIcon = 'ph-book-open';

    // Responsável pelo pedido (assigned_to) — bolinha com iniciais, se atribuído.
    let assigneeBadge = '';
    const assignee = p.assigned_to ? state.employeesById[p.assigned_to] : null;
    if (assignee) {
        const label = assignee.full_name || assignee.email || '?';
        const initials = label.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
        assigneeBadge = `<span title="Responsável: ${label}" style="width:22px; height:22px; border-radius:50%; background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; font-size:0.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${initials}</span>`;
    }

    // Detect if factory mode (fabrica.html)
    const isFabricaPage = window.location.pathname.includes('fabrica');
    const userRole = isFabricaPage ? 'employee' : (window.authService?.user?.role || 'admin');
    const clickAction = userRole === 'employee' ? `openKanbanEmployeeModal('${p.id}')` : `openProtocolModal('${p.id}')`;

    // Factory: show timer if production has started
    const isInProduction = !!p.production_start_time && !p.production_end_time;
    let timerHtml = '';
    if (isFabricaPage && isInProduction) {
        const startMs = new Date(p.production_start_time).getTime();
        const elapsed = Math.floor((Date.now() - startMs) / 60000);
        const stagnant = elapsed > 240;
        timerHtml = `<div class="card-timer ${stagnant ? '' : 'pulsing'}">
            <i class="ph-bold ph-timer"></i> ${elapsed} min em produção
            ${stagnant ? '<span class="stagnant-badge">⚠️ Parado!</span>' : ''}
        </div>`;
    }

    // Factory: action buttons
    let actionsHtml = '';
    if (isFabricaPage && p.column_id !== 5) { // Not already done
        const hasStarted = !!p.production_start_time && !p.production_end_time;
        if (!hasStarted) {
            actionsHtml = `<div class="card-actions">
                <button class="card-action-btn start" onclick="fabStartTimer(event,'${p.id}')">â–¶ï¸ Iniciar</button>
                <button class="card-action-btn problem" onclick="fabReportProblem(event,'${p.id}')">⚠️</button>
            </div>`;
        } else {
            actionsHtml = `<div class="card-actions">
                <button class="card-action-btn pause" onclick="fabPauseTimer(event,'${p.id}')">â¸ï¸</button>
                <button class="card-action-btn done" onclick="fabConclude(event,'${p.id}')">âœ… Concluir</button>
                <button class="card-action-btn problem" onclick="fabReportProblem(event,'${p.id}')">⚠️</button>
            </div>`;
        }
    }

    return `
        <div class="kanban-card ${borderClass} ${isInProduction ? 'in-production' : ''}" id="${p.id}" onclick="${clickAction}">
            <div class="card-header-smart" style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <div class="card-tags" style="gap:4px; display:flex; align-items:center;">
                   ${priorityIcon}
                   <span class="tag tag-id" style="font-weight:600; padding:2px 6px; background:#f1f5f9; border-radius:4px; font-size:0.75rem; color:#475569;">${displayId.slice(0, 10)}</span>
                </div>
                ${dateBadge}
            </div>

            <div class="card-main-content" style="display:flex; gap:10px; align-items:center;">
                <div class="card-icon" style="background:linear-gradient(135deg, #f8fafc, #f1f5f9); border:1px solid #e2e8f0; width:40px; height:40px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; color:#64748b; box-shadow:inset 0 2px 4px rgba(255,255,255,0.5);">
                    <i class="ph-duotone ${pIcon}"></i>
                </div>
                <div style="flex:1; overflow:hidden;">
                    <div class="card-title" style="font-size:0.95rem; font-weight:700; color:#1e293b; margin:0; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${clientName.split(' ')[0]}</div>
                    <div style="font-size:0.8rem; color:#64748b; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${mainItem}</div>
                </div>
                ${assigneeBadge}
            </div>
            
            <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; padding-top:10px; border-top:1px dashed #e2e8f0; white-space:nowrap;">
                <div class="financial-status" style="white-space:nowrap; display:flex; align-items:center; gap:4px;">
                    ${isPaid
            ? '<i class="ph-fill ph-check-circle" style="color:#10b981; font-size:1.1rem;"></i> <span style="color:#10b981; font-weight:600; font-size:0.8rem;">Pago</span>'
            : '<i class="ph-fill ph-clock" style="color:#94a3b8; font-size:1.1rem;"></i> <span style="color:#94a3b8; font-weight:600; font-size:0.8rem;">Pendente</span>'}
                </div>
                <span class="k-price" style="font-weight:800; color:#3b82f6; white-space:nowrap; letter-spacing:-0.5px;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
            </div>
            ${timerHtml}
            ${actionsHtml}
            ${(() => {
            // Admin-only: Enviar para Fábrica button
            if (isFabricaPage) return '';
            const isApproved = p.approved_for_production === true;
            const hasMockup = !!p.mockup_url;

            if (isApproved) {
                return `<div style="margin-top:8px; padding:5px 8px; background:#d1fae5; border:1px solid #6ee7b7; border-radius:6px; font-size:0.72rem; font-weight:700; color:#059669; display:flex; align-items:center; gap:4px;">
                        <i class="ph-fill ph-factory"></i> Enviado para Fábrica
                    </div>`;
            } else {
                // Always allow sending, but warn if no mockup
                const btnStyle = hasMockup
                    ? 'background:#eff6ff; color:#3b82f6; border:1px solid #93c5fd;'
                    : 'background:#fffbeb; color:#d97706; border:1px solid #fcd34d;';
                const label = hasMockup ? '🏭 Enviar para Fábrica' : '⚠️ Enviar sem Arte';
                return `<div style="margin-top:8px;">
                        <button onclick="event.stopPropagation(); sendToFactory('${p.id}', ${hasMockup})"
                            style="${btnStyle} padding:5px 8px; border-radius:6px; font-size:0.72rem; font-weight:700; width:100%; display:flex; align-items:center; justify-content:center; gap:4px; transition:0.2s; cursor:pointer;">
                            <i class="ph-bold ph-factory"></i> ${label}
                        </button>
                    </div>`;
            }
        })()}
            ${recoveryAction}
        </div>
    `;
}

// Admin: Authorize protocol for production
window.sendToFactory = async function (protocolId, hasMockup = true) {
    const confirmText = hasMockup
        ? 'O pedido aparecerá no painel do funcionário para produção.'
        : '⚠️ Este pedido não tem arte/mockup anexado. O funcionário não terá referência visual. Deseja enviar mesmo assim?';
    const confirmIcon = hasMockup ? 'question' : 'warning';

    const result = await Swal.fire({
        title: '🏭 Enviar para a Fábrica?',
        text: confirmText,
        icon: confirmIcon,
        showCancelButton: true,
        confirmButtonText: hasMockup ? 'Sim, Enviar!' : 'Enviar mesmo assim',
        confirmButtonColor: hasMockup ? '#3b82f6' : '#f59e0b',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        Swal.fire({ title: 'Enviando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        if (window.supabase && typeof window.supabase.from === 'function') {
            const { error } = await window.supabase
                .from('protocols')
                .update({ approved_for_production: true })
                .eq('id', protocolId);
            if (error) throw error;
        }

        await Swal.fire({
            icon: 'success', title: 'âœ… Enviado!',
            text: 'O pedido agora está disponível no Painel da Fábrica.',
            timer: 2000, showConfirmButton: false
        });

        loadData();
    } catch (err) {
        Swal.fire('Erro', err.message, 'error');
    }
};

// Override the loop in renderProductionBoard to use renderCard helper
// We need to inject renderCard into the map calls in renderProductionBoard and renderInbox if they are hardcoded.
// Actually, let's redefine renderProductionBoard entirely to be safe since I can't effectively partial match the map function easily without risk.

function renderProductionBoard() {
    const board = document.getElementById('board');
    board.className = 'kanban-board';

    const isFabrica = window.location.pathname.includes('fabrica');
    // In factory, only show columns relevant to production (hide Lead, Arte, Pagamento)
    // These are typically columns with id >= 3 or titled with production keywords.
    // We use a title-based heuristic so it works regardless of column IDs.
    const HIDDEN_IN_FACTORY = ['entrada', 'lead', 'criação de arte', 'arte', 'Análise Comercial', 'pagamento'];
    const visibleCols = isFabrica
        ? state.cols.filter(col => !HIDDEN_IN_FACTORY.some(h => col.title.toLowerCase().includes(h)))
        : state.cols;

    const meId = window.authService?.user?.id || null;
    const visibleProtocols = state.myOnly && meId
        ? state.protocols.filter(p => p.assigned_to === meId)
        : state.protocols;

    board.innerHTML = visibleCols.map(col => `
        <div class="column" data-col-id="${col.id}">
            <div class="column-header" style="border-top: 3px solid ${col.color || '#ccc'}">
                <h3>${col.title} <span class="count">${visibleProtocols.filter(p => p.column_id === col.id).length}</span></h3>
            </div>
            <div class="column-content" id="col-${col.id}">
                ${visibleProtocols
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
        board.innerHTML = `<div style="text-align:center; color:#94a3b8; width:100%; margin-top:50px;">Nenhum pedido novo no momento.</div>`;
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
    loadData: loadData,
    render: render,
    switchView: (viewName) => {
        state.currentView = viewName;
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`view-${viewName}`) || document.querySelector(`.view-btn[data-view="${viewName}"]`);
        if (btn) btn.classList.add('active');
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
        let req;
        try {
            req = state.protocols.find(p => p.id === requestId) || state.requests.find(p => p.id === requestId);
        } catch(e) {}

        if (req) {
            let warnings = [];
            if (!req.mockup_url || req.mockup_url === '[]') warnings.push('Nenhuma Arte foi anexada ao pedido.');
            if (!req.total_amount || parseFloat(req.total_amount) <= 0) warnings.push('O Valor Final (com frete) não foi ajustado e está zerado.');
            
            if (warnings.length > 0) {
                const proceed = await Swal.fire({
                    title: 'Atenção às Pendências',
                    html: 'Para fazer o orçamento B2B correto, você precisa clicar no card e atualizar:<br><br><ul style="text-align:left; color:#ef4444; font-weight:bold; font-size:0.9rem;">' + warnings.map(w => '<li>'+w+'</li>').join('') + '</ul>',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Aprovar Defeituoso mesmo assim',
                    confirmButtonColor: '#ef4444',
                    cancelButtonText: 'Voltar para Ajustar no Card'
                });
                if (!proceed.isConfirmed) {
                    if(window.ProtocolDetailView) window.ProtocolDetailView.open(requestId);
                    return;
                }
            }
        }
        const result = await Swal.fire({
            title: 'Aprovar Arte?',
            text: `O pedido ${requestId} irá para "Análise Comercial".`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sim, Aprovar',
            confirmButtonColor: '#2563eb'
        });

        if (result.isConfirmed) {
            try {
                const apiRes = await KanbanService.approveRequest(requestId);
                if (apiRes.success) {
                    Swal.fire('Aprovado!', 'Análise Comercial do cliente.', 'success');
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
            text: `O valor caiu na conta — o pedido ${requestId} irá para PRODUÇÃO oficial(#MV).`,
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
                title: 'ðŸ”” Novo Pedido Recebido!',
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

    // Add CSS animation for spinner and scoped Kanban styles safely
    if (!document.getElementById('kanban-styles')) {
        const style = document.createElement('style');
        style.id = 'kanban-styles';
        style.textContent = `
    @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
    }
    @keyframes pulse {
        0 % { opacity: 1; transform: scale(1); }
        50 % { opacity: 0.5; transform: scale(1.2); }
        100 % { opacity: 1; transform: scale(1); }
    }
    #kanban - view.kanban - board {
        display: flex; gap: 20px; overflow - x: auto; padding: 10px 5px 30px 5px; min - height: 60vh; align - items: flex - start;
    }
    #kanban - view.column {
        min - width: 320px; max - width: 320px; background: #f8fafc; border - radius: 12px;
        box - shadow: 0 4px 6px - 1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; display: flex; flex - direction: column; max - height: calc(100vh - 180px);
    }
    #kanban - view.column - header {
        padding: 16px; background: white; border - radius: 12px 12px 0 0; display: flex; justify - content: space - between; align - items: center; border - bottom: 1px solid #e2e8f0;
    }
    #kanban - view.column - header h3 {
        margin: 0; font - size: 0.95rem; font - weight: 700; color: #1e293b; display: flex; align - items: center; gap: 8px; text - transform: uppercase; letter - spacing: 0.5px;
    }
    #kanban - view.column - header.count {
        background: #e2e8f0; color: #475569; padding: 2px 8px; border - radius: 12px; font - size: 0.75rem; font - weight: 800;
    }
    #kanban - view.column - content {
        padding: 12px; gap: 12px; display: flex; flex - direction: column; overflow - y: auto; flex: 1; min - height: 150px;
    }
    #kanban - view.kanban - card {
        background: white; border - radius: 10px; padding: 14px; box - shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        border: 1px solid #e2e8f0; cursor: grab; transition: all 0.2s cubic - bezier(0.4, 0, 0.2, 1);
        position: relative; overflow: hidden;
    }
    #kanban - view.kanban - card::before {
        content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #cbd5e1; border - radius: 10px 0 0 10px; transition: 0.2s;
    }
    #kanban - view.kanban - card.border - urgent::before { background: #ef4444; }
    #kanban - view.kanban - card.border - high::before { background: #f59e0b; }
    #kanban - view.kanban - card:hover {
        transform: translateY(-2px); box - shadow: 0 10px 15px - 3px rgba(0, 0, 0, 0.08); border - color: #cbd5e1;
    }
    #kanban - view.kanban - card:active { cursor: grabbing; transform: translateY(0); }
    #kanban - view.sortable - ghost { opacity: 0.4; background: #e0e7ff; border: 2px dashed #818cf8; }
    #kanban - view.sortable - drag { cursor: grabbing!important; box - shadow: 0 20px 25px - 5px rgba(0, 0, 0, 0.15)!important; }
    `;
        document.head.appendChild(style);
    }

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
                    Swal.fire({
                        title: 'Salvando...',
                        allowEscapeKey: false,
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading()
                    });

                    try {
                        const moveRes = await KanbanService.moveCard(cardId, parseInt(newColId));
                        if (moveRes && moveRes.success === false) {
                            throw new Error(moveRes.error.message);
                        }

                        // Close loading and show very quick non-intrusive toast
                        Swal.close();
                        const Toast = Swal.mixin({
                            toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1500
                        });
                        Toast.fire({ icon: 'success', title: 'Movido!' });
                    } catch (err) {
                        Swal.fire('Erro!', 'Falha ao mover: ' + err.message, 'error');
                        // Re-render to revert position on failure
                        loadData();
                    }
                }
            }
        });
    });
}


// --- Auto-open Modal Feature ---
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const openProtocol = urlParams.get('open');
    if (openProtocol) {
        setTimeout(() => {
            if(window.ProtocolDetailView) window.ProtocolDetailView.open(openProtocol);
        }, 1500);
    }
});
