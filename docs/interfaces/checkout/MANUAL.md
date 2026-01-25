# 🛒 Interface: Checkout & Pagamento

**Status**: Produção
**Responsável Técnico**: SiteMarcaViva Engineering

---

## 1. Visão Geral
A interface de Checkout é o coração financeiro do site. Ela guia o usuário desde a revisão dos itens no carrinho até a confirmação do pagamento via Mercado Pago.

**Objetivo Principal**: Converter carrinhos em pedidos com o menor atrito possível.

## 2. Fluxo do Usuário (User Flow)
1.  **Carrinho**: Usuário clica em "Finalizar Compra" no carrinho lateral.
2.  **Identificação**: Se não logado, solicita Login/Cadastro.
3.  **Entrega**:
    *   Usuário preenche CEP.
    *   Sistema calcula frete (Correios/Transportadora) e prazo.
    *   Usuário confirma endereço.
4.  **Resumo**: Exibe subtotal, frete e total final.
5.  **Pagamento**:
    *   Checkout Transparente (Mercado Pago).
    *   Usuário insere dados do cartão ou escolhe Pix.
6.  **Confirmação**: Redirecionamento para página de sucesso (`confirmacao.html`).

---

## 3. Regras de Negócio (Business Rules)

### 🚚 Frete
*   **Cálculo**: Baseado na API de CEP (ViaCEP para endereço + Tabela interna/API para preço).
*   **Regra de Ouro**: CEP Inválido deve bloquear o avanço.

### 💳 Pagamento (Mercado Pago)
*   **Chave Pública**: Deve ser configurada em `checkout-service.js`.
*   **Sandbox vs Produção**:
    *   Localhost: Usa credenciais de teste (Sandbox).
    *   Vercel/Produção: Deve usar credenciais reais.
*   **Segurança**: Dados de cartão nunca passam pelo nosso servidor, vão direto para o Mercado Pago (Tokenização).

### 📦 Estoque
*   Ao confirmar pagamento, o estoque deve ser decrementado (Lógica no Supabase).

---

## 4. Arquitetura Técnica

### Arquivos Principais
| Arquivo | Função |
| :--- | :--- |
| `scripts/pages/checkout.js` | **Lógica da Página**: Manipula o DOM, exibe etapas e valida formulários. |
| `scripts/services/checkout-service.js` | **Integração API**: Comunica com Mercado Pago e Supabase. |
| `scripts/services/shipping-service.js` | **Lógica de Frete**: Cálculos de entrega e consulta de CEP. |
| `styles/pages/checkout.css` | **Estilo**: Layout responsivo do checkout. |

### Dependências Externas
*   Mercado Pago SDK V2 (`https://sdk.mercadopago.com/js/v2`)
*   Supabase Client (Banco de Dados)

---

## 5. "Cemitério" (Histórico)
*   *Versões antigas do checkout foram arquivadas em `docs/archive/code_graveyard`.*
