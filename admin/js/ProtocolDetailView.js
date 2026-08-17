/**
 * ProtocolDetailView.js
 * The "Dossier" view for Production Orders.
 * Handles: Checklist, Due Date Edit, Priority Edit, Printing.
 * Edit metadata and Items as well.
 */

function refreshKanbanIfOpen() {
    if (typeof loadData === 'function') {
        try {
            loadData();
        } catch (err) {
            console.warn('Kanban refresh ignorado:', err);
        }
    }
}

const ProtocolDetailView = {
    currentProtocol: null,
    _employeesCache: null,

    // Funcionários (admin/employee) para o seletor de responsável — busca uma
    // vez por sessão do painel e reaproveita nas próximas aberturas.
    async getEmployees() {
        if (ProtocolDetailView._employeesCache) return ProtocolDetailView._employeesCache;
        try {
            const { data, error } = await window.supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('role', ['admin', 'employee'])
                .order('full_name', { ascending: true });
            if (error) throw error;
            ProtocolDetailView._employeesCache = data || [];
        } catch (e) {
            console.warn('ProtocolDetailView: falha ao buscar funcionários.', e);
            ProtocolDetailView._employeesCache = [];
        }
        return ProtocolDetailView._employeesCache;
    },

    escapeAttr(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    },

    escapeTextarea(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    safeDomId(id) {
        return String(id ?? 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
    },

    openWhatsApp(phone) {
        const n = String(phone || '').replace(/\D/g, '');
        if (!n) return;
        window.open(`https://wa.me/${n}`, '_blank', 'noopener,noreferrer');
    },

    normalizeItemRow(i) {
        if (!i) return { qty: 1, quantity: 1, name: '', product_name: '', price: 0, unit_price: 0, customization: '', customization_details: {} };
        let details = i.customization_details;
        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch {
                details = {};
            }
        }
        if (!details || typeof details !== 'object') details = {};
        const qty = Math.max(1, Number(i.quantity ?? i.qty ?? 1) || 1);
        const price = Number(i.unit_price ?? i.price ?? 0) || 0;
        const name = i.product_name || i.name || '';
        const textFromDetails = typeof details.text === 'string' ? details.text : '';
        const textFromCustom =
            typeof i.customization === 'string'
                ? i.customization
                : (i.customization && typeof i.customization === 'object' && typeof i.customization.text === 'string'
                    ? i.customization.text
                    : '');
        const customization = textFromDetails || textFromCustom || '';
        return {
            ...i,
            qty,
            quantity: qty,
            name,
            product_name: name,
            price,
            unit_price: price,
            customization,
            customization_details: { ...details, text: customization }
        };
    },

    normalizeProtocolState(p) {
        if (!p) return;
        if (!p.items && p.protocol_items) {
            p.items = p.protocol_items.slice();
        }
        if (!Array.isArray(p.items)) p.items = [];
        p.items = p.items.map((row) => ProtocolDetailView.normalizeItemRow(row));

        let steps = p.production_steps;
        if (typeof steps === 'string') {
            try {
                steps = JSON.parse(steps);
            } catch {
                steps = null;
            }
        }
        if (!Array.isArray(steps) || steps.length === 0) {
            steps = [
                { name: 'Corte', status: 'pending' },
                { name: 'Costura', status: 'pending' },
                { name: 'Estampa', status: 'pending' },
                { name: 'Acabamento', status: 'pending' },
                { name: 'Expedição', status: 'pending' }
            ];
        }
        p.production_steps = steps;
    },

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
                    .select('*, protocol_items(*)')
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

        if (!protocol.items && protocol.protocol_items) {
            protocol.items = protocol.protocol_items;
        }
        ProtocolDetailView.normalizeProtocolState(protocol);

        // Clone deeply so changes to items don't affect state until saved and reloaded
        ProtocolDetailView.currentProtocol = JSON.parse(JSON.stringify(protocol));

        // Pré-carrega a lista de funcionários para o seletor de responsável
        // já sair pronta no primeiro render (evita "piscar" o campo vazio).
        await ProtocolDetailView.getEmployees();

        ProtocolDetailView.renderModal(ProtocolDetailView.currentProtocol);
    },

    openTracking() {
        const p = ProtocolDetailView.currentProtocol;
        if (!p || !p.id) return;
        const url = `../pages/track-v2.html?protocol=${encodeURIComponent(String(p.id))}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    },

    /** Texto seguro para o campo "detalhes" do item (evita [object Object]). */
    itemDetailDisplayText(i) {
        if (!i) return '';
        const d = i.customization_details;
        if (d && typeof d === 'object' && typeof d.text === 'string') return d.text;
        if (typeof i.customization === 'string') return i.customization;
        if (i.customization && typeof i.customization === 'object' && typeof i.customization.text === 'string') {
            return i.customization.text;
        }
        return '';
    },

    scrollDossierMain(toEnd) {
        const el = document.querySelector('#protocol-modal .dossier-main--scroll');
        if (!el) return;
        el.scrollTo({
            top: toEnd ? el.scrollHeight : 0,
            behavior: 'smooth'
        });
    },

    syncPriorityUi(priorityVal) {
        const v = (priorityVal && String(priorityVal)) || 'normal';
        document.querySelectorAll('#protocol-modal .dossier-priority-select').forEach((el) => {
            el.value = v;
        });
        const badge = document.querySelector('#protocol-modal .dossier-badge');
        if (badge) {
            const labels = { urgent: 'URGENTE', high: 'ALTA', normal: 'NORMAL' };
            const colors = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6' };
            const c = colors[v] || colors.normal;
            badge.textContent = labels[v] || labels.normal;
            badge.style.background = `${c}20`;
            badge.style.color = c;
        }
        const hdr = document.querySelector('#protocol-modal .dossier-header');
        if (hdr) {
            const colors = { urgent: '#ef4444', high: '#f59e0b', normal: '#3b82f6' };
            const c = colors[v] || colors.normal;
            hdr.style.borderLeft = `5px solid ${c}`;
        }
    },

    renderModal: (p) => {
        if (p && !p.items && p.protocol_items) {
            p.items = p.protocol_items.slice();
        }
        ProtocolDetailView.normalizeProtocolState(p);
        let modal = document.getElementById('protocol-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'protocol-modal';
            modal.className = 'modal-overlay';
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

        const uploadFieldId = ProtocolDetailView.safeDomId(p.id);
        const steps = p.production_steps;
        const stepsHtml = (steps || []).map((step, idx) => `
            <div class="step-item ${step.status === 'done' ? 'step-done' : ''}" onclick="ProtocolDetailView.toggleStep(${idx})">
                <div class="step-checkbox">
                    ${step.status === 'done' ? '<i class="ph-bold ph-check"></i>' : ''}
                </div>
                <span>${ProtocolDetailView.escapeTextarea(step.name || '')}</span>
            </div>
        `).join('');

        const content = `
            <div class="dossier-container">
                <div class="dossier-header" style="border-left: 5px solid ${pColor}">
                    <div>
                        <div class="dossier-id">
                            ${ProtocolDetailView.escapeTextarea(String(p.id || ''))}
                            <span class="dossier-badge" style="background:${pColor}20; color:${pColor}">
                                ${p.priority === 'urgent' ? 'URGENTE' : (p.priority === 'high' ? 'ALTA' : 'NORMAL')}
                            </span>
                        </div>
                        <div class="dossier-client">${ProtocolDetailView.escapeTextarea(p.client_name || 'Cliente')}</div>
                    </div>
                    <button type="button" class="btn-close" onclick="closeProtocolModal()" aria-label="Fechar"><i class="ph-bold ph-x"></i></button>
                </div>

                <div class="dossier-main dossier-main--scroll" id="dossier-main-scroll">
                    <div class="dossier-body">
                    <div class="dossier-left">
                        <div class="dossier-section dossier-section--stack">
                            <h4 class="dossier-section-title">Dados do Pedido</h4>
                            <label>Data do Pedido</label>
                            <input type="datetime-local" value="${ProtocolDetailView.escapeAttr(createdDateVal)}" onchange="ProtocolDetailView.updateField('created_at', new Date(this.value).toISOString())">
                            <label>Valor Total (R$)</label>
                            <input type="number" step="0.01" value="${ProtocolDetailView.escapeAttr(String(p.total_amount ?? 0))}" onchange="ProtocolDetailView.updateField('total_amount', parseFloat(this.value))">
                            <label>Prazo de Entrega</label>
                            <input type="date" value="${ProtocolDetailView.escapeAttr(dueDateVal)}" onchange="ProtocolDetailView.updateField('due_date', this.value)">
                            <label>Prioridade <span class="dossier-field-hint">(espelhada no checklist)</span></label>
                            <select id="dossier-priority-left" class="dossier-priority-select" aria-label="Prioridade do pedido" onchange="ProtocolDetailView.updateField('priority', this.value)">
                                <option value="normal" ${p.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="high" ${p.priority === 'high' ? 'selected' : ''}>Alta</option>
                                <option value="urgent" ${p.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
                            </select>
                            <label>Responsável <span class="dossier-field-hint">(quem está tocando este pedido)</span></label>
                            <select aria-label="Funcionário responsável" onchange="ProtocolDetailView.updateAssignedTo(this.value)">
                                <option value="">— Sem responsável —</option>
                                ${(ProtocolDetailView._employeesCache || []).map(e => `
                                    <option value="${ProtocolDetailView.escapeAttr(e.id)}" ${p.assigned_to === e.id ? 'selected' : ''}>
                                        ${ProtocolDetailView.escapeTextarea(e.full_name || e.email || 'Sem nome')}
                                    </option>
                                `).join('')}
                            </select>

                            <h4 class="dossier-section-title dossier-section-title--spaced">Dados do Cliente</h4>
                            <label>Nome do Cliente</label>
                            <input type="text" value="${ProtocolDetailView.escapeAttr(p.client_name || '')}" onchange="ProtocolDetailView.updateField('client_name', this.value)">
                            <label>Email do Cliente</label>
                            <input type="email" value="${ProtocolDetailView.escapeAttr(p.client_email || '')}" onchange="ProtocolDetailView.updateField('client_email', this.value)">
                            <label>Telefone do Cliente</label>
                            <input type="text" value="${ProtocolDetailView.escapeAttr(p.client_phone || '')}" onchange="ProtocolDetailView.updateField('client_phone', this.value)">

                            <h4 class="dossier-section-title dossier-section-title--spaced">Observações</h4>
                            <textarea onchange="ProtocolDetailView.updateField('notes', this.value)" rows="3" class="dossier-notes">${ProtocolDetailView.escapeTextarea(p.notes || '')}</textarea>
                        </div>

                        <div class="dossier-actions">
                            <button type="button" class="btn-action primary" onclick="typeof PrintService !== 'undefined' && PrintService.printWallSheet(ProtocolDetailView.currentProtocol)">
                                <i class="ph-bold ph-printer"></i> Imprimir Parede
                            </button>
                            <button type="button" class="btn-action secondary" onclick="ProtocolDetailView.openTracking()">
                                <i class="ph-bold ph-link"></i> Ver página de rastreio
                            </button>
                            ${p.client_phone ? `
                            <button type="button" class="btn-action whatsapp" onclick="ProtocolDetailView.openWhatsApp(${JSON.stringify(String(p.client_phone))})">
                                <i class="ph-bold ph-whatsapp-logo"></i> WhatsApp
                            </button>` : ''}
                        </div>
                    </div>

                    <div class="dossier-right">
                        <section class="dossier-panel">
                            <div class="dossier-panel__head">
                                <span><i class="ph-bold ph-image" style="color:#6366f1;"></i> Projetos e Artes</span>
                            </div>
                            <div class="dossier-panel__body">
                                <label class="dossier-file-label">Anexar arquivo (PDF, PNG ou JPG)</label>
                                <input type="file" id="mockup-upload-${uploadFieldId}" accept=".pdf,.png,.jpg,.jpeg" class="dossier-file-input">
                                <button type="button" class="dossier-btn dossier-btn--primary dossier-btn--block" onclick="ProtocolDetailView.uploadMockup(${JSON.stringify(String(p.id))})">
                                    <i class="ph-bold ph-plus"></i> Adicionar arte
                                </button>
                                <div id="mockups-list-container" class="dossier-mockup-list">
                                ${(() => {
                let mockups = [];
                try {
                    if (p.mockup_url) {
                        mockups = p.mockup_url.startsWith('[') ? JSON.parse(p.mockup_url) : [{ name: 'Arte Principal', url: p.mockup_url }];
                    }
                } catch (e) { console.error("Erro parse mockup_url", e); }

                if (mockups.length === 0) return '<div class="dossier-empty-hint">Nenhuma arte anexada ainda.</div>';

                return mockups.map((m, index) => {
                    const isImage = (m && m.url && typeof m.url === 'string') ? m.url.match(/\.(jpeg|jpg|png|gif)$/i) !== null : false;
                    return `
                                        <div class="dossier-mockup-row">
                                            <div class="dossier-mockup-row__main">
                                                ${isImage ?
                            `<img src="${m.url || ''}" class="dossier-mockup-thumb" alt="">`
                            :
                            `<div class="dossier-mockup-thumb dossier-mockup-thumb--pdf"><i class="ph-bold ph-file-pdf"></i></div>`
                        }
                                                <div class="dossier-mockup-name">${ProtocolDetailView.escapeTextarea(m.name || 'Arte ' + (index + 1))}</div>
                                            </div>
                                            <div class="dossier-mockup-row__actions">
                                                <a href="${m.url || '#'}" target="_blank" rel="noopener noreferrer" class="dossier-mini-btn dossier-mini-btn--ok"><i class="ph-bold ph-eye"></i> Ver</a>
                                                <button type="button" class="dossier-mini-btn dossier-mini-btn--danger" onclick="ProtocolDetailView.removeMockup(${JSON.stringify(String(p.id))}, ${index})" title="Remover arte"><i class="ph-bold ph-trash"></i></button>
                                            </div>
                                        </div>
                                    `}).join('');
            })()}
                                </div>
                            </div>
                        </section>

                        <section class="dossier-panel">
                            <div class="dossier-panel__head dossier-panel__head--split">
                                <span class="dossier-panel__head-title"><i class="ph-bold ph-check-square" style="color:#0f766e;"></i> Checklist de produção</span>
                                <div class="dossier-priority-inline" title="Urgência na fila de produção">
                                    <label for="dossier-priority-checklist">Prioridade</label>
                                    <select id="dossier-priority-checklist" class="dossier-priority-select dossier-priority-select--compact" aria-label="Prioridade na produção" onchange="ProtocolDetailView.updateField('priority', this.value)">
                                        <option value="normal" ${p.priority === 'normal' ? 'selected' : ''}>Normal</option>
                                        <option value="high" ${p.priority === 'high' ? 'selected' : ''}>Alta</option>
                                        <option value="urgent" ${p.priority === 'urgent' ? 'selected' : ''}>Urgente</option>
                                    </select>
                                </div>
                            </div>
                            <div class="dossier-panel__body">
                                <p class="dossier-panel-lead">A prioridade vale para todo o pedido e aparece no topo do dossiê.</p>
                                <div class="checklist-grid">${stepsHtml}</div>
                            </div>
                        </section>

                        <section class="dossier-panel">
                            <div class="dossier-panel__head">
                                <span><i class="ph-bold ph-package" style="color:#4f46e5;"></i> Itens do pedido</span>
                                <button type="button" class="dossier-btn dossier-btn--primary dossier-btn--sm" onclick="ProtocolDetailView.addNewItem()"><i class="ph-bold ph-plus"></i> Adicionar item</button>
                            </div>
                            <div class="dossier-panel__body">
                                <div class="dossier-items">
                            ${(p.items || []).map((i, index) => `
                                <div class="d_item">
                                    <div class="d_item__row">
                                        <input type="number" value="${ProtocolDetailView.escapeAttr(String(i.qty || i.quantity || 1))}" class="d_item__qty" onchange="ProtocolDetailView.updateItem(${index}, 'qty', this.value)" title="Quantidade" min="1">
                                        <input type="text" value="${ProtocolDetailView.escapeAttr(i.name || i.product_name || '')}" class="d_item__name" onchange="ProtocolDetailView.updateItem(${index}, 'name', this.value)" title="Nome do Produto" placeholder="Nome do produto">
                                        <button type="button" class="dossier-mini-btn dossier-mini-btn--danger" onclick="ProtocolDetailView.removeItem(${index})" title="Remover item"><i class="ph-bold ph-trash"></i></button>
                                    </div>
                                    <div class="d_item__row">
                                        <input type="number" step="0.01" value="${ProtocolDetailView.escapeAttr(String(i.price || i.unit_price || 0))}" class="d_item__price" onchange="ProtocolDetailView.updateItem(${index}, 'price', this.value)" title="Preço unitário (R$)" min="0">
                                        <input type="text" value="${ProtocolDetailView.escapeAttr(ProtocolDetailView.itemDetailDisplayText(i))}" class="d_item__detail" placeholder="Detalhes (opcional)" onchange="ProtocolDetailView.updateItem(${index}, 'customization', this.value)" title="Personalização">
                                    </div>
                                </div>
                            `).join('')}
                            ${(p.items && p.items.length > 0) ? `
                                <button type="button" class="dossier-btn dossier-btn--success dossier-btn--block dossier-btn--save" onclick="ProtocolDetailView.saveItems()">
                                    <i class="ph-bold ph-floppy-disk"></i> Salvar itens no banco
                                </button>
                            ` : '<div class="dossier-empty-hint">Nenhum item neste pedido. Use &quot;Adicionar item&quot; e depois salve.</div>'}
                                </div>
                            </div>
                        </section>
                    </div>
                    </div>
                </div>

                <footer class="dossier-footer">
                    <span class="dossier-footer__hint"><i class="ph-bold ph-caret-double-down"></i> Role o conteúdo acima para ver tudo</span>
                    <div class="dossier-footer__actions">
                        <button type="button" class="dossier-footer-btn dossier-footer-btn--ghost" onclick="ProtocolDetailView.scrollDossierMain(false)">Topo</button>
                        <button type="button" class="dossier-footer-btn dossier-footer-btn--ghost" onclick="ProtocolDetailView.scrollDossierMain(true)">Fim</button>
                        <button type="button" class="dossier-footer-btn dossier-footer-btn--primary" onclick="closeProtocolModal()">Fechar</button>
                    </div>
                </footer>
            </div>
        `;

        const modalContent = document.getElementById('protocol-modal-content');
        if (modalContent) {
            modalContent.innerHTML = content;
        } else {
            modal.innerHTML = `<div class="modal-content" id="protocol-modal-content" style="max-width:1024px; padding:0;">${content}</div>`;
        }

        modal.classList.add('open');
        modal.style.removeProperty('display');
    },

    toggleStep: async (index) => {
        const p = ProtocolDetailView.currentProtocol;
        ProtocolDetailView.normalizeProtocolState(p);
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
        });

        const step = p.production_steps[index];
        if (!step) return;

        const prevStatus = step.status;
        step.status = step.status === 'pending' ? 'done' : 'pending';

        ProtocolDetailView.renderModal(p);

        try {
            const res = await KanbanService.updateProtocolDetails(p.id, { production_steps: p.production_steps });
            if (!res || !res.success) throw new Error(res?.error?.message || 'Erro ao salvar');
            refreshKanbanIfOpen();
            Toast.fire({ icon: 'success', title: 'Checklist salvo' });
        } catch (e) {
            console.error(e);
            step.status = prevStatus;
            ProtocolDetailView.renderModal(p);
            Toast.fire({ icon: 'error', title: e.message || 'Erro ao salvar' });
        }
    },

    // Igual updateField, mas com log de auditoria (quem passou o pedido pra
    // quem) — reaproveita ProtocolsManager.logAudit, já usado em outras 7
    // ações do módulo de pedidos.
    updateAssignedTo: async (value) => {
        const p = ProtocolDetailView.currentProtocol;
        const before = p.assigned_to || null;
        const after = value || null;
        if (before === after) return;

        p.assigned_to = after;

        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 2000
        });

        try {
            const res = await KanbanService.updateProtocolDetails(p.id, { assigned_to: after });
            if (!res || !res.success) throw new Error(res?.error?.message || 'Erro ao salvar');

            if (typeof ProtocolsManager !== 'undefined' && ProtocolsManager.logAudit) {
                const employees = await ProtocolDetailView.getEmployees();
                const nameOf = (id) => employees.find(e => e.id === id)?.full_name || null;
                await ProtocolsManager.logAudit({
                    action: 'assigned_to_changed',
                    entityId: p.id,
                    beforeData: { assigned_to: before, assigned_to_name: nameOf(before) },
                    afterData: { assigned_to: after, assigned_to_name: nameOf(after) }
                });
            }

            refreshKanbanIfOpen();
            Toast.fire({ icon: 'success', title: after ? 'Responsável definido' : 'Responsável removido' });
        } catch (e) {
            console.error(e);
            p.assigned_to = before;
            ProtocolDetailView.renderModal(p);
            Toast.fire({ icon: 'error', title: e.message || 'Erro ao salvar' });
        }
    },

    updateField: async (field, value) => {
        const p = ProtocolDetailView.currentProtocol;
        p[field] = value;

        const Toast = Swal.mixin({
            toast: true, position: "top-end", showConfirmButton: false, timer: 2000
        });

        try {
            const res = await KanbanService.updateProtocolDetails(p.id, { [field]: value });
            if (!res || !res.success) throw new Error(res?.error?.message || 'Erro ao salvar');
            if (field === 'priority') {
                ProtocolDetailView.syncPriorityUi(value);
            }
            refreshKanbanIfOpen();
            Toast.fire({ icon: "success", title: "Salvo" });
        } catch (e) {
            console.error(e);
            Toast.fire({ icon: "error", title: e.message || "Erro ao salvar" });
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
            refreshKanbanIfOpen();
        } catch (e) {
            console.error(e);
            Swal.fire('Erro', 'Não foi possível salvar os itens no banco de dados.', 'error');
        }
    },

    uploadMockup: async (protocolId) => {
        const input = document.getElementById(`mockup-upload-${ProtocolDetailView.safeDomId(protocolId)}`);
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
            refreshKanbanIfOpen();

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
            refreshKanbanIfOpen();
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
    if (modal) {
        modal.classList.remove('open');
        modal.style.removeProperty('display');
    }
    if(window.ProtocolDetailView) window.ProtocolDetailView.currentProtocol = null;
};
