/**
 * Shipping Service - Marca Viva
 * Integração com APIs de frete e busca de CEP
 */

class ShippingService {
    constructor() {
        this.viacepUrl = 'https://viacep.com.br/ws';
        this.currentSelection = null; // opção de frete escolhida no checkout (ver setSelection/getSelection)
    }

    /** Guarda a opção de frete escolhida pelo cliente (uma das retornadas por calculateShipping). */
    setSelection(option) {
        this.currentSelection = option || null;
    }

    getSelection() {
        return this.currentSelection;
    }

    clearSelection() {
        this.currentSelection = null;
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
     * Le as configuracoes da loja (aba Configuracoes > Frete & Entrega).
     * Guarda em cache para nao consultar o banco a cada clique.
     */
    async getStoreSettings() {
        if (this._settingsCache) return this._settingsCache;

        try {
            if (window.SettingsService) {
                const settings = await window.SettingsService.getGlobalSettings();
                if (settings) {
                    this._settingsCache = settings;
                    return settings;
                }
            }
        } catch (error) {
            console.warn('Frete: nao consegui ler as configuracoes da loja.', error);
        }

        return {};
    }

    /** Soma o valor dos itens do carrinho (aceita numero ou texto "R$ 1.234,56"). */
    getCartSubtotal(cartItems) {
        if (!Array.isArray(cartItems)) return 0;

        return cartItems.reduce((soma, item) => {
            let preco = item.price;
            if (typeof preco !== 'number') {
                preco = parseFloat(String(preco || '').replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
            }
            return soma + (preco * (Number(item.qty) || 1));
        }, 0);
    }

    /**
     * Calcular frete a partir do que o lojista configurou no painel.
     *
     * Antes os valores estavam escritos no codigo (R$ 20 fixo) e o
     * "Frete Gratis" aparecia SEMPRE, ao lado do fixo — entao nenhum
     * cliente escolhia pagar. Agora:
     *   - Frete Fixo aparece se houver valor configurado
     *   - Frete Gratis so aparece se o pedido atingir o minimo configurado
     *   - Retirada aparece se estiver ligada
     */
    async calculateShipping(cep, cartItems) {
        try {
            const settings = await this.getStoreSettings();

            const valorFixo     = Math.max(0, Number(settings.shippingCost) || 0);
            const minimoGratis  = Math.max(0, Number(settings.freeShippingThreshold) || 0);
            const retiradaAtiva = settings.pickupActive !== false; // padrao: ligada
            const subtotal      = this.getCartSubtotal(cartItems);

            const options = [];

            if (valorFixo > 0) {
                options.push({
                    id: 'fixed',
                    name: 'Frete Fixo',
                    price: valorFixo,
                    deadline: 5,
                    company: 'Correios / Transportadora'
                });
            }

            // Gratis a partir do minimo. Se nada foi configurado (minimo 0 e
            // sem valor fixo), o frete sai gratis - que e o comportamento atual.
            const temMinimoAtingido = minimoGratis > 0 && subtotal >= minimoGratis;
            const nadaConfigurado   = minimoGratis === 0 && valorFixo === 0;

            if (temMinimoAtingido || nadaConfigurado) {
                options.push({
                    id: 'free',
                    name: 'Frete Grátis',
                    price: 0.00,
                    deadline: 8,
                    company: 'Correios / Transportadora'
                });
            }

            if (retiradaAtiva) {
                options.push({
                    id: 'pickup',
                    name: 'Retirada na Loja',
                    price: 0.00,
                    deadline: 1,
                    company: 'Loja Física'
                });
            }

            // Nunca deixar o cliente sem nenhuma opcao
            if (options.length === 0) {
                options.push({
                    id: 'combinar',
                    name: 'Frete a combinar',
                    price: 0.00,
                    deadline: 7,
                    company: 'Combinamos no WhatsApp'
                });
            }

            return {
                success: true,
                options: options.sort((a, b) => a.deadline - b.deadline),
                // ajuda o checkout a avisar "faltam R$ X para frete gratis"
                freeShippingThreshold: minimoGratis,
                subtotal: subtotal
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
