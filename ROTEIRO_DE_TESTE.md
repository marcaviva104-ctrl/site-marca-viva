# 🕵️‍♂️ Roteiro de Teste Completo: Fluxo B2B

Siga este passo a passo para validar 100% da nova arquitetura que criamos.

## FASE 1: O Cliente (Pedido)

1.  **Login**
    *   Acesse: `login.html`
    *   Email: `cliente@teste.com`
    *   Senha: `123456`
    *   *Verificação:* Você deve ser redirecionado para a Home.

2.  **Escolha do Produto**
    *   Clique em qualquer produto (Ex: Garrafa Térmica).
    *   Mude a quantidade para **100** (para ativar preço de atacado).
    *   Botão: **"Adicionar ao Carrinho"**.

3.  **Checkout (O Grande Momento)**
    *   Vá para o Carrinho e clique em **Finalizar**.
    *   Preencha os dados (se já não estiverem lá) e escolha "PIX".
    *   Clique em **[ENVIAR PEDIDO]**.
    *   *Verificação:*
        *   ✅ A mensagem deve ser: "Recebemos seu pedido de orçamento".
        *   ✅ O ID deve ser algo como: `#REQ-8473` (NÃO DEVE SER #MV).

---

## FASE 2: O Dono (Aprovação)

4.  **Acesse o Admin**
    *   Acesse: `admin/kanban.html`
    *   (Se pedir login, use `admin@marcaviva.com` / `123456`)

5.  **Caixa de Entrada (Inbox)**
    *   Olhe para o topo da tela. Existe um botão **"Novos Pedidos"**?
    *   Clique nele.
    *   *Verificação:* Você deve ver o card `#REQ-8473` que acabou de criar.

6.  **Aprovação**
    *   Clique no botão azul **[APROVAR]**.
    *   Confirme o alerta.
    *   *Verificação:* O sistema deve dizer "Protocolo Gerado com Sucesso".

7.  **Produção (O Final)**
    *   Volte para a aba **"Produção"**.
    *   Procure na primeira coluna.
    *   ✅ O card agora deve se chamar `#MV-2026-XXXX`.

---
**Resultado:** Se tudo isso aconteceu, seu sistema está seguro, organizado e pronto para B2B! 🚀
