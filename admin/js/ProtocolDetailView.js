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
                        <!-- Mockup / Art Section V2 (Múltiplos Arquivos) -->
                        <h3>🖼️ Projetos e Artes (Múltiplos)</h3>
                        <div style="background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0; margin-bottom:20px;">
                            <div style="margin-bottom: 15px;">
                                <label style="display:block; margin-bottom:8px; font-size:0.85rem; font-weight:600; color:#475569;">
                                    Anexar Novo Arquivo / PDF
                                </label>
                                <input type="file" id="mockup-upload-${p.id}" accept=".pdf,.png,.jpg,.jpeg" style="font-size:0.8rem; width:100%; margin-bottom:10px; border:1px solid #cbd5e1; border-radius:6px; padding:6px; background:white;">
                                <button class="btn-action" style="background:#3b82f6; color:white; width:100%; padding:10px; border-radius:6px; font-weight:600; cursor:pointer; border:none;" onclick="ProtocolDetailView.uploadMockup('${p.id}')">
                                    <i class="ph-bold ph-plus"></i> Adicionar Arte
                                </button>
                            </div>
                            
                            <!-- Lista de Artes Salvas -->
                            <div id="mockups-list-container" style="display:flex; flex-direction:column; gap:8px;">
                                ${(() => {
                let mockups = [];
                try {
                    if (p.mockup_url) {
                        // Pode ser array antigo ou novo
                        mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Principal', url: p.mockup_url }];
                    }
                } catch (e) { console.error("Erro parse mockup_url", e); }

                if (mockups.length === 0) return '<div style="font-size:0.8rem; color:#94a3b8; text-align:center;">Nenhuma arte anexada ainda.</div>';

                return mockups.map((m, index) => {
                    const isImage = m.url.match(/\.(jpeg|jpg|png|gif)$/i) !== null;
                    return `
                                        <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1px solid #e2e8f0; padding:8px 10px; border-radius:6px;">
                                            <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
                                                ${isImage ?
                            `<img src="${m.url}" style="width:35px; height:35px; border-radius:4px; object-fit:cover; border:1px solid #e2e8f0; margin-right:10px;" alt="mini">`
                            :
                            `<div style="width:35px; height:35px; border-radius:4px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; border:1px solid #e2e8f0; margin-right:10px; color:#64748b;">
                                                        <i class="ph-bold ph-file-pdf"></i>
                                                    </div>`
                        }
                                                <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; font-size:0.85rem; color:#334155;">
                                                    ${m.name || 'Arte ' + (index + 1)}
                                                </div>
                                            </div>
                                            <div style="display:flex; gap:5px;">
                                                <a href="${m.url}" target="_blank" style="background:#10b981; color:white; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:0.8rem; font-weight:bold; display:flex; align-items:center; gap:6px;" title="Ver/Abrir em Nova Aba">
                                                    <i class="ph-bold ph-eye"></i> Ver Arte
                                                </a>
                                                <button onclick="ProtocolDetailView.removeMockup('${p.id}', ${index})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; padding:6px 10px; border-radius:4px; cursor:pointer;" title="Remover Arte">
                                                    <i class="ph-bold ph-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `}).join('');
            })()}
                            </div>
                        </div>

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
    },

    uploadMockup: async (protocolId) => {
        const input = document.getElementById(`mockup-upload-${protocolId}`);
        if (!input || !input.files || input.files.length === 0) {
            Swal.fire('Atenção', 'Selecione um arquivo (PDF, PNG ou JPG) para enviar primeiro.', 'warning');
            return;
        }

        const file = input.files[0];

        // 1. Perguntar o nome da Arte antes de Enviar
        const { value: artName } = await Swal.fire({
            title: 'Identificar Dossiê',
            text: 'De qual produto é esse arquivo?',
            input: 'text',
            inputPlaceholder: 'Ex: Camiseta Frente, Mochila Costas...',
            showCancelButton: true,
            confirmButtonText: 'Subir Arquivo',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return 'Escreva um nome para você não se perder depois!'
                }
            }
        });

        if (!artName) {
            // Cancelou o upload
            input.value = "";
            return;
        }

        try {
            Swal.showLoading();
            if (!window.StorageManager) {
                throw new Error("StorageManager não inicializado.");
            }

            // Upload via StorageManager (bucket products, folder order_mockups)
            const stamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8); // Generate a short random string
            const safeFileName = `${protocolId}_${stamp}_${randomString}`;
            const fileUrl = await window.StorageManager.uploadFile(file, `order_mockups/${safeFileName}`, 'products');

            if (!fileUrl) throw new Error("Falha ao gerar URL do arquivo.");

            // Get Current Mockups Array
            const p = ProtocolDetailView.currentProtocol;
            let currentMockups = [];
            try {
                if (p.mockup_url) {
                    currentMockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Antiga', url: p.mockup_url }];
                }
            } catch (e) { }

            // Append New Mockup Object
            currentMockups.push({ name: artName, url: fileUrl });

            const newJsonStr = JSON.stringify(currentMockups);

            // Update local object and Database
            p.mockup_url = newJsonStr;
            await KanbanService.updateProtocolDetails(protocolId, { mockup_url: newJsonStr });

            // Sucesso Silencioso
            const Toast = Swal.mixin({
                toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true
            });
            Toast.fire({ icon: "success", title: "Arte anexada com sucesso!" });

            // Refresh UI
            ProtocolDetailView.renderModal(p);
            loadData(); // Resync global kanban silently

        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Não foi possível fazer o upload da arte: ' + error.message, 'error');
        }
    },

    removeMockup: async (protocolId, mockupIndex) => {
        const p = ProtocolDetailView.currentProtocol;
        let currentMockups = [];
        try {
            if (p.mockup_url) {
                currentMockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Antiga', url: p.mockup_url }];
            }
        } catch (e) { }

        const arteAlvo = currentMockups[mockupIndex];
        if (!arteAlvo) return;

        const { isConfirmed } = await Swal.fire({
            title: 'Remover Arte?',
            html: `A arte <strong>"${arteAlvo.name}"</strong> será desvinculada deste pedido permanentemente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Sim, deletar'
        });

        if (!isConfirmed) return;

        try {
            Swal.showLoading();

            // Remove specific index
            currentMockups.splice(mockupIndex, 1);

            // Parse to string if > 0, else null
            const newJsonStr = currentMockups.length > 0 ? JSON.stringify(currentMockups) : null;

            p.mockup_url = newJsonStr;
            await KanbanService.updateProtocolDetails(protocolId, { mockup_url: newJsonStr });

            ProtocolDetailView.renderModal(p);
            loadData();
            Swal.close();
        } catch (error) {
            console.error(error);
            Swal.fire('Erro', 'Falha ao remover a arte.', 'error');
        }
    }
};

window.ProtocolDetailView = ProtocolDetailView;
