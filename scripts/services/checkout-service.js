/**
 * Checkout Service - Marca Viva
 * Gerencia o fluxo de checkout multi-step
 */

class CheckoutService {
    constructor() {
        this.state = {
            step: 1,
            maxStep: 1,
            cart: [],
            address: null,
            shipping: null,
            payment: null,
            order: null
        };

        this.loadState();
    }

    /**
     * Carregar estado do localStorage
     */
    loadState() {
        try {
            const saved = localStorage.getItem('mv_checkout_state');
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('Erro ao carregar estado do checkout:', e);
        }
    }

    /**
     * Salvar estado no localStorage
     */
    saveState() {
        try {
            localStorage.setItem('mv_checkout_state', JSON.stringify(this.state));
        } catch (e) {
            console.error('Erro ao salvar estado do checkout:', e);
        }
    }

    /**
     * Ir para próxima etapa
     */
    nextStep() {
        if (this.state.step < 4) {
            this.state.step++;
            if (this.state.step > this.state.maxStep) {
                this.state.maxStep = this.state.step;
            }
            this.saveState();
            return true;
        }
        return false;
    }

    /**
     * Voltar para etapa anterior
     */
    prevStep() {
        if (this.state.step > 1) {
            this.state.step--;
            this.saveState();
            return true;
        }
        return false;
    }

    /**
     * Ir para etapa específica (só se já visitada)
     */
    goToStep(step) {
        if (step >= 1 && step <= this.state.maxStep) {
            this.state.step = step;
            this.saveState();
            return true;
        }
        return false;
    }

    /**
     * Definir endereço
     */
    setAddress(address) {
        this.state.address = address;
        this.saveState();
    }

    /**
     * Definir método de envio
     */
    setShipping(shipping) {
        this.state.shipping = shipping;
        this.saveState();
    }

    /**
     * Definir pagamento
     */
    setPayment(payment) {
        this.state.payment = payment;
        this.saveState();
    }

    /**
     * Calcular total
     */
    calculateTotal() {
        const cart = window.cartService ? window.cartService.getItems() : [];
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = this.state.shipping ? this.state.shipping.price : 0;
        const discount = 0; // implementar cupons depois

        return {
            subtotal,
            shipping,
            discount,
            total: subtotal + shipping - discount
        };
    }

    /**
     * Finalizar pedido
     */
    async finishOrder() {
        try {
            const cart = window.cartService ? window.cartService.getItems() : [];

            if (cart.length === 0) {
                throw new Error('Carrinho vazio');
            }

            if (!this.state.address) {
                throw new Error('Endereço não definido');
            }

            if (!this.state.shipping) {
                throw new Error('Método de envio não selecionado');
            }

            if (!this.state.payment) {
                throw new Error('Método de pagamento não selecionado');
            }

            const user = window.authService ? window.authService.getCurrentUser() : null;
            const totals = this.calculateTotal();

            const orderData = {
                user_id: user ? user.id : null,
                items: cart,
                subtotal: totals.subtotal,
                shipping_address: this.state.address,
                shipping_method: this.state.shipping.name,
                shipping_cost: this.state.shipping.price,
                shipping_deadline: this.state.shipping.deadline,
                payment_method: this.state.payment.method,
                payment_status: 'pending',
                payment_data: this.state.payment.data || {},
                total: totals.total,
                status: 'pending'
            };

            // Salvar no Supabase via protocols
            let orderId = null;
            if (window.supabase) {
                const year = new Date().getFullYear();
                const random = Math.floor(1000 + Math.random() * 9000);
                const reqId = `#REQ-${random}`;

                // Admin bypass UUID não pode ser FK
                const ADMIN_BYPASS = '00000000-0000-0000-0000-000000000000';
                const safeUserId = (orderData.user_id && orderData.user_id !== ADMIN_BYPASS) ? orderData.user_id : null;

                const { data, error } = await window.supabase
                    .from('protocols')
                    .insert([{
                        id: reqId,
                        client_id: safeUserId,
                        client_email: user ? user.email : null,
                        client_name: user ? user.name : null,
                        total_amount: orderData.total,
                        status: 'inquiry',
                        payment_status: 'pending',
                        column_id: 1,
                        notes: `Frete: ${orderData.shipping_method || 'N/A'} - R$ ${orderData.shipping_cost || 0}`
                    }])
                    .select()
                    .single();

                if (error) {
                    console.error('Erro ao salvar pedido no banco:', error);
                    throw new Error('Erro ao processar pedido');
                }

                orderId = data.id;
                this.state.order = data;
            } else {
                // Fallback: gerar ID local
                orderId = 'LOCAL-' + Date.now();
                this.state.order = {
                    ...orderData,
                    id: orderId,
                    order_number: 'MV-' + Date.now(),
                    created_at: new Date().toISOString()
                };
            }

            // Limpar carrinho
            if (window.cartService) {
                window.cartService.clear();
            }

            // Salvar estado
            this.saveState();

            return {
                success: true,
                order: this.state.order
            };

        } catch (error) {
            console.error('Erro ao finalizar pedido:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Resetar checkout
     */
    reset() {
        this.state = {
            step: 1,
            maxStep: 1,
            cart: [],
            address: null,
            shipping: null,
            payment: null,
            order: null
        };
        localStorage.removeItem('mv_checkout_state');
    }

    /**
     * Obter estado atual
     */
    getState() {
        return { ...this.state };
    }
}

// Criar instância global
const checkoutService = new CheckoutService();
window.checkoutService = checkoutService;
