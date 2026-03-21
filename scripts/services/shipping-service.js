/**
 * Shipping Service - Marca Viva
 * Integração com APIs de frete e busca de CEP
 */

class ShippingService {
    constructor() {
        this.viacepUrl = 'https://viacep.com.br/ws';
    }

    /**
     * Buscar endereço por CEP usando ViaCEP
     */
    async searchCEP(cep) {
        try {
            // Remover formatação do CEP
            const cleanCEP = cep.replace(/\D/g, '');

            if (cleanCEP.length !== 8) {
                throw new Error('CEP deve ter 8 dígitos');
            }

            const response = await fetch(`${this.viacepUrl}/${cleanCEP}/json/`);

            if (!response.ok) {
                throw new Error('Erro ao buscar CEP');
            }

            const data = await response.json();

            if (data.erro) {
                throw new Error('CEP não encontrado');
            }

            return {
                success: true,
                address: {
                    cep: data.cep,
                    street: data.logradouro,
                    neighborhood: data.bairro,
                    city: data.localidade,
                    state: data.uf,
                    complement: data.complemento
                }
            };

        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Calcular frete (Simplificado: Fixo, Grátis, Retirada)
     */
    async calculateShipping(cep, cartItems) {
        try {
            // Simular delay de API
            await new Promise(r => setTimeout(r, 800));

            const options = [
                {
                    id: 'fixed',
                    name: 'Frete Fixo',
                    price: 20.00,
                    deadline: 5, // 5 dias
                    company: 'Correios / Transportadora'
                },
                {
                    id: 'free',
                    name: 'Frete Grátis',
                    price: 0.00,
                    deadline: 8, // 8 dias
                    company: 'Correios / Transportadora'
                },
                {
                    id: 'pickup',
                    name: 'Retirada na Loja',
                    price: 0.00,
                    deadline: 1, // 1 dia
                    company: 'Loja Física'
                }
            ];

            return {
                success: true,
                options: options.sort((a, b) => a.deadline - b.deadline)
            };

        } catch (error) {
            console.error('Erro ao calcular frete:', error);
            return {
                success: false,
                error: error.message,
                options: []
            };
        }
    }

    /**
     * Calcular preço simulado baseado em peso
     */
    calculateFakePrice(weight, multiplier) {
        const basePrice = 15;
        const pricePerKg = 5;
        return Number((basePrice + (weight * pricePerKg * multiplier)).toFixed(2));
    }

    /**
     * Formatar CEP
     */
    formatCEP(cep) {
        const clean = cep.replace(/\D/g, '');
        if (clean.length === 8) {
            return `${clean.substring(0, 5)}-${clean.substring(5)}`;
        }
        return cep;
    }

    /**
     * Validar CEP
     */
    isValidCEP(cep) {
        const clean = cep.replace(/\D/g, '');
        return clean.length === 8;
    }

    /**
     * Redirecionar chamada da API para o cálculo simplificado local
     */
    async calculateShippingReal(destinationCEP, cartItems) {
        // Redireciona para o método simplificado conforme requisição
        return this.calculateShipping(destinationCEP, cartItems);
    }

    /**
     * ✨ Calcular tempo de produção (REGRA SIMPLES)
     * Até 300 unidades: Até 7 dias úteis após aprovação da arte
     * Acima de 300: Entre em contato
     */
    calculateProductionTime(cartItems) {
        try {
            // Calcular quantidade total do pedido
            const totalQuantity = cartItems.reduce((sum, item) => {
                return sum + parseInt(item.qty || item.quantity || 1);
            }, 0);

            // Regra de negócio
            if (totalQuantity <= 300) {
                return {
                    days: 7,
                    message: "Até 7 dias úteis após aprovação da arte"
                };
            } else {
                return {
                    days: null,
                    message: "Entre em contato para prazo personalizado",
                    needsContact: true
                };
            }

        } catch (error) {
            console.error('Erro ao calcular tempo de produção:', error);
            return {
                days: 7,
                message: "Até 7 dias úteis após aprovação da arte"
            };
        }
    }

    /**
     * ✨ Adicionar tempo de produção ao frete
     */
    addProductionTimeToShipping(cartItems, shippingOptions) {
        const production = this.calculateProductionTime(cartItems);

        // Se precisa contato, não mostra opções de frete
        if (production.needsContact) {
            return [{
                id: 'contact',
                name: 'Pedido Especial',
                price: 0,
                deadline: 0,
                productionMessage: production.message,
                needsContact: true
            }];
        }

        // Adiciona produção ao prazo de entrega
        return shippingOptions.map(option => ({
            ...option,
            productionDays: production.days,
            productionMessage: production.message,
            shippingDays: option.deadline,
            totalDeadline: production.days + option.deadline
        }));
    }
}

// IMPORTANTE: Em produção, substituir por API real
// Recomendações:
// 1. Melhor Envio: https://melhorenvio.com.br/docs/
// 2. Correios: https://www.correios.com.br/atendimento/developers
// 3. Frete Rápido: https://www.freterapido.com/

// Criar instância global
const shippingService = new ShippingService();
window.shippingService = shippingService;
