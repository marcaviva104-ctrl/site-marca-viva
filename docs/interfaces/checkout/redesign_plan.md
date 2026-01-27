# Plano de Redesign: Checkout Premium
**Objetivo:** Transformar a tela de checkout "básica" em uma experiência profissional e confiável.

## 1. Explicação: "O Que essa Tela Faz?"
O Checkout não é apenas um formulário. Ele é o **Gatilho do Sistema B2B**.
Quando o usuário clica em "Finalizar", acontece uma reação em cadeia:
1.  **Validação:** Confere estoque e totais.
2.  **Criação do Protocolo:** Gera o código único (`#MV-2026-xxxx`).
3.  **Disparo Kanban:** Cria o card automaticamente na coluna "Entrada" do Admin.
4.  **Auditoria:** Grava quem fez o pedido, IP e hora exata.

## 2. O Que Vamos Mudar no Design (Visual)
Para tirar a "cara de formulário simples", faremos:

### A. Estilo "Glass & Clean"
*   **Antes:** Fundos cinzas chapados.
*   **Depois:** Fundo branco limpo, sombras suaves (deep shadows) e bordas arredondadas maiores (16px).

### B. Inputs Modernos
*   Campos de texto maiores e mais "gordinhos" (conforto visual).
*   Efeito de **Focus Ring**: Quando clica, o campo brilha na cor da marca (Laranja/Roxo).

### C. Seção de Pagamento
*   Transformar as abas (tabs) em **Big Buttons** (Botões grandes com ícones destacados).
*   Dar destaque visual ao PIX (método preferido).

### D. Resumo Flutuante
*   A caixa da direita ("Resumo") ficará fixa enquanto rola a página, sempre visível.

## 3. Arquivos Afetados
*   `styles/pages/checkout.css` (Refatoração total do estilo).
*   `checkout.html` (Pequenos ajustes de classes se necessário).
