/**
 * ProtocolDetailView.js
 * The "Dossier" view for Production Orders.
 * Handles: Checklist, Due Date Edit, Priority Edit, Printing.
 * Edit metadata and Items as well.
 */

const ProtocolDetailView = {
    currentProtocol: null,

    open: async (protocolId) => {
        // Tenta achar na lista do Kanban se estiver aberto
        let protocol;
        try {
            if (typeof state !== 'undefined' && state.protocols) {
                protocol = state.protocols.find(p => p.id === protocolId)
                    || (state.requests && state.requests.find(p => p.id === protocolId));
            }
        } catch(e) {}

        // Fallback: Se não encontrou no estado visual (está abrindo do Financeiro), busca no banco
        if (!protocol) {
            try {
                const { data, error } = await window.supabase
                    .from('protocols')
                    .select('*, items:protocol_items(*)')
                    .eq('id', protocolId)
                    .single();
                
                if (error) throw error;
                protocol = data;
            } catch (err) {
                console.error("Erro buscando pedido isolado:", err);
                throw new Error("Não foi possível carregar o pedido do banco de dados.");
            }
        }

        if (!protocol) {
            throw new Error('Pedido não existe no servidor.');
        }

        // Clone deeply so changes to items don't affect state until saved and reloaded
        ProtocolDetailView.currentProtocol = JSON.parse(JSON.stringify(protocol));
        ProtocolDetailView.renderModal(ProtocolDetailView.currentProtocol);
    },

    renderModal: (p) => {
        let modal = document.getElementById('protocol-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'protocol-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }

        // Determine Priority Color
        const priorityColors = {
            'urgent': '#ef4444',
            'high': '#f59e0b',
            'normal': '#3b82f6'
        };
        const pColor = priorityColors[p.priority] || priorityColors.normal;

        // Determine Due Date Styling
        let dueDateVal = '';
        try { if (p.due_date) dueDateVal = new Date(p.due_date).toISOString().split('T')[0]; } catch(e) {}
        
        let createdDateVal = '';
        try { if (p.created_at) createdDateVal = new Date(p.created_at).toISOString().slice(0, 16); } catch(e) {}

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
                        
                        <!-- Dates, Priority & Client Info -->
                        <div class="dossier-section" style="display:flex; flex-direction:column; gap:8px;">
                            <h4 style="margin: 0 0 10px 0; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Dados do Pedido</h4>
                            
                            <label>Data do Pedido</label>
                            <input type="datetime-local" value="${createdDateVal}" onchange="ProtocolDetailView.updateField('created_at', new Date(this.value).toISOString())">
                            
                            <label>Valor Total (R$)</label>
                            <input type="number" step="0.01" value="${p.total_amount || 0}" onchange="ProtocolDetailView.updateField('total_amount', parseFloat(this.value))">

                            <label>Prazo de Entrega</label>
                            <input type="date" value="${dueDateVal}" onchange="ProtocolDetailView.updateField('due_date', this.value)">
                            
                            <label>Prioridade</label>
                            <select onchange="ProtocolDetailView.updateField('priority', this.value)">
                                <option value="normal" ${p.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="high" ${p.priority === 'high' ? 'selected' : ''}>Alta</option>
                                <option value="urgent" ${p.priority === 'urgent' ? 'selected' : ''}>Urgente 🔥</option>
                            </select>

                            <h4 style="margin: 15px 0 10px 0; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Dados do Cliente</h4>
                            
                            <label>Nome do Cliente</label>
                            <input type="text" value="${p.client_name || ''}" onchange="ProtocolDetailView.updateField('client_name', this.value)">

                            <label>Email do Cliente</label>
                            <input type="email" value="${p.client_email || ''}" onchange="ProtocolDetailView.updateField('client_email', this.value)">

                            <label>Telefone do Cliente</label>
                            <input type="text" value="${p.client_phone || ''}" onchange="ProtocolDetailView.updateField('client_phone', this.value)">

                            <h4 style="margin: 15px 0 10px 0; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Observações</h4>
                            <textarea onchange="ProtocolDetailView.updateField('notes', this.value)" rows="3" style="width: 100%; resize: vertical;">${p.notes || ''}</textarea>
                        </div>

                        <!-- Printing Actions -->
                        <div class="dossier-actions" style="margin-top: 15px;">
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
                        <h3 style="display:flex; justify-content:space-between; align-items:center;">
                            <span>🖼️ Projetos e Artes</span>
                        </h3>
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
                        mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Principal', url: p.mockup_url }];
                    }
                } catch (e) { console.error("Erro parse mockup_url", e); }

                if (mockups.length === 0) return '<div style="font-size:0.8rem; color:#94a3b8; text-align:center;">Nenhuma arte anexada ainda.</div>';

                return mockups.map((m, index) => {
                    const isImage = (m && m.url && typeof m.url === 'string') ? m.url.match(/\.(jpeg|jpg|png|gif)$/i) !== null : false;
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
                                                    <i class="ph-bold ph-eye"></i> Ver
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
                        <div class="checklist-grid" style="margin-bottom: 20px;">
                            ${stepsHtml}
                        </div>
                        
                        <h3 style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Itens do Pedido</span>
                            <button onclick="ProtocolDetailView.addNewItem()" style="font-size:0.8rem; padding: 4px 8px; cursor:pointer; background:#3b82f6; color:white; border:none; border-radius: 4px; font-weight: bold;"><i class="ph-bold ph-plus"></i> Adicionar Item</button>
                        </h3>
                        <div class="dossier-items" style="display:flex; flex-direction:column; gap:10px;">
                            ${(p.items || []).map((i, index) => `
                                <div class="d_item" style="border:1px solid #e2e8f0; padding:10px; border-radius:6px; background:#f8fafc; display:flex; flex-direction:column; gap:8px;">
                                    <div style="display:flex; gap:10px; margin-bottom:5px; align-items:center;">
                                        <input type="number" value="${i.qty || i.quantity || 1}" style="width:70px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;" onchange="ProtocolDetailView.updateItem(${index}, 'qty', this.value)" title="Quantidade" min="1">
                                        <input type="text" value="${i.name || i.product_name || ''}" style="flex:1; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;" onchange="ProtocolDetailView.updateItem(${index}, 'name', this.value)" title="Nome do Produto" placeholder="Nome do Produto">
                                        <button onclick="ProtocolDetailView.removeItem(${index})" style="background:#fef2f2; color:#ef4444; border:1px solid #fecaca; padding:6px 10px; border-radius:4px; cursor:pointer;" title="Remover Item"><i class="ph-bold ph-trash"></i></button>
                                    </div>
                                    <div style="display:flex; gap:10px;">
                                        <input type="number" step="0.01" value="${i.price || i.unit_price || 0}" style="width:100px; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;" onchange="ProtocolDetailView.updateItem(${index}, 'price', this.value)" title="Preço Unitário (R$)" min="0">
                                        <input type="text" value="${(i.customization_details && i.customization_details.text) ? i.customization_details.text : (i.customization || '')}" style="flex:1; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="Detalhes (Opcional)" onchange="ProtocolDetailView.updateItem(${index}, 'customization', this.value)" title="Detalhes da Personalização">
                                    </div>
                                </div>
                            `).join('')}
                            ${(p.items && p.items.length > 0) ? `
                                <button onclick="ProtocolDetailView.saveItems()" style="margin-top:5px; width:100%; background:#10b981; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size: 0.95rem;">
                                    <i class="ph-bold ph-floppy-disk"></i> Salvar Alterações nos Itens
                                </button>
                            ` : `<div style="text-align: center; color: #94a3b8; font-size: 0.9rem;">Nenhum item neste pedido.</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContent = document.getElementById('protocol-modal-content');
        if (modalContent) {
            modalContent.innerHTML = content;
        } else {
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

        // Save immediately as before
        const Toast = Swal.mixin({
            toast: true, position: "top-end", showConfirmButton: false, timer: 2000
        });

        try {
            await KanbanService.updateProtocolDetails(p.id, { [field]: value });
            loadData(); // Refresh board quietly
            Toast.fire({ icon: "success", title: "Salvo" });
        } catch (e) {
            console.error(e);
            Toast.fire({ icon: "error", title: "Erro ao salvar" });
        }
    },

    updateItem: (index, field, value) => {
        const p = ProtocolDetailView.currentProtocol;
        if (!p.items[index]) return;

        if (field === 'qty' || field === 'quantity') {
            p.items[index].qty = parseInt(value, 10) || 1;
            p.items[index].quantity = p.items[index].qty;
        } else if (field === 'price' || field === 'unit_price') {
            p.items[index].price = parseFloat(value) || 0;
            p.items[index].unit_price = p.items[index].price;
        } else if (field === 'name' || field === 'product_name') {
            p.items[index].name = value;
            p.items[index].product_name = value;
        } else if (field === 'customization') {
            p.items[index].customization = value;
            if(!p.items[index].customization_details) p.items[index].customization_details = {};
            p.items[index].customization_details.text = value;
        }
    },

    removeItem: (index) => {
        const p = ProtocolDetailView.currentProtocol;
        p.items.splice(index, 1);
        ProtocolDetailView.renderModal(p);
    },

    addNewItem: () => {
        const p = ProtocolDetailView.currentProtocol;
        if (!p.items) p.items = [];
        p.items.push({
            name: 'Novo Item',
            qty: 1,
            price: 0,
            customization: ''
        });
        ProtocolDetailView.renderModal(p);
    },

    saveItems: async () => {
        const p = ProtocolDetailView.currentProtocol;
        
        try {
            Swal.showLoading();
            const res = await KanbanService.saveProtocolItems(p.id, p.items);
            if (!res.success) throw res.error;

            Swal.fire('Sucesso', 'Itens salvos com sucesso!', 'success');
            loadData(); // Reload whole board
        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível salvar os itens no banco de dados.', 'error');
        }
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
                if (!value) return 'Escreva um nome para você não se perder depois!'
            }
        });

        if (!artName) {
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

            const p = ProtocolDetailView.currentProtocol;
            let currentMockups = [];
            try {
                if (p.mockup_url) {
                    currentMockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Antiga', url: p.mockup_url }];
                }
            } catch (e) { }

            currentMockups.push({ name: artName, url: fileUrl });
            const newJsonStr = JSON.stringify(currentMockups);

            p.mockup_url = newJsonStr;
            await KanbanService.updateProtocolDetails(protocolId, { mockup_url: newJsonStr });

            const Toast = Swal.mixin({
                toast: true, position: "top-end", showConfirmButton: false, timer: 3000, timerProgressBar: true
            });
            Toast.fire({ icon: "success", title: "Arte anexada com sucesso!" });

            ProtocolDetailView.renderModal(p);
            loadData(); 

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

            currentMockups.splice(mockupIndex, 1);
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

window.closeProtocolModal = () => {
    const modal = document.getElementById('protocol-modal');
    if (modal) modal.style.display = 'none';
    if(window.ProtocolDetailView) window.ProtocolDetailView.currentProtocol = null;
};
