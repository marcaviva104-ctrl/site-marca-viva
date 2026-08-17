// ================================================
// Coupon Service - Marca Viva
// ================================================
// Sistema de validação e aplicação de cupons
// ================================================

const CouponService = {
    currentCoupon: null,

    // Validar cupom
    async validate(code, orderValue) {
        try {
            if (!code || code.trim() === '') {
                return {
                    valid: false,
                    message: 'Digite um código de cupom'
                };
            }

            // Pegar usuário atual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                return {
                    valid: false,
                    message: 'Faça login para usar cupons'
                };
            }

            // Chamar função de validação do banco
            const { data, error } = await supabase.rpc('validate_coupon', {
                p_code: code.toUpperCase().trim(),
                p_user_id: user.id,
                p_order_value: orderValue
            });

            if (error) {
                console.error('Erro ao validar cupom:', error);
                return {
                    valid: false,
                    message: 'Erro ao validar cupom'
                };
            }

            if (!data.valid) {
                return {
                    valid: false,
                    message: data.message
                };
            }

            // Cupom válido - calcular desconto
            const coupon = data.coupon;
            const discount = this.calculateDiscount(coupon, orderValue);

            this.currentCoupon = {
                ...coupon,
                discount_amount: discount
            };

            return {
                valid: true,
                message: '✅ Cupom aplicado com sucesso!',
                coupon: this.currentCoupon,
                discount: discount
            };

        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            return {
                valid: false,
                message: 'Erro ao processar cupom'
            };
        }
    },

    // Calcular desconto
    calculateDiscount(coupon, orderValue) {
        let discount = 0;

        switch (coupon.discount_type) {
            case 'percentage':
                discount = (orderValue * coupon.discount_value) / 100;
                // Aplicar desconto máximo se existir.
                // Coluna real em `coupons` é `max_discount` (ver add_coupons.sql) —
                // `max_discount_value` só existe numa migration legada não usada;
                // sem essa correção o teto nunca era aplicado.
                if (coupon.max_discount && discount > coupon.max_discount) {
                    discount = coupon.max_discount;
                }
                break;

            case 'fixed':
                discount = coupon.discount_value;
                // Desconto não pode ser maior que o valor do pedido
                if (discount > orderValue) {
                    discount = orderValue;
                }
                break;

            case 'free_shipping':
                // Retorna 0 aqui, o desconto do frete será aplicado no checkout
                discount = 0;
                break;
        }

        return parseFloat(discount.toFixed(2));
    },

    // Registrar uso do cupom
    async registerUsage(couponId, orderId, discountAmount) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // Grava o uso e incrementa o contador numa operacao so.
            // (Antes isso era feito em duas etapas, e o incremento usava
            //  supabase.sql`...`, que nao existe na v2 da biblioteca —
            //  o contador nunca era atualizado.)
            const { error: rpcError } = await supabase.rpc('register_coupon_usage', {
                p_coupon_id: couponId,
                p_user_id: user.id,
                p_order_id: orderId,
                p_discount_amount: discountAmount
            });

            if (rpcError) {
                console.error('Erro ao registrar uso do cupom:', rpcError);
                return false;
            }

            return true;

        } catch (error) {
            console.error('Erro ao registrar uso de cupom:', error);
            return false;
        }
    },

    // Limpar cupom aplicado
    clear() {
        this.currentCoupon = null;
    },

    // Obter cupom atual
    getCurrent() {
        return this.currentCoupon;
    },

    // Verificar se tem frete grátis
    hasFreeShipping() {
        return this.currentCoupon && this.currentCoupon.discount_type === 'free_shipping';
    },

    // Formatar desconto para exibição
    formatDiscount(coupon) {
        if (!coupon) return '';

        switch (coupon.discount_type) {
            case 'percentage':
                return `${coupon.discount_value}% OFF`;
            case 'fixed':
                return `R$ ${coupon.discount_value.toFixed(2)} OFF`;
            case 'free_shipping':
                return 'FRETE GRÁTIS';
            default:
                return '';
        }
    },

    // Admin: Listar todos cupons
    async getAllCoupons() {
        try {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                data: data
            };

        } catch (error) {
            console.error('Erro ao buscar cupons:', error);
            return {
                success: false,
                message: error.message
            };
        }
    }
};

// Exportar globalmente
window.CouponService = CouponService;
