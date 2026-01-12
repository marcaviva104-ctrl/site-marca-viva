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

        const { data, error } = await window.supabase
            .from('orders')
            .select(`
                *,
                order_items (
                    *,
                    product:products(name, image)
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching user orders:", error);
            return [];
        }

        // Map to expected format if needed
        return data.map(o => ({
            id: o.id,
            date: o.created_at,
            total: Number(o.total),
            status: o.status,
            items: o.order_items.map(i => ({
                quantity: i.quantity,
                price: Number(i.price_at_time),
                name: i.product?.name || 'Produto',
                image: i.product?.image
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
    }
};

window.OrderManager = OrderManager;
