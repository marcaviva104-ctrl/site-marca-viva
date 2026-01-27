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
        if (!user || !window.supabase) return [];

        // Updated to use Protocols (The "New Notebook")
        let { data, error } = await window.supabase
            .from('protocols')
            .select(`
                *,
                protocol_items (*)
            `)
            .eq('client_id', user.id)
            .order('updated_at', { ascending: false });

        // Fallback: Try by Email (Common issue in hybrid auth systems)
        if (!error && (!data || data.length === 0) && user.email) {
            console.log("Orders: No orders found by ID, trying email...");
            const { data: dataEmail, error: errorEmail } = await window.supabase
                .from('protocols')
                .select(`*, protocol_items (*)`)
                .eq('client_email', user.email)
                .order('updated_at', { ascending: false });

            if (!errorEmail && dataEmail && dataEmail.length > 0) {
                data = dataEmail;
            }
        }

        if (error) {
            console.error("Error fetching user orders:", error);
            return [];
        }

        // Map Protocols to expected Order format
        return data.map(p => ({
            id: p.id,
            date: p.created_at,
            total: Number(p.total_amount),
            status: p.status === 'inquiry' ? 'pending' : p.status, // Map status
            items: (p.protocol_items || []).map(i => ({
                quantity: i.quantity,
                price: Number(i.unit_price),
                name: i.product_name || 'Produto Personalizado',
                image: null // Protocols might not store image URL directly on item yet
            }))
        }));
    },

    getStatusInfo(statusId) {
        return this.STATUS[statusId] || this.STATUS.pending;
    },

    // --- Admin Methods ---
    async getAllOrders() {
        if (!window.supabase) return [];

        const { data, error } = await window.supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    product:products(name, image)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching all orders:", error);
            return [];
        }

        return data.map(o => ({
            id: o.id,
            date: o.created_at,
            total: Number(o.total),
            status: o.status,
            customer_name: o.customer_name || 'Cliente',
            customer_email: o.user_id,
            customer_phone: o.whatsapp || o.phone || '', // Try to find phone
            items: o.order_items.map(i => ({
                quantity: i.quantity,
                name: i.product?.name || 'Produto'
            }))
        }));
    },

    async updateStatus(orderId, newStatus) {
        if (!window.supabase) return false;

        const { error } = await window.supabase
            .from('orders')
            .update({ status: newStatus })
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
            // 1. Create Order
            const { data: order, error } = await window.supabase
                .from('orders')
                .insert({
                    customer_name: orderData.customer_name,
                    total: orderData.total,
                    status: orderData.status || 'pending',
                    created_at: orderData.date || new Date().toISOString(),
                    payment_method: orderData.payment_method
                })
                .select()
                .single();

            if (error) {
                console.error("Error creating manual order:", error);
                return false;
            }

            // 2. Create Items (as placeholder if possible)
            if (orderData.items && orderData.items.length > 0) {
                const itemsPayload = orderData.items.map(item => ({
                    order_id: order.id,
                    quantity: item.quantity || 1,
                    price_at_time: item.price || 0
                    // product_id is null, assuming nullable
                }));

                const { error: itemsError } = await window.supabase.from('order_items').insert(itemsPayload);
                if (itemsError) console.warn("Manual Order: Could not save items (likely FK constraint)", itemsError);
            }

            return true;
        } catch (e) {
            console.error("Manual Order Exception:", e);
            return false;
        }
    }
};

window.OrderManager = OrderManager;
