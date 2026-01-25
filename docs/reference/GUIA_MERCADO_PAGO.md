# 💳 Guia de Integração Mercado Pago

## 📋 O Que Você Vai Fazer

Integrar pagamentos reais via PIX, Cartão de Crédito e Boleto usando o Mercado Pago.

---

## 🎯 Passo 1: Criar Conta no Mercado Pago

### 1.1 Acesse e Cadastre-se
- **URL:** https://www.mercadopago.com.br/developers
- Clique em **"Criar sua conta"**
- Use email: `marcaviva104@gmail.com` (ou outro)
- Complete o cadastro

### 1.2 Ativar Modo Desenvolvedor
- Após login, vá em **"Suas integrações"**
- Clique em **"Criar aplicação"**
- Nome da aplicação: `Marca Viva E-commerce`
- Modelo de negócio: **E-commerce**

---

## 🔑 Passo 2: Obter Credenciais

### 2.1 Acessar Credenciais
- Menu lateral: **"Suas integrações"** → **"Credenciais"**
- Você verá 2 modos:
  - **Teste** (para desenvolvimento) ✅
  - **Produção** (para vendas reais) ⚠️

### 2.2 Copiar Public Key de TESTE
```
Exemplo:
TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

⚠️ **IMPORTANTE:** Use credenciais de **TESTE** primeiro!

---

## ⚙️ Passo 3: Configurar no Site

### 3.1 Abrir arquivo `config.js`
**Caminho:** `scripts/config.js`

### 3.2 Adicionar a Chave
```javascript
// === MERCADO PAGO ===
const MP_PUBLIC_KEY = 'TEST-sua-chave-aqui';
```

**Exemplo completo:**
```javascript
// scripts/config.js

// === SUPABASE ===
const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'eyJhbGci...'; // Sua chave atual

// === MERCADO PAGO ===
const MP_PUBLIC_KEY = 'TEST-12345678-abcd-1234-abcd-123456789abc';

// Exportar (se necessário)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_URL, SUPABASE_KEY, MP_PUBLIC_KEY };
}
```

---

## 🧪 Passo 4: Testar Pagamento com Cartão

### 4.1 Dados de Teste Oficiais

**Cartões de Teste - APROVADO:**
```
Número: 5031 4332 1540 6351
Nome: APRO
CVV: 123
Vencimento: 11/25
CPF: 12345678909
```

**Cartões de Teste - RECUSADO:**
```
Número: 5031 4332 1540 6351
Nome: OTHE
CVV: 123
Vencimento: 11/25
```

**Mais cartões:** https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/test-cards

### 4.2 Fluxo de Teste
1. **Adicione** produto ao carrinho
2. **Vá** para checkout
3. **Selecione** "Cartão de Crédito"
4. **Preencha** com dados de teste
5. **Finalize** o pedido
6. ✅ Deve aprovar instantaneamente!

---

## 💰 Passo 5: Ir para Produção (VENDAS REAIS)

### 5.1 Cumprir Requisitos
- ✅ Ter CNPJ ou CPF cadastrado
- ✅ Conta bancária vinculada
- ✅ Testes bem-sucedidos

### 5.2 Ativar Credenciais de Produção
1. Menu **"Credenciais"** → Aba **"Produção"**
2. Clique em **"Ativar credenciais de produção"**
3. Mercado Pago validará sua conta (pode levar algumas horas)

### 5.3 Substituir Chave no Site
```javascript
// Trocar de TEST para produção
const MP_PUBLIC_KEY = 'APP-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

⚠️ **ATENÇÃO:** 
- Credenciais de **produção** processam pagamentos REAIS
- Dinheiro vai para sua conta Mercado Pago
- Taxas são cobradas (~3.99% + R$ 0,40)

---

## 📊 Taxas do Mercado Pago

| Método | Taxa |
|---|---|
| **PIX** | 0,99% |
| **Cartão de Débito** | 3,79% + R$ 0,40 |
| **Cartão de Crédito** | 3,99% + R$ 0,40 |
| **Boleto** | R$ 3,49 fixo |

**Prazo de recebimento:** 
- PIX: 1 dia útil
- Cartão: 14 dias (pode antecipar com taxa)

---

## 🔒 Segurança

### ✅ Boas Práticas
- **Nunca** exponha credenciais no GitHub/repositórios públicos
- Use **variáveis de ambiente** em produção
- Mantenha **HTTPS** ativo no domínio
- Valide **sempre no backend** (servidor)

### 🛡️ Dados Sensíveis
O Mercado Pago SDK:
- ✅ Criptografa dados do cartão
- ✅ Tokeniza informações
- ✅ Nunca expõe CVV/número completo
- ✅ PCI Compliance certificado

**Você NÃO armazena dados financeiros!**

---

## 🚀 Recursos Extras

### Webhooks (Notificações Automáticas)
Receba avisos quando pagamento for aprovado/recusado:

```javascript
// No Mercado Pago Dashboard:
// Configurações → Notificações → Webhook URL
https://seu-site.com/api/webhook/mercadopago
```

### Split de Pagamento
Para marketplace com múltiplos vendedores:
- https://www.mercadopago.com.br/developers/pt/docs/split-payments

### QR Code PIX Dinâmico
Gerar QR com valor e informações:
```javascript
// Já implementado no checkout-service.js
// Basta ativar com credenciais reais
```

---

## 📞 Suporte

**Documentação Oficial:**
- SDK JavaScript: https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/landing
- API Reference: https://www.mercadopago.com.br/developers/pt/reference

**Comunidade:**
- Forum: https://www.mercadopago.com.br/developers/pt/support

**Contato Direto:**
- Email: developers@mercadopago.com
- WhatsApp Business: (11) 4935-1200

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] Conta Mercado Pago ativada
- [ ] Credenciais de TESTE configuradas
- [ ] Testado checkout com cartão de teste
- [ ] Testado PIX em ambiente de teste
- [ ] Validado salvamento de pedidos no Supabase
- [ ] HTTPS configurado no domínio
- [ ] Credenciais de PRODUÇÃO obtidas
- [ ] Conta bancária vinculada
- [ ] Termos de uso e política de privacidade publicados

---

## 🎉 Pronto!

Após seguir todos os passos, seu site estará processando pagamentos reais via Mercado Pago!

**Começar pelo ambiente de TESTE é obrigatório e seguro.** ✅
