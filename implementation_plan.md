# Implementation Plan - Personalized E-commerce Store

## Goal Description
Build a premium, modern e-commerce web application for a personalized product store. The design will focus on "Wow" aesthetics using glassmorphism, vibrant gradients, and smooth animations. The core functionality will support browsing products and specific customization options (e.g., text, colors for personalized items).

## User Review Required
- **Branding**: "Marca Viva" - Focusing on vibrant, lively energy.
- **Product Types**: T-shirts, Mugs, Keychains, Pens (Everything personalized).

## Proposed Changes

### Architecture
- **Tech Stack**: Vanilla HTML5, CSS3 (Advanced), JavaScript (ES6+). No heavy frameworks to ensure maximum performance and design control.
- **Structure**:
    - `index.html`: Landing page.
    - `product.html`: Product details and customization interface.
    - `cart.html`: Shopping cart.
    - `styles/`: CSS modules (variables, components, layouts).
    - `scripts/`: JS logic (cart state, UI interactions).

### Auth Logic (Functional)
- **Client-Side Auth**: Simulate a real backend using `localStorage`.
- **Features**:
    - **Registration**: Save user data (Name, Email, Password) locally.
    - **Login**: Validate credentials against saved data.
    - **Session**: Keep user logged in across page reloads.
    - **Personalization**: Display "Hello, [Name]" in the header.

### Design System (Premium Glassmorphism)
- **Colors**: Dark mode base, neon accents (Purple/Pink/Cyan gradients).
- **Typography**: 'Outfit' or 'Inter' from Google Fonts.
- **Components**:
    - Translucent cards with blur effects (`backdrop-filter: blur`).
    - Floating action buttons.
    - Smooth scroll and reveal animations.

## Verification Plan
### Automated Tests
- None planned for MVP (visual focus).

### Manual Verification
- Verify responsiveness on Mobile (375px), Tablet, and Desktop.
- Test "Add to Cart" flow with customization data.
- Check animation smoothness.

# Suite Financeira Avançada (PRO)

## Objetivo
Implementar funcionalidades de "Nível Executivo" para transformar o painel em uma ferramenta estratégica.

## Mudanças Propostas

### 1. Banco de Dados (`advanced_financial.sql`)
- Tabela `financial_goals`: Para o "Cofrinho".
- Colunas em `financial_records`: `installments_total`, `installment_number`, `parent_group_id` (para parcelas).
- Colunas em `customers` (se existir) ou lógica em tempo real para VIP.

### 2. Gestão de Parcelas (Back-end)
- Alterar `saveExpense`: Aceitar campo "Parcelas".
- Loop: Se parcelas > 1, criar N registros com datas futuras (Mês +1, +2...).

### 3. Cofrinho de Metas (UI/Logic)
- Widget no topo do Financeiro.
- Barra de progresso visual.
- Lógica: `TotalVendas * %Definida` alimenta a meta.

### 4. Dedo-Duro de Margem (UI)
- Na tabela de produtos (`renderProducts`), verificar: `(Preço - Custo) / Preço`.
- Se margem < 20% (configurável), exibir ícone de alerta ⚠️ piscando.

### 5. Radar VIP
- No Kanban ou Lista de Pedidos.
- Calcular `TotalGasto` do cliente.
- Se > R$ X, exibir 💎.
- Se tiver dívida pendente, exibir 🚩.

### 6. Simulador
- Novo botão "🔮 Simular" no Toolbar.
- Modal simples com inputs (Variação Venda %, Variação Custo %).
- Resultado imediato: "Seu lucro seria R$ X".
