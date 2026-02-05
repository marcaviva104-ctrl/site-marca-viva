# 🚀 Checklist de Pré-Lançamento: Site Pronto para Vendas

**Data:** 04/02/2026  
**Status do Site:** https://site-marca-viva.vercel.app (JÁ NO AR!)

---

## ✅ O QUE JÁ ESTÁ FUNCIONANDO

### 1. **Site no Ar** 🌐
✅ URL: https://site-marca-viva.vercel.app  
✅ Deploy automático via Vercel  
✅ Hospedagem gratuita

### 2. **Banco de Dados** 💾
✅ Supabase configurado e conectado  
✅ Tabelas criadas (products, orders, users, etc.)  
✅ Autenticação funcionando

### 3. **Funcionalidades Core** 🛒
✅ Catálogo de produtos  
✅ Carrinho de compras  
✅ Sistema de login/cadastro  
✅ Painel admin (recém estabilizado!)

---

## ⚠️ O QUE FALTA PARA VENDAS REAIS

### 🔴 CRÍTICO (Obrigatório para vender)

#### 1. **Mudar Mercado Pago de TESTE para PRODUÇÃO**
**Status:** ⚠️ **EM MODO TESTE**

**Arquivo:** `scripts/config/config.js` (linha 35)
```javascript
// ❌ TESTE (atual)
const MP_PUBLIC_KEY = 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a';

// ✅ PRODUÇÃO (necessário)
const MP_PUBLIC_KEY = 'APP-xxxxxxxxxxxxxxxx'; // Sua chave real
```

**Como obter chave de produção:**
1. Acesse: https://www.mercadopago.com.br/developers
2. Login com sua conta
3. Vá em: **Suas integrações** > **Credenciais**
4. Copie a **Public Key de Produção**
5. Substitua no `config.js`

**IMPORTANTE:**  
- Chaves de TESTE não processam pagamentos reais
- Cliente vai pagar mas dinheiro NÃO entra na conta
- OBRIGATÓRIO trocar antes de lançar

---

#### 2. **Cadastrar Produtos Reais**
**Status:** ⚠️ Precisa verificar

**Como fazer:**
1. Acessar: `admin.html`
2. Ir em: **Produtos**
3. Clicar: **+ Novo Produto**
4. Preencher TODOS os campos:
   - ✅ Nome
   - ✅ Descrição
   - ✅ Preço
   - ✅ Categoria
   - ✅ **Fotos de qualidade**
   - ✅ **Dimensões e peso** (para frete)

**Checklist de Produto:**
- [ ] Pelo menos 3 fotos (600x600px mínimo)
- [ ] Descrição completa (mínimo 100 caracteres)
- [ ] Preços atualizados
- [ ] **Peso e dimensões corretos** (afeta frete!)

---

#### 3. **Configurar Frete (Melhor Envio)**
**Status:** ⚠️ Token configurado, mas precisa testar

**O que você tem:**
✅ Token do Melhor Envio configurado  
✅ CEP de origem: 32600-325

**O que falta:**
1. **Testar cálculo de frete:**
   - Adicionar produto ao carrinho
   - Inserir CEP de destino
   - Verificar se aparece preço

2. **Se não funcionar:**
   - Acessar: https://melhorenvio.com.br
   - Verificar se conta está ativa
   - Verificar se tem créditos

**ALTERNATIVA:**
Se não quiser usar frete automático:
- Pode trabalhar com "Frete Grátis"
- Ou "Frete a combinar" (cliente combina direto)

---

### 🟡 IMPORTANTE (Recomendado mas não bloqueante)

#### 4. **Testar Fluxo Completo de Compra**

**Passo a passo do TESTE:**

1. **Como Cliente:**
   - [ ] Abrir site em aba anônima
   - [ ] Criar conta nova (email teste)
   - [ ] Adicionar produto ao carrinho
   - [ ] Ir para checkout
   - [ ] Preencher dados
   - [ ] **NÃO FINALIZAR** (se MP ainda em teste)

2. **Como Admin:**
   - [ ] Verificar se pedido apareceu no admin
   - [ ] Testar aprovar pedido
   - [ ] Verificar se ID muda (#REQ → #MV)

---

#### 5. **Configurar Emails** 📧
**Status:** ⚠️ Precisa verificar

**Emails que o site deveria enviar:**
- ✅ Confirmação de cadastro
- ✅ Recuperação de senha
- ⚠️ Confirmação de pedido
- ⚠️ Notificação de pagamento

**Como verificar:**
1. Acessar Supabase Dashboard
2. Ir em: **Authentication** > **Email Templates**
3. Personalizar templates

**ALTERNATIVA:**
Se emails não funcionarem:
- Cliente recebe confirmação na tela
- Você recebe notificação no admin
- Pode avisar cliente por WhatsApp manualmente

---

#### 6. **Políticas e Termos** 📜
**Status:** ✅ Arquivos existem

Verificar se estão atualizados:
- [ ] `politica-privacidade.html`
- [ ] `termos-uso.html`
- [ ] `trocas-devolucoes.html`

**Editar com:**
- Nome da sua empresa
- CNPJ
- Endereço
- Políticas de troca/devolução específicas

---

### 🟢 OPCIONAL (Pode fazer depois)

#### 7. **SEO e Google**
- [ ] Criar Google My Business
- [ ] Cadastrar no Google Search Console
- [ ] Adicionar Google Analytics

#### 8. **Redes Sociais**
- [ ] Criar perfil Instagram
- [ ] Criar página Facebook
- [ ] Adicionar botão WhatsApp no site

---

## 📊 FLUXO COMPLETO DE COMPRA

```
┌─────────────────────────────────────────────────────┐
│                   1. CLIENTE                        │
└─────────────────────────────────────────────────────┘
                        ↓
    🌐 Acessa: https://site-marca-viva.vercel.app
                        ↓
    🔍 Navega pelo catálogo de produtos
                        ↓
    🛒 Adiciona produtos ao carrinho
                        ↓
    💰 Escolhe quantidade (atacado = preço menor)
                        ↓
    📦 Preenche CEP → Sistema calcula frete
                        ↓
    ✅ Clica "Finalizar Pedido"
                        ↓
┌─────────────────────────────────────────────────────┐
│           2. SISTEMA CRIA ORÇAMENTO                 │
└─────────────────────────────────────────────────────┘
                        ↓
    📋 Gera ID: #REQ-1234 (Solicitação)
                        ↓
    💾 Salva no banco de dados
                        ↓
    📧 Envia email confirmação (se configurado)
                        ↓
    🔔 Notifica admin (badge no painel)
                        ↓
┌─────────────────────────────────────────────────────┐
│              3. VOCÊ (ADMIN) APROVA                 │
└─────────────────────────────────────────────────────┘
                        ↓
    📱 Acessa: admin.html
                        ↓
    🔍 Vê pedido novo em "Pedidos Pendentes"
                        ↓
    👀 Revisa: produtos, quantidades, valor
                        ↓
    ✅ Clica "APROVAR"
                        ↓
    🎯 Sistema transforma: #REQ-1234 → #MV-2026-5678
                        ↓
    📧 Email enviado ao cliente (se configurado)
                        ↓
┌─────────────────────────────────────────────────────┐
│            4. CLIENTE EFETUA PAGAMENTO              │
└─────────────────────────────────────────────────────┘
                        ↓
    💳 Escolhe forma de pagamento:
       • PIX (instantâneo)
       • Cartão de Crédito
       • Boleto
                        ↓
    💰 Mercado Pago processa pagamento
                        ↓
    ✅ Sistema atualiza status → "Pago"
                        ↓
┌─────────────────────────────────────────────────────┐
│             5. VOCÊ PRODUZ E ENVIA                  │
└─────────────────────────────────────────────────────┘
                        ↓
    🏭 Produz os brindes personalizados
                        ↓
    📦 Embala e prepara envio
                        ↓
    🚚 Envia pelos Correios/Transportadora
                        ↓
    📍 Atualiza status → "Enviado" + código rastreio
                        ↓
┌─────────────────────────────────────────────────────┐
│           6. CLIENTE RECEBE E CONFIRMA              │
└─────────────────────────────────────────────────────┘
                        ↓
    📦 Cliente recebe produto
                        ↓
    ⭐ Pode avaliar (futuro)
                        ↓
    🔄 Ciclo completo!
```

---

## 🎯 CHECKLIST FINAL: PRONTO PARA LANÇAR?

### Mínimo Viável (Pode Vender JÁ)
- [ ] **Mercado Pago em produção** (chave real)
- [ ] **Pelo menos 5 produtos cadastrados** (com fotos)
- [ ] **Testou fluxo completo** (carrinho → checkout)
- [ ] **Admin funcionando** (consegue aprovar pedidos)

### Recomendado
- [ ] Frete configurado e testado
- [ ] Emails funcionando
- [ ] Políticas atualizadas
- [ ] WhatsApp de contato no site

### Ideal (Profissional)
- [ ] SEO configurado
- [ ] Redes sociais ativas
- [ ] Sistema de avaliações
- [ ] Cupons de desconto

---

## 🚨 COMEÇAR SIMPLES

**Minha recomendação:**

1. **HOJE:**
   - ✅ Trocar Mercado Pago para PRODUÇÃO
   - ✅ Cadastrar 3-5 produtos principais
   - ✅ Fazer teste completo

2. **AMANHÃ:**
   - ✅ Divulgar para 5-10 clientes conhecidos
   - ✅ Observar como fluxo funciona
   - ✅ Ajustar conforme feedback

3. **PRÓXIMA SEMANA:**
   - ✅ Configurar frete automático
   - ✅ Melhorar emails
   - ✅ Expandir catálogo

**NÃO PRECISA SER PERFEITO PARA COMEÇAR!**

---

## 📞 CONFIGURAÇÕES URGENTES

### config.js - Mudanças Necessárias:

```javascript
// LINHA 35 - MERCADO PAGO
// ❌ Trocar isto:
const MP_PUBLIC_KEY = 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a';
// ✅ Por sua chave real:
const MP_PUBLIC_KEY = 'APP-xxxxxxxxxxxxxxxx';
```

### Onde editar:
`scripts/config/config.js` linha 35

---

## 💡 DICA PROFISSIONAL

**Lançamento em Fases:**

**Fase 1 (Beta - 1 semana):**
- Divulgar para 10 clientes conhecidos
- Oferecer desconto especial
- Coletar feedback
- Corrigir bugs que aparecerem

**Fase 2 (Soft Launch - 2 semanas):**
- Divulgar em redes sociais (alcance limitado)
- Testar volume de pedidos
- Otimizar processos

**Fase 3 (Lançamento Oficial):**
- Campanha de marketing completa
- Anúncios pagos (opcional)
- Parcerias e influencers

**VANTAGEM:** Evita sobrecarga e problemas em larga escala

---

## ❓ PERGUNTAS FREQUENTES

**Q: Preciso de CNPJ para vender?**  
R: Para Mercado Pago em produção, sim. Mas pode usar CPF inicialmente para testes.

**Q: E se o cliente tiver problema?**  
R: Mercado Pago tem sistema de disputas. Você tem painel admin para gerenciar.

**Q: Quanto custa manter o site no ar?**  
R: 
- Vercel: R$ 0 (plano gratuito)
- Supabase: R$ 0 até 500MB banco
- Mercado Pago: taxa só quando vender (4,99% + R$ 0,49)

**Q: Posso testar pagamento sem cobrar de verdade?**  
R: SIM! Use cartão de TESTE do Mercado Pago:
- Número: 5031 4332 1540 6351
- Vencimento: 11/25
- CVV: 123

---

**Última atualização:** 04/02/2026 23:20
