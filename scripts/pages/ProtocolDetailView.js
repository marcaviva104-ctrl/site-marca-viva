/**
 * ProtocolDetailView.js
 * The "Dossier" view for Production Orders.
 * Handles: Checklist, Due Date Edit, Priority Edit, Printing.
 */

const ProtocolDetailView = {
    currentProtocol: null,

    open: async (protocolId) => {
        // Find protocol data
        // We assume 'state.protocols' or 'state.requests' carries mainly list info.
        // Ideally we fetch fresh details to get the latest checklist/notes
        // But for speed we can start with cache and refresh in background.

        let protocol = state.protocols.find(p => p.id === protocolId)
            || state.requests.find(p => p.id === protocolId);

        if (!protocol) return;

        ProtocolDetailView.currentProtocol = protocol;
        ProtocolDetailView.renderModal(protocol);
    },

    renderModal: (p) => {
        const modal = document.getElementById('protocol-modal');
        if (!modal) return;

        // Determine Priority Color
        const priorityColors = {
            'urgent': '#ef4444',
            'high': '#f59e0b',
            'normal': '#3b82f6'
        };
        const pColor = priorityColors[p.priority] || priorityColors.normal;

        // Determine Due Date Styling
        const dueDateVal = p.due_date ? new Date(p.due_date).toISOString().split('T')[0] : '';

        // Generate Checklist HTML
        const steps = p.production_steps || [
            { name: "Corte", status: "pending" },
            { name: "Costura", status: "pending" },
            { name: "Estampa", status: "pending" },
            { name: "Acabamento", status: "pending" },
            { name: "Expedição", status: "pending" }
        ];

        const stepsHtml = steps.map((step, idx) => `
            <div class="step-item ${step.status === 'done' ? 'step-done' : ''}" onclick="ProtocolDetailView.toggleStep(${idx})">
                <div class="step-checkbox">
                    ${step.status === 'done' ? '<i class="ph-bold ph-check"></i>' : ''}
                </div>
                <span>${step.name}</span>
            </div>
        `).join('');

        const content = `
            <div class="dossier-container">
                <!-- Header -->
                <div class="dossier-header" style="border-left: 5px solid ${pColor}">
                    <div>
                        <div class="dossier-id">
                            ${p.id} 
                            <span class="dossier-badge" style="background:${pColor}20; color:${pColor}">
                                ${p.priority === 'urgent' ? 'URGENTE' : (p.priority === 'high' ? 'ALTA' : 'NORMAL')}
                            </span>
                        </div>
                        <div class="dossier-client">${p.client_name || 'Cliente'}</div>
                    </div>
                    <button class="btn-close" onclick="closeProtocolModal()"><i class="ph-bold ph-x"></i></button>
                </div>

                <div class="dossier-body">
                    <!-- Left Column: Info & Actions -->
                    <div class="dossier-left">
                        
                        <!-- Dates & Priority -->
                        <div class="dossier-section">
                            <label>Prazo de Entrega</label>
                            <input type="date" value="${dueDateVal}" onchange="ProtocolDetailView.updateField('due_date', this.value)">
                            
                            <label style="margin-top:10px;">Prioridade</label>
                            <select onchange="ProtocolDetailView.updateField('priority', this.value)">
                                <option value="normal" ${p.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="high" ${p.priority === 'high' ? 'selected' : ''}>Alta</option>
                                <option value="urgent" ${p.priority === 'urgent' ? 'selected' : ''}>Urgente 🔥</option>
                            </select>
                        </div>

                        <!-- Printing Actions -->
                        <div class="dossier-actions">
                            <button class="btn-action primary" onclick="PrintService.printWallSheet(ProtocolDetailView.currentProtocol)">
                                <i class="ph-bold ph-printer"></i> Imprimir Parede
                            </button>
                            <button class="btn-action secondary" onclick="alert('Gerando Link de Rastreio...')">
                                <i class="ph-bold ph-link"></i> Link Rastreio
                            </button>
                            ${p.client_phone ? `
                            <button class="btn-action whatsapp" onclick="window.open('https://wa.me/${p.client_phone}', '_blank')">
                                <i class="ph-bold ph-whatsapp-logo"></i> WhatsApp
                            </button>` : ''}
                        </div>

                    </div>

                    <!-- Right Column: Checklist & Items -->
                    <div class="dossier-right">
                        <h3>Checklist de Produção</h3>
                        <div class="checklist-grid">
                            ${stepsHtml}
                        </div>

                        <hr>
                        
                        <h3>Itens do Pedido</h3>
                        <div class="dossier-items">
                            ${(p.items || []).map(i => `
                                <div class="d_item">
                                    <strong>${i.quantity}x</strong> ${i.product_name}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Inject into Modal (we assume modal has a container or we replace innerHTML of a specific div)
        // For now, let's assume we replace the whole modal content wrapper
        const modalContent = document.getElementById('protocol-modal-content');
        if (modalContent) {
            modalContent.innerHTML = content;
        } else {
            // Fallback if structure is different
            modal.innerHTML = `<div class="modal-content" id="protocol-modal-content" style="max-width:900px; padding:0;">${content}</div>`;
        }

        modal.style.display = 'flex';
    },

    toggleStep: async (index) => {
        const p = ProtocolDetailView.currentProtocol;
        if (!p.production_steps) {
            p.production_steps = [
                { name: "Corte", status: "pending" },
                { name: "Costura", status: "pending" },
                { name: "Estampa", status: "pending" },
                { name: "Acabamento", status: "pending" },
                { name: "Expedição", status: "pending" }
            ];
        }

        const step = p.production_steps[index];
        step.status = step.status === 'pending' ? 'done' : 'pending';

        // Optimistic Update
        ProtocolDetailView.renderModal(p);

        // Save
        await KanbanService.updateProtocolDetails(p.id, { production_steps: p.production_steps });

        // Refresh global data silently
        loadData(); // from kanban.js
    },

    updateField: async (field, value) => {
        const p = ProtocolDetailView.currentProtocol;
        p[field] = value;

        // Optimistic UI Update (Priority changes color for example)
        ProtocolDetailView.renderModal(p);

        await KanbanService.updateProtocolDetails(p.id, { [field]: value });
        loadData(); // Refresh board
    }
};

window.ProtocolDetailView = ProtocolDetailView;
