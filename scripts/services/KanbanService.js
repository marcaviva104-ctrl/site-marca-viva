// KanbanService.js
// O "Cérebro" do Sistema de Protocolos (Versão Profissional)
// ADAPTADO PARA RODAR SEM SERVIDOR (file://) - USA GLOBAIS

// Depende de: window.supabase (definido em supabase-client.js)

// Helper de Erro Padronizado
const createError = (context, err) => {
    console.error(`[KanbanService:${context}]`, err);
    return {
        success: false,
        data: null,
        error: {
            message: err.message || 'Erro desconhecido no servidor',
            code: err.code || 'UNKNOWN',
            details: err
        }
    };
};

const createSuccess = (data) => ({ success: true, data, error: null });

const KanbanService = {

    // =========================================================================
    // 1. LEITURA (Queries Otimizadas)
    // =========================================================================

    async getColumns() {
        try {
            // Usa global window.supabase
            const { data, error } = await window.supabase
                .from('kanban_columns')
                .select('*')
                .order('position', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Falha crítica ao buscar colunas', error);
            throw error;
        }
    },

    async getProtocols(filters = {}) {
        try {
            let query = window.supabase
                .from('protocols')
                .select(`
                    *,
                    client:auth.users(email, raw_user_meta_data),
                    items:protocol_items(*)
                `)
                .order('updated_at', { ascending: false });

            if (filters.clientId) {
                query = query.eq('client_id', filters.clientId);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Falha ao buscar protocolos', error);
            return [];
        }
    },

    async getProtocolHistory(protocolId) {
        try {
            const { data, error } = await window.supabase
                .from('protocol_history')
                .select('*')
                .eq('protocol_id', protocolId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Falha ao buscar histórico', error);
            return [];
        }
    },

    // =========================================================================
    // 2. ESCRITA SEGURA (Mutations via RPC)
    // =========================================================================

    async moveCard(protocolId, newColumnId) {
        try {
            const { error } = await window.supabase.rpc('move_protocol', {
                p_protocol_id: protocolId,
                p_new_column_id: Number(newColumnId),
                p_reason: 'Movido via Kanban Admin'
            });

            if (error) throw error;

            console.log(`✅ Card ${protocolId} movido com segurança.`);
            return createSuccess(true);

        } catch (err) {
            return createError('moveCard', err);
        }
    },

    async createRequest(requestData) {
        try {
            if (!requestData.client_id) {
                console.error("KanbanService: client_id is missing!", requestData);
                throw new Error('Você precisa estar logado para enviar uma solicitação.');
            }

            // Generate Requests ID (#REQ-...)
            const random = Math.floor(1000 + Math.random() * 9000);
            const reqId = `#REQ-${random}`;

            console.log("KanbanService: Creating request...", { reqId, ...requestData });

            const { data: request, error } = await window.supabase
                .from('protocols')
                .insert({
                    id: reqId,
                    client_id: requestData.client_id, // Must match Auth ID
                    total_amount: requestData.total_amount || 0,
                    column_id: 1, // 1 = Entrada (Lead) - Corrigido de 0 para 1 para evitar erro de FK
                    status: 'inquiry',
                    payment_status: 'pending',
                    notes: requestData.notes || ''
                })
                .select()
                .single();

            if (error) {
                console.error("Supabase Error on Insert:", error);
                throw error;
            }

            // Save Items
            if (requestData.items && requestData.items.length > 0) {
                const itemsToInsert = requestData.items.map(item => ({
                    protocol_id: reqId,
                    product_name: item.name,
                    quantity: item.qty,
                    unit_price: item.price,
                    total_price: item.price * item.qty,
                    customization_details: item.customization || {}
                }));
                const { error: itemsError } = await window.supabase.from('protocol_items').insert(itemsToInsert);
                if (itemsError) console.error("Supabase Error on Items:", itemsError);
            }

            return createSuccess(request);

        } catch (err) {
            console.error("createRequest Exception:", err);
            return createError('createRequest', err);
        }
    },

    async approveRequest(requestId) {
        try {
            // Move to "Aguardando Pagamento" (Column 3)
            // Keep the #REQ ID for now.
            const { data, error } = await window.supabase
                .from('protocols')
                .update({
                    column_id: 3,
                    status: 'awaiting_payment',
                    updated_at: new Date()
                })
                .eq('id', requestId)
                .select();

            if (error) throw error;
            return createSuccess(data);
        } catch (err) {
            return createError('approveRequest', err);
        }
    },

    async promoteToProtocol(requestId, adminId) {
        try {
            // Generates new Official ID and Moves to Production (Column 4)
            const { data, error } = await window.supabase.rpc('promote_request_to_protocol', {
                p_request_id: requestId,
                p_admin_id: adminId
            });

            if (error) {
                console.error("RPC Error:", error);
                throw error;
            }

            if (error) throw error;
            return createSuccess(data);

        } catch (err) {
            return createError('promoteToProtocol', err);
        }
    },

    // Legacy Support (renamed to align, or kept for direct creation if needed)
    async createProtocol(protocolData) {
        // Redirect to Request flow by default for now, unless 'force_production' flag?
        // Let's make it direct for backward compatibility if needed, 
        // but User wants Request flow.
        return this.createRequest(protocolData);
    },

    async updatePayment(protocolId, status, amount) {
        try {
            const { data, error } = await window.supabase
                .from('protocols')
                .update({
                    payment_status: status,
                    paid_amount: amount,
                    updated_at: new Date()
                })
                .eq('id', protocolId)
                .select()
                .single();

            if (error) throw error;
            return createSuccess(data);

        } catch (err) {
            return createError('updatePayment', err);
        }
    }
};

// Expose to Global Scope
window.KanbanService = KanbanService;
