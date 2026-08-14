# Resumo das Atualizações - 06/03/2026

## O que foi feito hoje?

Nossa meta principal hoje foi construir o sistema fiscal e de orçamentos, e resolver os problemas de tela em branco (produtos não aparecendo).

### 1. Sistema Fiscal Completo (NF-e e Simples Nacional)
- **Tabela de Produtos:** Criamos os novos campos `ncm` (Código Fiscal) e `tax_rate` (Alíquota do Simples Nacional) no Supabase.
- **Painel Admin:** Adicionamos as caixas para você digitar o NCM e a Alíquota direto na hora de cadastrar/editar um produto.
- **Carrinho (Checkout):** O sistema agora calcula automaticamente quanto imposto você está pagando em cada pedido baseado nos produtos que o cliente escolheu.

### 2. Painel Admin: Gestão de Orçamentos e Taxas do Mercado Pago
- **Botão "Remover Imposto":** Se você negociar sem NF-e, você pode clicar no botão no Kanban e o sistema corta o valor do imposto do preço final.
- **Botão "Taxa de Pagamento":** Agora você pode escolher se o cliente vai pagar no Cartão, Pix ou Boleto. O sistema calcula a taxa do Mercado Pago e adiciona o valor ao orçamento final.
- **PDF do Orçamento:** O PDF gerado foi atualizado. Se o cliente pagar no Pix, a taxa extra não aparece. Se pagar no crédito, a taxa do cartão aparece claramente ("+ R$ X,XX Taxa Cartão") e, se você tirar a NF-e, aparece o desconto ("- R$ X,XX Desconto Sem NF-e") pro cliente ver a vantagem.

### 3. Correção de Bugs Críticos (Produtos não apareciam)
- O site principal (`index.html`) estava tentando carregar os arquivos de forma errada, causando tela branca no catálogo.
- Arrumamos **todos** os caminhos de carregamento (`supabase-client.js`, `auth.js`, `products.js`, `shop-ui-controller.js`).
- **Resultado:** Os 18 produtos voltaram a carregar normalmente com fotos, preços e categorias!


---

## O QUE VOCÊ PRECISA TESTAR (Checklist)

Para garantir que o dia de hoje foi 100% um sucesso, teste esses pontos no **Vercel** quando estiver no computador:

- [ ] **1. Catálogo de Produtos:** Entre em `site-marca-viva.vercel.app` e veja se todos os produtos estão aparecendo e se os alertas falsos de erro sumiram.
- [ ] **2. Editar Produto (Fiscal):** Vá no Admin > Produtos > Editar. Role a barra verde da esquerda até o final e veja se as caixinhas de "NCM" e "Alíquota %" estão lá e salvam as informações.
- [ ] **3. Tirar a NF-e de um Pedido:** Vá no Admin > Pedidos. Clique no ícone do olho para ver os detalhes de um pedido e clique em **"✂️ Remover Imposto (Sem NF-e)"**. O valor total do pedido deve cair.
- [ ] **4. Aplicar Taxa de Cartão:** No mesmo pedido (ou em outro), clique no botão azul **"💳 Gerar Orçamento (com taxa de pagamento)"**. Escolha "Cartão de Crédito 3x", coloque 5% e dê OK.
- [ ] **5. PDF do Orçamento:** Verifique se o PDF que foi gerado mostra o valor adicionado da taxa do Mercado Pago na listinha de Totais (no final da folha).

> 💡 **Super Dica:** Sempre que precisar que eu te lembre, é só colar a data **"06/03"** ou o nome desse arquivo aqui no chat, que eu te guio nesse check-up!
