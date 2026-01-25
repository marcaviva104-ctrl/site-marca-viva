# 🚚 Guia de Integração - Melhor Envio (Frete Real)

## 📋 O QUE É O MELHOR ENVIO?

API que calcula frete real de múltiplas transportadoras:
- ✅ Correios (PAC, SEDEX)
- ✅ Jadlog
- ✅ Azul Cargo
- ✅ Latam Cargo
- ✅ E muitas outras!

**Preço:** Gratuito para cálculo (paga só quando envia)

---

## 🎯 PASSO 1: CRIAR CONTA

### 1.1 Acesse:
```
https://melhorenvio.com.br
```

### 1.2 Clique em:
- "Criar conta grátis"
- Ou "Cadastre-se"

### 1.3 Preencha:
- Nome
- Email: `marcaviva104@gmail.com`
- CNPJ ou CPF
- Telefone
- Senha

### 1.4 Confirme o email
- Abra o email de confirmação
- Clique no link

---

## 🔑 PASSO 2: OBTER TOKEN DA API

### 2.1 Acesse o Painel:
```
https://melhorenvio.com.br/painel/gerenciar/tokens
```

### 2.2 Criar Aplicação:
1. Clique em **"Criar aplicação"**
2. Preencha:
   - **Nome:** Marca Viva E-commerce
   - **Redirect URI:** `http://localhost:5500/callback` (por enquanto)
   - **Ambiente:** Sandbox (teste)

### 2.3 Gerar Token:
1. Copie o **Client ID**
2. Copie o **Client Secret**
3. Gere um **Access Token** de teste

**Formato do token:**
```
eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...
```

---

## ⚙️ PASSO 3: CONFIGURAR NO CÓDIGO

### 3.1 Abrir `scripts/config.js`

Adicionar:
```javascript
// === MELHOR ENVIO ===
const MELHOR_ENVIO_TOKEN = 'seu-token-aqui';
const MELHOR_ENVIO_FROM_CEP = '01310-100'; // CEP da sua empresa
```

### 3.2 Criar nova função em `shipping-service.js`

Adicione após a linha 142:

```javascript
/**
 * Calcular frete REAL com Melhor Envio
 */
async calculateShippingReal(destinationCEP, cartItems) {
    try {
        // Verificar se tem token
        if (!window.MELHOR_ENVIO_TOKEN) {
            console.warn('Token Melhor Envio não configurado, usando simulação');
            return this.calculateShipping(destinationCEP, cartItems);
        }

        // Preparar pacote
        const totalWeight = cartItems.reduce((sum, item) => {
            const weight = item.weight || 0.5;
            return sum + (weight * (item.quantity || item.qty || 1));
        }, 0);

        // Dimensões padrão (ajustar conforme seus produtos)
        const packageData = {
            from: {
                postal_code: window.MELHOR_ENVIO_FROM_CEP || '01310100'
            },
            to: {
                postal_code: destinationCEP.replace(/\D/g, '')
            },
            package: {
                height: 10, // cm
                width: 20,  // cm
                length: 30, // cm
                weight: totalWeight // kg
            }
        };

        // Chamar API
        const response = await fetch('https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${window.MELHOR_ENVIO_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(packageData)
        });

        if (!response.ok) {
            throw new Error('Erro ao calcular frete');
        }

        const data = await response.json();

        // Formatar resposta
        const options = data.map(item => ({
            id: item.company.name.toLowerCase(),
            name: `${item.name} - ${item.company.name}`,
            price: parseFloat(item.price),
            deadline: item.delivery_time,
            company: item.company.name
        }));

        return {
            success: true,
            options: options.sort((a, b) => a.deadline - b.deadline)
        };

    } catch (error) {
        console.error('Erro ao calcular frete real:', error);
        
        // Fallback para simulação
        return this.calculateShipping(destinationCEP, cartItems);
    }
}
```

### 3.3 Atualizar chamada no checkout

Em `scripts/checkout.js` ou onde chama `calculateShipping`, trocar para:

```javascript
// Antes:
const freight = await shippingService.calculateShipping(cep, cart);

// Depois:
const freight = await shippingService.calculateShippingReal(cep, cart);
```

---

## 🧪 PASSO 4: TESTAR

### 4.1 Use CEPs de teste:

**CEO de Origem (sua empresa):**
```
01310-100 (Avenida Paulista, SP)
```

**CEPs de destino para teste:**
```
20040-020 (Rio de Janeiro - RJ)
30130-100 (Belo Horizonte - MG)
70040-020 (Brasília - DF)
```

### 4.2 Testar no checkout:
1. Adicione produto
2. Vá para checkout
3. Preencha CEP de destino
4. **Observe as opções de frete reais!**

---

## 💰 PASSO 5: IR PARA PRODUÇÃO

### 5.1 Ativar Conta Real:
1. Painel Melhor Envio
2. Completar cadastro da empresa
3. Adicionar cartão de crédito (para pagamento)
4. Solicitar ativação

### 5.2 Gerar Token de Produção:
1. Criar nova aplicação (ambiente: **Produção**)
2. Gerar novo token
3. Substituir no `config.js`

### 5.3 Trocar URL:
```javascript
// Sandbox (teste)
https://sandbox.melhorenvio.com.br/api/v2/...

// Produção
https://melhorenvio.com.br/api/v2/...
```

---

## 📊 FUNCIONALIDADES EXTRAS

### Rastreamento de Pedidos:
```javascript
async trackShipment(trackingCode) {
    const response = await fetch(
        `https://melhorenvio.com.br/api/v2/me/shipment/tracking/${trackingCode}`,
        {
            headers: {
                'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`
            }
        }
    );
    return await response.json();
}
```

### Gerar Etiqueta:
```javascript
async generateLabel(orderId) {
    const response = await fetch(
        `https://melhorenvio.com.br/api/v2/me/shipment/generate`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MELHOR_ENVIO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orders: [orderId] })
        }
    );
    return await response.json();
}
```

---

## 💡 DIFERENÇAS SANDBOX vs PRODUÇÃO

| Item | Sandbox | Produção |
|---|---|---|
| **URL** | sandbox.melhorenvio.com.br | melhorenvio.com.br |
| **Token** | Token de teste | Token real |
| **Preços** | Simulados | Reais |
| **Envio** | Não envia | Envia de verdade |
| **Cobrança** | Grátis | Cobrado |

---

## 📋 CHECKLIST DE INTEGRAÇÃO

- [ ] Conta criada no Melhor Envio
- [ ] Token gerado (sandbox)
- [ ] Token adicionado em `config.js`
- [ ] CEP de origem configurado
- [ ] Função `calculateShippingReal` adicionada
- [ ] Checkout atualizado para usar nova função
- [ ] Testado com CEPs reais
- [ ] Valores conferidos
- [ ] Produção (depois):
  - [ ] Token de produção
  - [ ] URL trocada
  - [ ] Testado em ambiente real

---

## ⚠️ IMPORTANTE

### Custos:
- **Cálculo:** GRATUITO
- **Envio:** Paga quando despachar
- **Taxa:** ~3-5% sobre o frete

### Dimensões:
Ajuste na função `calculateShippingReal`:
- `height`, `width`, `length` (em cm)
- `weight` (em kg)

### CEP de Origem:
Configure o CEP da sua empresa! É obrigatório.

---

## 🔗 LINKS ÚTEIS

**Documentação Oficial:**
- https://docs.melhorenvio.com.br

**Painel:**
- https://melhorenvio.com.br/painel

**Calculadora (testar manual):**
- https://melhorenvio.com.br/calcular-frete

**Suporte:**
- WhatsApp: (11) 98765-4321
- Email: suporte@melhorenvio.com.br

---

## ✅ PRÓXIMOS PASSOS

1. Criar conta no Melhor Envio
2. Gerar token de teste
3. Adicionar no código
4. Testar!

**Quer que eu te ajude a adicionar o código agora?** 🚀
