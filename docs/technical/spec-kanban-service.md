# Especificação Técnica: KanbanService (Profissional)

> **Objetivo:** Definir com precisão matemática o comportamento de cada função do sistema de protocolos, eliminando "achismos" e garantindo robustez (zero erros não tratados).

---

## 1. Padrões de Arquitetura

### Tratamento de Erros (Padronizado)
Nenhuma função pode quebrar o app. Todas devem retornar um objeto padrão:
```javascript
{
  success: boolean,
  data: any | null,
  error: { code: string, message: string, original: Error } | null
}
```

### Segurança (Security First)
*   **Nunca** confiar no cliente (frontend).
*   Movimentações críticas usam **RPC (Remote Procedure Calls)** no Supabase, não `update` direto.
*   Isso garante que o Histórico (`protocol_history`) seja *sempre* gravado pelo banco.

---

## 2. Assinatura das Funções (O Contrato)

### A. Leitura (Queries)
Estas funções buscam dados. Devem ser rápidas e cacheadas quando possível.

#### `getBoardData()`
*   **O que faz:** Busca colunas e protocolos de uma vez (paralelismo).
*   **Regra de Ouro:** Se falhar os protocolos, ainda mostra as colunas vazias (Degradação Graciosa).
*   **Retorno:** `{ columns: [], protocols: [] }`

#### `getProtocolDetails(id)`
*   **O que faz:** Busca TUDO de um card: itens, histórico, arquivos, cliente.
*   **Segurança:** Verifica se o `id` existe. Se não, retorna erro 404 amigável.

---

### B. Escrita Crítica (Mutations)
Estas funções alteram dinheiro ou status. Rigor máximo.

#### `moveCard(protocolId, newColumnId, reason)`
*   **Lógica Real (Backend):** 
    1. Chama a função SQL `move_protocol(id, col, reason)`.
    2. O banco verifica se a coluna de destino é válida.
    3. O banco grava `protocol_history` (Quem? Quando? De onde pra onde?).
    4. O banco retorna o card atualizado.
*   **Tratamento de Erro:**
    *   *Bug Comum:* Card não existe mais (deletado por outro admin).
    *   *Solução:* Alertar usuário e recarregar o board.

#### `approveArt(protocolId)`
*   **Lógica:**
    1. Verifica se existe imagem de mockup anexada (Impede aprovação "fantasma").
    2. Marca `art_approved = true`.
    3. **Automático:** Move para coluna "Produção".
*   **Notificação:** Dispara gatilho de WhatsApp para o vendedor.

#### `updatePaymentStatus(protocolId, status, amount)`
*   **O que faz:** Registra pagamento manual (Pix/Dinheiro).
*   **Auditoria:** Obrigatório informar `amount` (valor). Não permite valor negativo.
*   **Log:** Grava no histórico "Pagamento Manual registrado por [Admin]".

---

### C. Arquivos (Storage)

#### `uploadAttachment(protocolId, file)`
*   **Desafio:** Arquivos grandes ou internet lenta.
*   **Solução Profissional:**
    1. Valida tamanho (< 10MB) e tipo (PDF/JPG/PNG) no frontend.
    2. Renomeia arquivo para garantir unicidade: `[ID]_[TIMESTAMP]_[NOME]`.
    3. Upload para bucket `protocol-files`.
    4. Salva referência na tabela `protocol_attachments`.

---

## 3. Matriz de Erros e Soluções

| Cenário de Erro | Comportamento do Sistema | Mensagem pro Usuário |
| :--- | :--- | :--- |
| **Internet Caiu** | Retry automático (3x) nas leituras. Fila na escrita. | "Sem conexão. Tentando reconectar..." |
| **Card Bloqueado** | Tentar mover card "bloqueado" por regra. | "⛔ Ação Bloqueada: Cliente precisa aprovar a arte antes." |
| **Conflito** | Dois admins movem o mesmo card. | "O card foi atualizado por outro usuário." (Recarrega) |
| **Sessão Expirou** | Token JWT inválido. | Redireciona para Login silenciosamente ou pede senha. |

---

## 4. Próximo Passo: Refatoração
Agora vou reescrever o `KanbanService.js` aplicando EXATAMENTE estas regras. O código será blindado.
