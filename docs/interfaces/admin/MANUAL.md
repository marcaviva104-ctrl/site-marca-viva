# 🛡️ Interface: Painel Administrativo

**Status**: Restrito (Admin Only)
**Acesso**: `/admin.html`

---

## 1. Visão Geral
O Painel Administrativo ("Dashboard") é a central de controle da Marca Viva. Permite gerenciar produtos, visualizar pedidos e controlar clientes.

**Objetivo Principal**: Gestão total da loja sem precisar mexer em código/banco de dados.

## 2. Funcionalidades

### 📦 Produtos
*   **Listagem**: Tabela com busca e filtros.
*   **Adicionar/Editar**: Formulário para nome, preço, imagens, categorias.
*   **Excluir**: Remoção lógica (o produto fica inativo, não é deletado do banco).

### 🛍️ Pedidos
*   **Kanban/Lista**: Visualização de pedidos por status (Pendente, Pago, Enviado).
*   **Detalhes**: Ver itens comprados, endereço de entrega e dados do cliente.
*   **Ações**: Alterar status (ex: marcar como "Enviado").

### 👥 Clientes
*   Visualização de usuários cadastrados e histórico de compras.

---

## 3. Regras de Segurança

### 🔒 Autenticação
*   **Regra Crítica**: Apenas usuários com `role: 'admin'` no Supabase podem acessar esta página.
*   **Redirecionamento**: Se um usuário comum tentar acessar, é chutado para a `index.html`.

### ⚠️ Proteção de Dados
*   O Admin tem acesso a dados sensíveis (endereços). O acesso deve ser auditado.

---

## 4. Arquitetura Técnica

### Arquivos Principais
| Arquivo | Função |
| :--- | :--- |
| `scripts/pages/admin.js` | **Controlador**: Lógica principal da dashboard. |
| `scripts/pages/orders.js` | **Gestão de Pedidos**: Lógica específica da aba de pedidos. |
| `scripts/pages/stories-admin.js` | **Stories**: Gerenciador do carrossel de stories. |
| `styles/pages/admin.css` | **Estilo**: Layout da dashboard (Sidebar + Conteúdo). |

### Banco de Dados (Supabase)
*   Tabelas afetadas: `products`, `orders`, `profiles`.

---

## 5. "Cemitério" (Histórico)
*   *Versões V2 e V3 do admin estão salvas em `docs/archive/code_graveyard` (arquivos `admin_v2.js`, `admin_v3.js`)*.
