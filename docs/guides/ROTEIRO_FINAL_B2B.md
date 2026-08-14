# 🧪 Roteiro Final: Teste B2B (Pagar Depois)

Siga este passos para ver o fluxo completo (Seguro e Profissional).

## FASE 1: O Cliente (Solicitação)
1.  Acesse a Loja e adicione 100 Garrafas.
2.  Vá para o **Carrinho** ou Checkout.
3.  Note que **NÃO pede Cartão nem Pix**.
4.  Clique no botão verde **[Enviar Solicitação + Zap]**.
    *   *Verificação:* Ele deve abrir uma nova aba do WhatsApp com sua mensagem pronta ("Olá, sou fulano...").

## FASE 2: O Admin (Aprovação da Arte)
5.  Acesse o Painel: `admin/kanban.html`
6.  Vá na aba "Caixa de Entrada" (ou Novos Pedidos).
7.  Clique em **[APROVAR ARTE]**.
    *   *Verificação:* O pedido **SOMIU** da entrada? (Correto).
8.  Vá para a aba "Produção".
9.  Procure a coluna **"Aguardando Pagamento"** (Amarelo).
    *   *Verificação:* O pedido deve estar lá. Ele **NÃO** pode ter ido para a coluna verde ainda.

## FASE 3: O Admin (Dinheiro na Conta)
10. Suponha que o cliente pagou o Pix.
11. No card amarelo, clique no botão **[CONFIRMAR PAGAMENTO]** (Botão Verde).
12. Confirme o alerta.
    *   *Verificação:* O pedido pulou para a coluna **"Em Produção"** e ganhou o código oficial `#MV-2026-XXXX`.

---
✅ **Se tudo isso aconteceu:** Seu sistema está blindado contra prejuízos e otimizado para vendas.
