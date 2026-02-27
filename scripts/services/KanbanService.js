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
                    items:protocol_items(*),
                    due_date,
                    priority,
                    production_steps,
                    assigned_to,
                    production_notes
                `)
                .order('updated_at', { ascending: false });

            if (filters.clientId) {
                query = query.eq('client_id', filters.clientId);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Map items back to expected UI format
            if (data) {
                data.forEach(protocol => {
                    if (protocol.items) {
                        protocol.items = protocol.items.map(item => {
                            let details = item.customization_details || {};
                            if (typeof details === 'string') {
                                try { details = JSON.parse(details); } catch (e) { }
                            }
                            return {
                                ...item,
                                name: item.product_name, // Mapping product_name to name
                                qty: item.quantity,
                                price: item.unit_price,
                                customization: details.text || details, // Fallback for old data
                                fileUrl: details.fileUrl || null,
                                fileName: details.fileName || null,
                                configuration: details.configuration || null
                            };
                        });
                    }
                });
            }

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
            // Admin bypass UUID (zeros) não existe em auth.users — tratar como null para evitar FK violation
            const ADMIN_BYPASS_UUID = '00000000-0000-0000-0000-000000000000';
            const isAdminBypass = requestData.client_id === ADMIN_BYPASS_UUID;

            if (!requestData.client_id && !requestData.client_email) {
                console.error("KanbanService: client_id e client_email ausentes!", requestData);
                throw new Error('Você precisa estar logado para enviar uma solicitação.');
            }

            // Generate Requests ID (#REQ-...)
            const random = Math.floor(1000 + Math.random() * 9000);
            const reqId = `#REQ-${random}`;

            console.log("KanbanService: Creating request...", { reqId, isAdminBypass, ...requestData });

            // Usa constantes centralizadas (com fallback se constants.js não estiver carregado)
            const STATUS_INQUIRY = window.MV?.STATUS?.INQUIRY || 'inquiry';
            const PAYMENT_PENDING = window.MV?.PAYMENT?.PENDING || 'pending';

            // Monta o payload sem client_id se for admin bypass (evita FK uuid violation)
            const insertPayload = {
                id: reqId,
                client_email: requestData.client_email || null,
                total_amount: requestData.total_amount || 0,
                column_id: requestData.column_id || 1,
                status: requestData.status || STATUS_INQUIRY,
                payment_status: PAYMENT_PENDING,
                notes: requestData.notes || ''
            };

            // Só inclui client_id se for um UUID real (não bypass)
            if (requestData.client_id && !isAdminBypass) {
                insertPayload.client_id = requestData.client_id;
            }

            // Inclui client_name se disponível
            if (requestData.client_name) {
                insertPayload.client_name = requestData.client_name;
            }

            const { data: request, error } = await window.supabase
                .from('protocols')
                .insert(insertPayload)
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
                    quantity: item.qty || item.quantity,
                    unit_price: Number(item.price || item.unit_price) || 0,
                    total_price: (Number(item.price || item.unit_price) || 0) * (Number(item.qty || item.quantity) || 1),
                    customization_details: {
                        text: item.customization || '',
                        fileUrl: item.fileUrl || null,
                        fileName: item.fileName || null,
                        configuration: item.configuration || null
                    }
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
    },

    async updateProtocolDetails(protocolId, updates) {
        try {
            // Safe update for any field (due_date, priority, etc)
            const { data, error } = await window.supabase
                .from('protocols')
                .update(updates)
                .eq('id', protocolId)
                .select();

            if (error) throw error;
            return createSuccess(data);
        } catch (err) {
            return createError('updateProtocolDetails', err);
        }
    }
};

// Expose to Global Scope
window.KanbanService = KanbanService;
