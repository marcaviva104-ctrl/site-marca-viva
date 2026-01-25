# 🧪 Guia de Teste: Sistema de Protocolos B2B

Siga este roteiro para validar se o "Cérebro" do sistema está funcionando 100%.

## Passo 0: Pré-requisitos (Crucial)
Antes de começar, certifique-se de que rodou o script SQL no Supabase.
1.  Abra o Supabase > SQL Editor.
2.  Verifique se rodou o `002_create_protocol_history.sql`.
    *   *Se não rodou:* O sistema vai dar erro ao tentar mover cards.

---

## 🛍️ Parte 1: O Cliente (Compra)

1.  **Login de Cliente:**
    *   Abra `login.html` no navegador.
    *   Entre com o usuário de teste: `cliente@teste.com` / `123456`
    *   (Ou crie uma conta nova se preferir).

2.  **Carrinho B2B:**
    *   Vá para `produto.html` (escolha qualquer produto).
    *   Coloque **100 unidades** (para ver o preço de atacado ativar).
    *   Adicione ao carrinho.

3.  **Checkout:**
    *   Vá para o carrinho e clique em "Finalizar".
    *   No Checkout, preencha o endereço (o CEP deve buscar automático).
    *   Escolha "PIX" (simulado).
    *   **Clique em "Finalizar Pedido".**

    > **👀 O que deve acontecer:**
    > - O sistema vai dizer "Pedido Realizado!".
    > - Ele vai te redirecionar AUTOMATICAMENTE para a página de **Rastreio**.
    > - Anote o código do protocolo (ex: `#MV-2026-X9Y`).

---

## 🏭 Parte 2: O Admin (Gestão)

1.  **Acesso Admin:**
    *   Em outra aba (ou janela anônima), abra `login.html`.
    *   Entre como Admin: `leivinjesus57@gmail.com` / `123456`
    *   Após login, vá para `admin/kanban.html`.

2.  **Verificar Entrada:**
    *   Olhe a coluna **01. Entrada**.
    *   O pedido que você acabou de fazer deve estar lá! 🎉
    *   O card deve mostrar o nome do cliente e o valor total.

3.  **Mover Card:**
    *   Clique e arraste o card para a coluna **02. Aguardando Pagamento**.
    *   *Verificação:* Se o card ficar lá e aparecer um aviso "Sucesso", o banco de dados funcionou.

---

## 🚚 Parte 3: O Cliente (Acompanhamento)

1.  **Verificar Rastreio:**
    *   Volte para a aba do cliente (a página `track.html`).
    *   Dê um Refresh (F5).
    *   Veja se a bolinha da timeline andou para **"Aguardando Pagamento"**.

---

## 🏁 Conclusão
Se você conseguiu fazer os 3 passos acima, o sistema está **Integrado, Seguro e Funcionando**.

### Problemas Comuns
*   **Card não move:** Provavelmente esqueceu de rodar o SQL `002`.
*   **Checkout não gera protocolo:** Verifique se está logado.
