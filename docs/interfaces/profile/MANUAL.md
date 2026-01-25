# 👤 Interface: Perfil do Usuário

**Status**: Produção
**Acesso**: `/profile.html`, `/login.html`

---

## 1. Visão Geral
Área logada onde o cliente gerencia seus dados e acompanha pedidos. Inclui também o fluxo de entrada (Login/Cadastro).

**Objetivo Principal**: Retenção e auto-atendimento.

## 2. Fluxo do Usuário

### 🔐 Login / Cadastro
1.  **Acesso**: Via botão "Entrar" no topo ou ao tentar finalizar compra.
2.  **Opções**: Email/Senha ou Google (se configurado).
3.  **Sucesso**: Salva sessão no LocalStorage/Supabase e redireciona.

### 🏠 Minha Conta (Dashboard)
*   **Pedidos**: Lista histórico de compras com status (Pago, Pendente).
*   **Endereços**: Gerenciamento de endereços salvos para checkout rápido.
*   **Dados**: Alterar senha, nome e telefone.
*   **Favoritos**: Lista de produtos salvos.

---

## 3. Regras de Segurança

### 🛡️ Sessão
*   Se o token expirar, redirecionar para Login automaticamente.
*   Usuário não pode ver pedidos de outros usuários (RLS no Banco).

### 📝 Validação
*   Senha deve ter no mínimo 6 caracteres.
*   Email deve ser único no sistema.

---

## 4. Arquitetura Técnica

### Arquivos Principais
| Arquivo | Função |
| :--- | :--- |
| `scripts/pages/profile.js` | **Dashboard**: Lógica da tela de perfil. |
| `scripts/pages/login.js` | **Autenticação**: Formulários de login e criação de conta. |
| `scripts/services/auth.js` | **Segurança**: Comunica com Supabase Auth. |
| `scripts/pages/favoritos.js` | **Lista de Desejos**: Renderiza itens favoritados. |

---

## 5. "Cemitério" (Histórico)
*   *Scripts antigos de teste de cliente (`create-test-client.js`) estão arquivados.*
