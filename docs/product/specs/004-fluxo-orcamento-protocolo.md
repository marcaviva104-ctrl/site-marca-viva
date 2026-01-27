# ADR 004: Fluxo de Controle Total (Orçamento → Protocolo)

**Status:** Aprovado (Em planejamento)
**Data:** 25/01/2026

## 1. O Problema
No modelo anterior, qualquer clique em "Finalizar" gerava um Protocolo Oficial (`#MV-...`) na coluna de produção.
Isso causava:
1.  **Poluição:** Testes e curiosos entupiam o Kanban.
2.  **Risco:** Protocolos indicam "obrigação de produzir". Orçamentos não.
3.  **Falta de Controle:** O Admin não tinha o poder de "aceitar" o serviço.

## 2. A Solução: "Sala de Espera"

Criaremos um estado prévio chamado **Pedido de Análise** (ou Inbox).

### O Novo Fluxo
1.  **Checkout:** Cliente envia pedido → Sistema gera **PEDIDO #REQ-123** (não Protocolo).
    *   *Status:* "Aguardando Análise" (Inbox).
    *   *Visual:* Não aparece na coluna "Entrada" da produção. Aparece numa lista separada "Novos Pedidos".
2.  **Negociação:** Admin recebe notificação, chama no WhatsApp e negocia.
3.  **Aprovação (O Gatilho):** Se fechar negócio, Admin clica em **[✅ GERAR PROTOCOLO]**.
    *   Sistema converte `#REQ-123` em `#MV-2026-0050`.
    *   Card move para a coluna "01. Entrada".
    *   Cliente recebe link de rastreio oficial.

## 3. Especificação Técnica

### A. Banco de Dados (`protocols`)
Adicionar coluna `is_request` (boolean) ou usar `status` específico.
*   `status = 'inquiry'` (Orçamento/Pedido)
*   `status = 'production'` (Protocolo Oficial)

### B. `KanbanService.js`

```javascript
// 1. Cria apenas o pedido (Checkout chama isso)
async function createRequest(data) {
    return db.insert({ 
        type: 'REQUEST', 
        status: 'pending_approval' 
        // ... dados do cliente
    });
}

// 2. Transforma em Protocolo (Admin chama isso)
async function promoteToProtocol(requestId) {
    // Gera ID Oficial (#MV...)
    // Muda status para 'production'
    // Move para coluna 1
}
```

### C. Interface Admin (`kanban.html`)
*   Adicionar **Aba "Caixa de Entrada"** (separada do Board).
*   Listar pedidos novos com botão verde "Aprovar" e vermelho "Arquivar".

### D. Interface Checkout (`checkout.js`)
*   Alterar mensagem final de "Protocolo Gerado" para "Pedido Recebido! Aguarde contato."
