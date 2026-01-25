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

    async createProtocol(protocolData) {
        try {
            if (!protocolData.client_id) throw new Error('Cliente obrigatório');
            if (!protocolData.items || protocolData.items.length === 0) throw new Error('Protocolo sem itens');

            const year = new Date().getFullYear();
            const random = Math.floor(1000 + Math.random() * 9000);
            const newId = `#MV-${year}-${random}`;

            const { data: protocol, error: protoError } = await window.supabase
                .from('protocols')
                .insert({
                    id: newId,
                    client_id: protocolData.client_id,
                    total_amount: protocolData.total_amount || 0,
                    column_id: 1,
                    payment_status: 'pending',
                    notes: protocolData.notes || ''
                })
                .select()
                .single();

            if (protoError) throw protoError;

            const itemsToInsert = protocolData.items.map(item => ({
                protocol_id: newId,
                product_name: item.name,
                quantity: item.qty,
                unit_price: item.price,
                total_price: item.price * item.qty,
                customization_details: item.customization || {}
            }));

            const { error: itemsError } = await window.supabase
                .from('protocol_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('CRITICAL: Protocolo criado sem itens!', itemsError);
                throw itemsError;
            }

            await window.supabase.from('protocol_history').insert({
                protocol_id: newId,
                action: 'CREATED',
                details: { origin: 'Checkout/Admin' }
            });

            return createSuccess(protocol);

        } catch (err) {
            return createError('createProtocol', err);
        }
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
