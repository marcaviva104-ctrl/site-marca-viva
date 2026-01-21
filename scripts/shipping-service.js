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
     * Calcular frete (simulado - implementar API real em produção)
     * Para produção, usar Melhor Envio, Correios, ou outro provedor
     */
    async calculateShipping(cep, cartItems) {
        try {
            // Simular delay de API
            await new Promise(r => setTimeout(r, 1000));

            // Calcular peso total (estimativa)
            const totalWeight = cartItems.reduce((sum, item) => {
                const weight = item.weight || 0.5; // kg
                return sum + (weight * item.quantity);
            }, 0);

            // Simular opções de frete
            const options = [
                {
                    id: 'pac',
                    name: 'PAC - Correios',
                    price: this.calculateFakePrice(totalWeight, 1.2),
                    deadline: Math.ceil(5 + Math.random() * 5), // 5-10 dias
                    company: 'Correios'
                },
                {
                    id: 'sedex',
                    name: 'SEDEX - Correios',
                    price: this.calculateFakePrice(totalWeight, 2.5),
                    deadline: Math.ceil(2 + Math.random() * 3), // 2-5 dias
                    company: 'Correios'
                }
            ];

            // Se for na mesma cidade (simulado), adicionar opção de entrega rápida
            if (Math.random() > 0.7) {
                options.push({
                    id: 'express',
                    name: 'Entrega Expressa',
                    price: this.calculateFakePrice(totalWeight, 3.5),
                    deadline: 1, // 24h
                    company: 'Transportadora'
                });
            }

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
     * Calcular frete REAL com Melhor Envio API
     * Para ativar: adicione o token em config.js
     */
    async calculateShippingReal(destinationCEP, cartItems) {
        try {
            // Verificar se tem token configurado
            if (!window.MELHOR_ENVIO_TOKEN || window.MELHOR_ENVIO_TOKEN === '') {
                console.warn('⚠️ Token Melhor Envio não configurado, usando cálculo simulado');
                return this.calculateShipping(destinationCEP, cartItems);
            }

            console.log('📦 Calculando frete real com Melhor Envio...');

            // Calcular peso total do carrinho
            const totalWeight = cartItems.reduce((sum, item) => {
                const weight = item.weight || 0.5; // default 500g = 0.5kg
                const quantity = item.quantity || item.qty || 1;
                return sum + (weight * quantity);
            }, 0);

            // Calcular dimensões do pacote (usar maior dimensão de cada eixo)
            let maxHeight = 0;
            let maxWidth = 0;
            let maxLength = 0;

            cartItems.forEach(item => {
                const height = item.height || 10; // cm
                const width = item.width || 20;   // cm
                const length = item.length || 30; // cm

                if (height > maxHeight) maxHeight = height;
                if (width > maxWidth) maxWidth = width;
                if (length > maxLength) maxLength = length;
            });

            // Preparar dados do pacote
            const packageData = {
                from: {
                    postal_code: (window.MELHOR_ENVIO_FROM_CEP || '01310100').replace(/\D/g, '')
                },
                to: {
                    postal_code: destinationCEP.replace(/\D/g, '')
                },
                package: {
                    height: Math.round(maxHeight),  // cm
                    width: Math.round(maxWidth),    // cm
                    length: Math.round(maxLength),  // cm
                    weight: totalWeight // kg
                }
            };

            // Determinar URL (sandbox ou produção)
            const isSandbox = window.MELHOR_ENVIO_TOKEN.includes('sandbox') ||
                window.MELHOR_ENVIO_TOKEN.length < 100;
            const apiUrl = isSandbox
                ? 'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate'
                : 'https://melhorenvio.com.br/api/v2/me/shipment/calculate';

            // Chamar API do Melhor Envio
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.MELHOR_ENVIO_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Marca Viva (contato@marcaviva.com)'
                },
                body: JSON.stringify(packageData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Erro na API Melhor Envio:', errorData);
                throw new Error(`API retornou ${response.status}`);
            }

            const data = await response.json();

            // Verificar se retornou opções
            if (!data || data.length === 0) {
                console.warn('Melhor Envio não retornou opções, usando simulação');
                return this.calculateShipping(destinationCEP, cartItems);
            }

            // Formatar opções de frete
            const options = data
                .filter(item => item.error === null || !item.error) // Filtrar erros
                .map(item => ({
                    id: item.id || item.company.name.toLowerCase(),
                    name: `${item.name} - ${item.company.name}`,
                    price: parseFloat(item.price || item.custom_price || 0),
                    deadline: parseInt(item.delivery_time || item.custom_delivery_time || 5),
                    company: item.company.name,
                    logo: item.company.picture || null
                }));

            if (options.length === 0) {
                console.warn('Nenhuma opção válida, usando simulação');
                return this.calculateShipping(destinationCEP, cartItems);
            }

            console.log(`✅ ${options.length} opções de frete encontradas!`);

            return {
                success: true,
                options: options.sort((a, b) => a.deadline - b.deadline),
                source: 'melhor-envio'
            };

        } catch (error) {
            console.error('❌ Erro ao calcular frete real:', error);
            console.log('🔄 Fallback para cálculo simulado');

            // Fallback: retornar simulação se API falhar
            const simulated = await this.calculateShipping(destinationCEP, cartItems);
            return {
                ...simulated,
                source: 'simulated',
                warning: 'Frete calculado de forma aproximada'
            };
        }
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
