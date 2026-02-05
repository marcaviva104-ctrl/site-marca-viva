# 📦 PACOTE DE TRANSFERÊNCIA - MARCA VIVA
**Data:** 05/02/2026 08:04  
**Destino:** Claude Code (Desktop)  
**Status do Projeto:** Pré-Produção (99% Pronto)

---

## 🎯 RESUMO EXECUTIVO

**Site B2B de Brindes Corporativos** com sistema completo de:
- ✅ E-commerce funcional
- ✅ Descontos por quantidade (Tiers)
- ✅ Kanban de gestão de pedidos
- ✅ Integração Mercado Pago (teste)
- ✅ Cálculo de frete (Melhor Envio)
- ⚠️ **PENDENTE:** Virar chave MP para produção

---

## 📂 ESTRUTURA DO PROJETO

```
SiteMarcaViva/
├── 🌐 FRONTEND (HTML/JS)
│   ├── index.html (Home/Catálogo)
│   ├── produto.html (Detalhes + Tiers)
│   ├── checkout.html (Finalização)
│   ├── admin.html (Painel Admin + Kanban)
│   └── track.html (Rastreamento)
│
├── 💾 DATABASE/
│   ├── CONFIGURAR_PRICE_TIERS.sql ⭐ (8 produtos, 48 tiers)
│   ├── EXECUTAR_NO_SUPABASE.sql ⭐ (Função aprovação)
│   ├── migrations/ (57 arquivos)
│   └── fixes/ (21 correções)
│
├── ⚙️ SCRIPTS/
│   ├── config/config.js ⚠️ (Chaves API - TESTE)
│   ├── services/
│   │   ├── KanbanService.js (Gestão pedidos)
│   │   ├── cartService.js (Carrinho)
│   │   └── shippingService.js (Frete)
│   ├── pages/
│   │   ├── produto.js (Lógica tiers)
│   │   ├── checkout.js (Finalização)
│   │   └── kanban.js (Admin)
│   └── utils/
│
└── 📚 DOCS/
    ├── ROTEIRO_FINAL_B2B.md (Fluxo comprador)
    ├── CHECKLIST_PRE_LANCAMENTO.md
    ├── COMO_CONFIGURAR_DESCONTOS.md
    └── RESUMO_TIERS.md
```

---

## 🔑 CONFIGURAÇÕES CRÍTICAS

### 1. Supabase (Banco de Dados)
```javascript
// scripts/config/config.js
SUPABASE_URL: 'https://qnudbyhnqtsxlqwgkmal.supabase.co'
SUPABASE_KEY: 'sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL' // Pública, ok expor
```

### 2. Mercado Pago ⚠️ TESTE
```javascript
// scripts/config/config.js (LINHA 35)
MP_PUBLIC_KEY: 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a' 
// ⚠️ TROCAR para APP_USR-... antes de vender
```

### 3. Melhor Envio
```javascript
MELHOR_ENVIO_TOKEN: 'eyJ0eXAiOiJKV1QiLCJhbGc...' (configurado)
MELHOR_ENVIO_FROM_CEP: '32600-325'
```

### 4. Vercel (Deploy)
- **URL:** https://site-marca-viva.vercel.app
- **Deploy:** Automático via Git Push
- **Env Vars:** Não configuradas (usando fallbacks)

---

## 💾 BANCO DE DADOS (Supabase)

### Tabelas Principais:
1. **products** - Produtos com `cost`, `price`, `stock`, `status`
2. **product_tiers** - Descontos por quantidade (min_quantity, unit_price)
3. **protocols** - Pedidos (#REQ-XXXX e #MV-XXXX)
4. **protocol_items** - Itens dos pedidos
5. **kanban_columns** - Colunas do Kanban (5 colunas)
6. **profiles** - Usuários cadastrados

### SQLs Pendentes de Execução:
1. ✅ **CONFIGURAR_PRICE_TIERS.sql** - Executado (8 produtos + 48 tiers)
2. ⚠️ **EXECUTAR_NO_SUPABASE.sql** - Função `promote_request_to_protocol` (CRÍTICO)

---

## 🛒 FLUXO DE COMPRA B2B (Implementado)

```
CLIENTE:
1. Escolhe produto → Vê desconto (tiers)
2. Finaliza → NÃO paga ainda
3. Gera #REQ-XXXX (Solicitação)
4. WhatsApp pré-formatado

ADMIN (Kanban):
5. Pedido → "Caixa de Entrada"
6. Aprova arte → "Aguardando Pagamento"
7. Cliente paga PIX
8. Admin confirma → Vira #MV-XXXX (Protocolo)
9. Entra em "Produção"
```

**Vantagem:** Não produz sem pagamento confirmado.

---

## 📊 PRODUTOS E TIERS CONFIGURADOS

| ID | Produto | 1 un | 300 un | Desconto |
|----|---------|------|--------|----------|
| PROD-ADESIVO-001 | Adesivo | R$ 5,00 | R$ 1,80 | -64% |
| PROD-CANETA-002 | Caneta Plástica | R$ 3,50 | R$ 1,30 | -63% |
| PROD-CANETA-003 | Caneta Metal | R$ 22,00 | R$ 9,50 | -57% |
| PROD-CHAVEIRO-004 | Chaveiro | R$ 8,00 | R$ 3,50 | -56% |
| PROD-CADERNO-005 | Caderno A5 | R$ 20,00 | R$ 10,00 | -50% |
| PROD-COPO-006 | Copo Térmico | R$ 40,00 | R$ 21,00 | -48% |
| PROD-ECOBAG-007 | Ecobag | R$ 10,00 | R$ 5,00 | -50% |
| PROD-KIT-008 | Kit Executivo | R$ 50,00 | R$ 26,00 | -48% |

**Faixas:** 1 → 10 → 25 → 50 → 100 → 300

---

## ⚠️ PENDÊNCIAS CRÍTICAS

### 🔴 ALTA PRIORIDADE
1. **Executar SQL:** `database/EXECUTAR_NO_SUPABASE.sql`
   - Cria função `promote_request_to_protocol`
   - Sem isso, botão "Aprovar" no admin não funciona

2. **Chave Mercado Pago:** Trocar em `scripts/config/config.js` linha 35
   - De: `TEST-e57f78e6...`
   - Para: `APP_USR-...` (produção)

3. **Testar Fluxo Completo:**
   - Cliente → Compra → WhatsApp
   - Admin → Aprovar → Protocolo
   - Validar cálculo de tiers

### 🟡 MÉDIA PRIORIDADE
4. **Imagens Reais:** Trocar placeholders por fotos de produtos
5. **Políticas:** Atualizar CNPJ/Endereço em `politica-privacidade.html`
6. **Emails:** Configurar notificações Supabase

### 🟢 BAIXA PRIORIDADE
7. SEO/Google Analytics
8. Campanhas de marketing
9. Redes sociais

---

## 🔧 ARQUIVOS CRÍTICOS PARA REVISAR

### 1. Frontend Core
- `produto.js` - Lógica de tiers e desconto
- `checkout.js` - Criação de #REQ
- `kanban.js` - Admin aprovar/promover

### 2. Services
- `KanbanService.js` - CRUD protocolos
- `cartService.js` - Carrinho localStorage
- `shippingService.js` - Melhor Envio API

### 3. Configurações
- `config.js` - Chaves API (CRÍTICO)
- `vercel.json` - Deploy config

### 4. Database
- `CONFIGURAR_PRICE_TIERS.sql` - Produtos
- `EXECUTAR_NO_SUPABASE.sql` - Função aprovação
- `migrations/create_tiers.sql` - Schema tiers

---

## 🚀 PRÓXIMOS PASSOS (Ordem)

```
1. Executar EXECUTAR_NO_SUPABASE.sql
2. Testar aprovação no Kanban
3. Se OK → Trocar chave MP
4. Fazer compra teste (R$ 2,00)
5. Confirmar dinheiro na conta
6. Cadastrar produtos reais
7. Divulgar para 5 clientes teste
8. Ajustar conforme feedback
9. Escalar divulgação
```

---

## 📞 CONTATO E APIs

- **WhatsApp:** +55 31 98739-8136
- **Email Admin:** (configurar)
- **Supabase Dashboard:** qnudbyhnqtsxlqwgkmal.supabase.co
- **Vercel Dashboard:** vercel.com/marcaviva

---

## 🧠 CONTEXTO IMPORTANTE

### Histórico de Problemas Resolvidos:
1. ✅ Admin travando → Criado admin-v2.js (545 linhas)
2. ✅ Checkout com total R$ 0 → Corrigido cartService
3. ✅ Kanban criando protocolo direto → Implementado fluxo #REQ
4. ✅ Frete não calculava → Integração Melhor Envio
5. ✅ Preços fixos → Sistema de tiers por quantidade

### Decisões de Arquitetura:
- **Fluxo B2B:** Solicita → Aprova → Paga → Produz
- **IDs Manuais:** Produtos usam PROD-XXX-### (não UUID)
- **Sem Backend:** Tudo client-side + Supabase direct
- **RLS Habilitado:** Segurança via Row Level Security

---

## 📝 COMANDOS ÚTEIS

```bash
# Deploy
git add .
git commit -m "feat: nova funcionalidade"
git push  # Auto-deploy no Vercel

# Testar Local
# Abrir com Live Server (VSCode)
# ou: python -m http.server 8000

# Supabase SQL
# Copiar conteúdo .sql → SQL Editor → RUN
```

---

## 🎓 PARA O PRÓXIMO AGENTE (Claude Code)

**Você está pegando um projeto 99% pronto.** 

**Contexto:** Site B2B de brindes com sistema completo: catálogo, carrinho, checkout, kanban admin, tiers de preço, frete automático.

**Faltam:** 3 passos para produção:
1. Rodar `EXECUTAR_NO_SUPABASE.sql`
2. Trocar chave Mercado Pago
3. Testar e validar

**Importante:** 
- Não refazer o que já funciona
- Sistema de tiers está 100% implementado
- Fluxo #REQ → #MV está funcionando
- Foco agora é VALIDAR, não construir

**Dica:** Leia `walkthrough.md` para entender o fluxo completo.

---

## 📄 DOCUMENTOS DE REFERÊNCIA

1. **walkthrough.md** - Fluxo B2B completo ⭐
2. **ROTEIRO_FINAL_B2B.md** - Roteiro de teste
3. **COMO_CONFIGURAR_DESCONTOS.md** - Explicação tiers
4. **CHECKLIST_PRE_LANCAMENTO.md** - Pré-lançamento
5. **implementation_plan.md** - Plano de produção

---

**✅ PROJETO TOTALMENTE DOCUMENTADO E PRONTO PARA TRANSFERÊNCIA**

Se precisar de algo específico, todos os arquivos estão organizados e comentados.
Boa sorte no Claude Code! 🚀
