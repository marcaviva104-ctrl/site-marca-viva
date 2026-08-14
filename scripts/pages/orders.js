/**
 * Marca Viva - Order Management System
 * Handles creation, storage, and status updates of orders.
 */

const OrderManager = {
    STATUS: {
        pending: { label: 'Pendente', icon: '🕓', color: '#f59e0b', step: 1 },
        paid: { label: 'Pago', icon: '💰', color: '#10b981', step: 2 },
        production: { label: 'Em Produção', icon: '🎨', color: '#3b82f6', step: 3 },
        shipped: { label: 'Enviado', icon: '🚚', color: '#8b5cf6', step: 4 },
        delivered: { label: 'Entregue', icon: '✅', color: '#059669', step: 5 }
    },

    async getOrdersByCustomer(email) {
        // We actually use the authenticated user ID for security usually
        const user = authService.getCurrentUser();
        if (!user || !window.supabase) return { error: 'Not authenticated' };

        // Updated to use Protocols (The "New Notebook")
        let { data, error } = await window.supabase
            .from('protocols')
            .select(`
                *,
                protocol_items (*)
            `)
            .eq('client_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(50); // Performance Protection: Load max 50 recent orders

        // Fallback: Try by Email (Common issue in hybrid auth systems)
        if (!error && (!data || data.length === 0) && user.email) {
            console.log("Orders: No orders found by ID, trying email...");
            const { data: dataEmail, error: errorEmail } = await window.supabase
                .from('protocols')
                .select(`*, protocol_items (*)`)
                .eq('client_email', user.email)
                .order('updated_at', { ascending: false })
                .limit(50);

            if (!errorEmail && dataEmail && dataEmail.length > 0) {
                data = dataEmail;
            }
        }

        if (error) {
            console.error("Error fetching user orders:", error);
            return { error: error.message }; // Return error to UI
        }

        // Map Protocols to expected Order format
        return data.map(p => ({
            id: p.id,
            date: p.created_at,
            total: Number(p.total_amount),
            status: p.status === 'inquiry' ? 'pending' : p.status, // Map status
            items: (p.protocol_items || []).map(i => {
                let details = i.customization_details || {};
                if (typeof details === 'string') {
                    try { details = JSON.parse(details); } catch (e) { }
                }
                return {
                    quantity: i.quantity,
                    price: Number(i.unit_price),
                    name: i.product_name || 'Produto Personalizado',
                    fileUrl: details.fileUrl || null,
                    fileName: details.fileName || null,
                    configuration: details.configuration || null,
                    customization: details.text || details,
                    image: null // Protocols might not store image URL directly on item yet
                };
            })
        }));
    },

    getStatusInfo(statusId) {
        return this.STATUS[statusId] || this.STATUS.pending;
    },

    // --- Admin Methods ---
    async getAllOrders() {
        if (!window.supabase) return [];

        // Updated to use Protocols (Single Source of Truth)
        const { data, error } = await window.supabase
            .from('protocols')
            .select(`
                *,
                protocol_items (*)
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching all orders (protocols):", error);
            return [];
        }

        return this._mapProtocolsToOrders(data);
    },

    async getOrdersBetween(startDate, endDate) {
        if (!window.supabase) return [];
        const s = startDate instanceof Date ? startDate : new Date(startDate);
        const e = endDate instanceof Date ? endDate : new Date(endDate);
        if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return this.getAllOrders();

        const { data, error } = await window.supabase
            .from('protocols')
            .select(`
                *,
                protocol_items (*)
            `)
            .gte('created_at', s.toISOString())
            .lte('created_at', e.toISOString())
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders by date (protocols):', error);
            return [];
        }
        return this._mapProtocolsToOrders(data || []);
    },

    _mapProtocolsToOrders(data) {
        return data.map(p => ({
            id: p.id,
            date: p.created_at,
            total: Number(p.total_amount),
            status: p.status === 'inquiry' ? 'pending' : p.status,
            customer_name: p.client_name || `Cliente #${p.client_id || '?'}`,
            customer_email: p.client_email,
            customer_phone: p.client_phone,
            items: (p.protocol_items || []).map(i => {
                let details = i.customization_details || {};
                if (typeof details === 'string') {
                    try { details = JSON.parse(details); } catch (err) { }
                }
                return {
                    quantity: i.quantity,
                    price: Number(i.unit_price),
                    name: i.product_name || 'Item Personalizado',
                    fileUrl: details.fileUrl || null,
                    fileName: details.fileName || null,
                    configuration: details.configuration || null,
                    customization: details.text || details,
                    image: null
                };
            })
        }));
    },

    async updateStatus(orderId, newStatus) {
        if (!window.supabase) return false;

        // Usa protocols (tabela principal do sistema)
        const { error } = await window.supabase
            .from('protocols')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);

        if (error) {
            console.error("Error updating status:", error);
            return false;
        }
        return true;
    },

    async createOrderFromManual(orderData) {
        if (!window.supabase) return false;

        try {
            // Gera ID sequencial no padrão do sistema
            const year = new Date().getFullYear();
            const random = Math.floor(1000 + Math.random() * 9000);
            const orderId = `#MV-${year}-${random}`;

            // 1. Cria protocol (tabela principal)
            const { data: order, error } = await window.supabase
                .from('protocols')
                .insert({
                    id: orderId,
                    client_name: orderData.customer_name,
                    client_email: orderData.customer_email || null,
                    total_amount: orderData.total || 0,
                    status: orderData.status || 'inquiry',
                    payment_status: 'pending',
                    column_id: 1,
                    notes: orderData.notes || null,
                    created_at: orderData.date || new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating manual order:", error);
                return false;
            }

            // 2. Cria itens do protocol
            if (orderData.items && orderData.items.length > 0) {
                const itemsPayload = orderData.items.map(item => ({
                    protocol_id: orderId,
                    product_name: item.name || 'Produto',
                    quantity: item.quantity || 1,
                    unit_price: item.price || 0,
                    total_price: (item.price || 0) * (item.quantity || 1)
                }));

                const { error: itemsError } = await window.supabase.from('protocol_items').insert(itemsPayload);
                if (itemsError) console.warn("Manual Order: Could not save items", itemsError);
            }

            return true;
        } catch (e) {
            console.error("Manual Order Exception:", e);
            return false;
        }
    }
};

window.OrderManager = OrderManager;
