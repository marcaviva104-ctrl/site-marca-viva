/**
 * AuditManager — leitor da tabela admin_audit_logs.
 *
 * O log já é gravado há tempos (ProtocolsManager.logAudit, em
 * admin-protocols.js), mas não existia tela nenhuma para lê-lo — só
 * abrindo o Supabase direto. Este módulo é só o visor: filtro por
 * período e por número de pedido, sem paginação ainda (ver Fase 5
 * do plano de melhorias, junto com as outras listas grandes do painel).
 */
const AuditManager = {
    LIMIT: 100,
    logs: [],
    _debounceHandle: null,

    ACTION_LABELS: {
        protocol_approved: 'Pedido aprovado',
        protocol_status_changed: 'Status alterado',
        protocol_rejected: 'Pedido rejeitado',
        protocol_nfe_removed: 'NF-e removida',
        protocol_nfe_restored: 'NF-e restaurada',
        protocol_payment_adjusted_for_quote: 'Pagamento ajustado (orçamento)',
        protocol_edited: 'Pedido editado',
        assigned_to_changed: 'Responsável alterado'
    },

    actionLabel(action) {
        return this.ACTION_LABELS[action] || action || '—';
    },

    escapeHtml(value) {
        return (value ?? '')
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    clearFilters() {
        const start = document.getElementById('audit-date-start');
        const end = document.getElementById('audit-date-end');
        const search = document.getElementById('audit-entity-search');
        if (start) start.value = '';
        if (end) end.value = '';
        if (search) search.value = '';
        this.loadLogs();
    },

    debouncedLoad() {
        clearTimeout(this._debounceHandle);
        this._debounceHandle = setTimeout(() => this.loadLogs(), 350);
    },

    async loadLogs() {
        const body = document.getElementById('audit-table-body');
        const meta = document.getElementById('audit-list-meta');
        if (!body) return;

        if (!window.supabase) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Sem conexão com o banco.</td></tr>';
            return;
        }

        const dateStart = document.getElementById('audit-date-start')?.value || '';
        const dateEnd = document.getElementById('audit-date-end')?.value || '';
        const entityTerm = (document.getElementById('audit-entity-search')?.value || '').trim();

        let query = window.supabase
            .from('admin_audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(this.LIMIT);

        if (dateStart) query = query.gte('created_at', `${dateStart}T00:00:00`);
        if (dateEnd) query = query.lte('created_at', `${dateEnd}T23:59:59`);
        if (entityTerm) query = query.ilike('entity_id', `%${entityTerm}%`);

        const { data, error } = await query;

        if (error) {
            console.error('Auditoria: falha ao carregar log.', error);
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Não foi possível carregar. Se o painel foi aberto sem login, as regras do banco bloqueiam a leitura.</td></tr>';
            return;
        }

        this.logs = data || [];
        this.renderTable(this.logs);

        if (meta) {
            const capped = this.logs.length >= this.LIMIT;
            meta.textContent = capped
                ? `${this.logs.length} registro(s) — mostrando só os mais recentes, refine o filtro para ver mais.`
                : `${this.logs.length} registro(s).`;
        }
    },

    renderTable(logs) {
        const body = document.getElementById('audit-table-body');
        if (!body) return;

        if (logs.length === 0) {
            body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Nenhum registro para esse filtro.</td></tr>';
            return;
        }

        body.innerHTML = logs.map((log, index) => {
            const when = new Date(log.created_at).toLocaleString('pt-BR');
            const who = log.actor_email || log.actor_role || 'Sistema';
            const entity = log.entity_id ? String(log.entity_id).slice(0, 12) : '—';
            const canOpenProtocol = log.entity_type === 'protocol' && log.entity_id;

            return `
                <tr>
                    <td style="color:#64748b; font-size:0.85rem; white-space:nowrap;">${when}</td>
                    <td style="font-size:0.85rem;">${this.escapeHtml(who)}</td>
                    <td style="font-size:0.85rem; font-weight:600;">${this.escapeHtml(this.actionLabel(log.action))}</td>
                    <td style="font-size:0.85rem;">
                        ${canOpenProtocol
                    ? `<a href="#" onclick="event.preventDefault(); adminApp.switchView('orders'); if(window.ProtocolDetailView) window.ProtocolDetailView.open('${this.escapeHtml(log.entity_id)}');" style="color:#3b82f6;">${this.escapeHtml(entity)}</a>`
                    : this.escapeHtml(entity)}
                    </td>
                    <td>
                        <button type="button" class="btn-icon" title="Ver detalhes" onclick="AuditManager.viewDetail(${index})">
                            <i class="ph-bold ph-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    viewDetail(index) {
        const log = this.logs[index];
        if (!log) return;

        const fmt = (obj) => obj ? `<pre style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; font-size:0.75rem; overflow-x:auto; white-space:pre-wrap;">${this.escapeHtml(JSON.stringify(obj, null, 2))}</pre>` : '<span style="color:#94a3b8;">—</span>';

        Swal.fire({
            title: this.actionLabel(log.action),
            html: `
                <div style="text-align:left; font-size:0.85rem;">
                    <p><strong>Quando:</strong> ${new Date(log.created_at).toLocaleString('pt-BR')}</p>
                    <p><strong>Quem:</strong> ${this.escapeHtml(log.actor_email || '—')} (${this.escapeHtml(log.actor_role || 'sem cargo')})</p>
                    <p><strong>Pedido:</strong> ${this.escapeHtml(log.entity_id || '—')}</p>
                    <p style="margin-top:10px;"><strong>Antes:</strong></p>
                    ${fmt(log.before_data)}
                    <p style="margin-top:10px;"><strong>Depois:</strong></p>
                    ${fmt(log.after_data)}
                </div>
            `,
            width: 560,
            showConfirmButton: true,
            confirmButtonText: 'Fechar'
        });
    }
};

window.AuditManager = AuditManager;
