# [RFC] Mecânica B2B: Catálogo e Orçamentos

* **Status**: Planejamento
*   **Dependência**: Sistema de Protocolos (Já Criado)

## 1. O Objetivo 🎯
Transformar o site de "Lojinha de Varejo" para **"Ferramenta de Atacado"**.
Hoje, o site assusta empresas grandes porque mostra preço unitário alto e pede cartão de crédito na hora. Vamos mudar isso.

---

## 2. As 3 Grandes Mudanças

### A. Tabela de Preço Dinâmica (Atacado) 📉
*   **Como é hoje**: `R$ 45,00` (Seco).
*   **Como vai ficar**: Uma tabela visível no produto:
    *   1 a 10 unid: **R$ 45,00**
    *   11 a 50 unid: **R$ 38,00** (Economia de 15%)
    *   +50 unid: **R$ 32,00** (Super Atacado)
*   **Lógica**: Se o cliente digitar "60" no campo quantidade, o preço unitário muda sozinho para R$ 32,00.

### B. O "Carrinho Híbrido" (Orçamento) 🛒
*   **Problema**: Empresa não compra com cartão na hora. Precisa de aprovação interna.
*   **Solução**: No Carrinho, teremos dois botões gigantes:
    1.  🟩 **FECHAR PEDIDO** (Vai para Pagamento - Igual hoje).
    2.  🟦 **BAIXAR ORÇAMENTO PDF** (Gera um documento oficial e Salva como Lead no Kanban).

### C. O "Botão Zap" Inteligente 💬
*   No produto, ao invés de só "Comprar", teremos: **"Negociar no WhatsApp"**.
*   Ele clica e já manda pro vendedor: *"Olá, vi o Kit Onboarding e preciso de 100 unidades. Qual o prazo?"*.

---

## 3. Impacto Técnico (Onde vamos mexer) 🛠️

### Frontend (O que o cliente vê)
| Arquivo | O que muda? | Complexidade |
| :--- | :--- | :--- |
| `product.html` | Adicionar a Tabela HTML de preços escalonados. | Média |
| `product.js` | Criar a lógica matemática: `se qtd > 50 entao preco = 32`. | Alta |
| `cart.html` | Adicionar o botão "Baixar Orçamento". | Baixa |
| `checkout.js` | Criar função que gera o PDF (usando biblioteca `jspdf`). | Alta |

### Dados (Supabase)
*   Não precisa criar tabelas novas!
*   Apenas atualizar a coluna `price_tiers` na tabela `products` (que já criamos no script anterior).

---

## 4. O Resultado Final (Simulação)
1.  Cliente entra, vê que 100 canecas sai barato.
2.  Coloca 100 no carrinho.
3.  Clica em "Baixar Orçamento".
4.  O Site gera um PDF lindo com a logo da Marca Viva.
5.  O Site cria um Card na coluna "Entrada" do seu Kanban.
6.  Você liga pro cliente: *"E aí, o financeiro aprovou o PDF?"*.

---

## 5. O Ecossistema Conectado (Indo Além) 🌐

Você pediu para "pensar em tudo". Aqui estão as conexões de valor:

### A. Captura de Lead (CRM) 🎣
*   **Ideia**: Para baixar o PDF, o cliente digita Nome + WhatsApp.
*   **Conexão**: O sistema salva isso numa lista "Leads B2B".
*   **Automação**: Se ele não fechar em 24h, o sistema manda um Zap automático: *"Olá, viu que seu orçamento expira amanhã?"*.

### B. Frete Pesado (Transportadora) 🚛
*   **Problema**: Correios não leva 500 canecas.
*   **Solução**: Se o peso passar de 30kg, o carrinho esconde o SEDEX e mostra: **"Frete via Transportadora (A Combinar)"**.
*   **Conexão**: O pedido cai no Kanban com uma etiqueta 🚚 **Cotar Frete**.

### C. Gamificação de Upsell (Venda Mais) 📈
*   **Lógica**: Se o cliente colocar 45 unidades, o site avisa:
    *   *⚠️ "Psiu! Se levar mais 5 unidades, o preço cai de R$ 45 para R$ 38. Você economiza R$ 200,00!"*
*   **Efeito**: O cliente completa o lote de 50 pelo desconto.

### D. Estoque Virtual (Fornecedor) 🏭
*   **Ideia**: Se você não produz tudo internamente (revende importados), conectamos com o estoque de segurança.
*   **Trava**: Se ele pedir 5.000 unidades, o site avisa: *"Para grandes volumes, prazo de entrega é 15 dias"*.

---

## 6. Perguntas Estratégicas (Para Fechar) ❓

Preciso que você responda para eu calibrar o sistema:

1.  **Validade do Orçamento**: Colocamos **5 dias** de validade no PDF? (Cria urgência).
2.  **Frete**: Quando o pedido é gigante (ex: 20 caixas), quem paga o frete? É **FOB** (Cliente paga a transportadora) ou **CIF** (Você paga)?
3.  **Compra Mínima**: Quer travar o atacado? Ex: "Só gero PDF se o pedido for acima de R$ 500,00". (Evita curioso gerando papel à toa).
4.  **Desconto à Vista**: No PDF, já colocamos *"5% de desconto no PIX"*?

---

## 7. Impacto Geral (O Que Acontece no Site Todo?) 🏗️

Você perguntou: *"Vai mudar outras abas? O que acontece no geral?"*.
Aqui está o **Mapa da Mudança** página por página:

### 🏠 Home (`index.html`)
*   **Muda?**: 🟩 Quase nada.
*   **Detalhe**: Só vamos adicionar um banner ou botão no menu: **"Venda Corporativa / Atacado"** para chamar a atenção das empresas.

### 🛍️ Carrinho (`cart.html`)
*   **Muda?**: 🟥 MUITO.
*   **O que acontece**: Ele deixa de ser um "caixa de supermercado" e vira uma "mesa de negociação".
*   **Mudança Visual**: Ganha o botão Azul **"Baixar Orçamento"** ao lado do botão de Comprar.
*   **Mudança Invisível**: Ele precisa calcular peso para transportadora (se for pesado).

### 💳 Checkout (`checkout.html`)
*   **Muda?**: 🟨 MÉDIO.
*   **O que acontece**:
    *   Se for **Venda Normal**: Continua igual (Pede cartão, Pix).
    *   Se for **Orçamento B2B**: O checkout **SPOILERS** (esconde) o pagamento. Pede só CNPJ e Telefone, e gera o PDF na hora.

### 👤 Minha Conta (`profile.html`)
*   **Muda?**: 🟨 MÉDIO.
*   **O que acontece**: Hoje mostra "Pedidos antigos". Precisamos adicionar uma aba **"Meus Orçamentos"**, para o cliente baixar o PDF de novo se perdeu.

### 📝 Resumo do "Geral" (A Transformação)
O site deixa de ser uma **Loja Simples** (que só vende se passar cartão) e vira um **Portal de Negócios**.
*   **Antes**: Visitante entra -> Acha caro -> Vai embora.
*   **Depois**: Visitante entra -> Vê desconto de volume -> Baixa PDF -> Seu vendedor liga -> **Venda Fechada**.

---

## 8. O Seu Novo Dia-a-Dia (Impacto no Fluxo) 🗓️

Você perguntou: *"O que muda no meu fluxo?"*.
Aqui está a rotina da sua empresa com esse sistema:

### 🕗 Manhã (Vendas)
1.  **Vendedor abre o Kanban**: Vê 5 cards na coluda **"Entrada (Lead)"**.
2.  **Ação**: Ele clica no card "TechStart". Vê que eles baixaram um orçamento de 50 Mochilas.
3.  **Contato**: Ele clica no botão do WhatsApp e fala: *"Oi, vi que cotou mochilas. Quer fechar agora com 5% de desconto?"*.
4.  **Resultado**: Se fechar, ele arrasta o card para **"Aguardando Pagamento"**. (Zero papelada manual).

### 🕐 Tarde (Produção)
1.  **Designer abre o Kanban**: Vê 3 cards na coluna **"Criação de Arte"**.
2.  **Ação**: Faz o mockup, sobe no sistema.
3.  **Cliente**: Recebe o link no celular, aprova na hora.
4.  **Estoquista**: Vê o card pular sozinho para **"Em Produção"** (com a barra verde de pago). Ele já separa o material.

### 🕔 Fim do Dia (Gestão)
1.  **Você abre o Painel**: Vê que tem R$ 5.000,00 travado na coluna **"Aguardando Pagamento"**.
2.  **Ação**: Cobra os vendedores para desenrolar esses clientes.

---

## 9. O Que Pode Estar Faltando? (A Última Milha) 🤔

Para ter **Certeza Absoluta** que não falta nada, só restou um ponto cego:

*   **Comissão de Vendedores**:
    *   Você tem vendedores comissionados?
    *   Se sim, precisamos de um campo no cadastro do cliente: *"Vendedor Responsável"*.
    *   Assim, quando a TechStart comprar, a comissão vai para o "João" e não para a "Maria".

Se você trabalha sozinho ou sem comissão, então **NÃO FALTA MAIS NADA**. O sistema está completo.

---

## 10. A "Cereja do Bolo" (O Que Mais Dá pra Agregar?) 🍒

Você perguntou: *"O que mais temos para agregar?"*.
Para diferenciar seu site de *todos* os concorrentes, aqui vão 3 funcionalidades "Inteligentes":

### A. Simulador de Logo Instantâneo ✨
*   **O que é**: O cliente sobe a logo *uma vez*.
*   **Mágica**: O site aplica essa logo "automaticamente" em TODAS as fotos de todos os produtos enquanto ele navega.
*   **Efeito**: Ele não vê uma "Caneca Branca", ele vê a "Caneca da Empresa Dele". A chance de compra sobe 200%.

### B. O "Despertador de Recompra" ⏰
*   **Lógica**: Quem compra brinde, compra sempre (Natal, Eventos).
*   **Automação**: O sistema avisa o vendedor: *"Já faz 11 meses que a TechStart comprou os brindes de Natal. Ligue para oferecer o Kit deste ano."*
*   **Resultado**: Venda passiva recorrente.

### C. Busca por Budget (Orçamento) 💰
*   **Problema**: O Gerente de RH tem R$ 5.000,00 pra gastar e precisa de 100 itens.
*   **Solução**: Um filtro especial: *"Tenho R$ [5000] e preciso de [100] peças"*.
*   **Resultado**: O site mostra só o que cabe no bolso dele. (Filtro reverso).

---

## 11. Análise de Riscos (O Que Pode Dar Errado?) ⚠️

Re-avaliando o projeto com "olhar pessimista" para nos protegermos:

| Risco | Solução (Plano B) |
| :--- | :--- |
| **WhatsApp Bloquear** | Se mandarmos manual demais, o Zap bloqueia. **Solução**: Usar a API Oficial ou limitar envios automáticos. |
| **Internet Cair na Fábrica** | O estoquista não consegue ver o Kanban. **Solução**: O sistema deve ter um botão "Imprimir Ordem do Dia" (Papel) de manhã. |
| **Cliente Errar Logo** | Cliente sobe logo em baixa qualidade. **Solução**: O Designer tem um botão "Solicitar Novo Arquivo" que notifica o cliente na hora. |

## 12. Indicadores de Sucesso (KPIs) 📊

Como saberemos se valeu a pena tanto esforço? Olharemos estes 3 números:

1.  **Taxa de Conversão B2B**: De cada 10 orçamentos baixados, quantos viram venda? (Meta: 20%).
2.  **Tempo de Aprovação**: Em quanto tempo o cliente aprova a arte? (Meta: < 4 horas).
3.  **Ticket Médio Corporativo**: O valor dos pedidos de empresas subiu? (Meta: +30% com o preço escalonado).

---

## 🏁 Resumo Executivo do Sistema Completo

Este documento, junto com a Especificação `001`, define a nova era da **Marca Viva**.

1.  **Protocolo Unificado**: Um identificador único (`#MV-2026`) rastreia o cliente do "Oi" no WhatsApp até a entrega.
2.  **Operação Visual (Kanban)**: A equipe abandona listas confusas e usa um quadro visual (Arrastar e Soltar) para gerenciar produção.
3.  **Transparência Total (Tracking)**: O cliente acompanha o status em tempo real sem precisar de senha.
4.  **Vendas B2B Recorrentes**:
    *   Preços dinâmicos por quantidade.
    *   Orçamentos em PDF para empresas.
    *   Gestão automatizada de leads e follow-up.

**Próximos Passos Imediatos**: Executar a migração do banco de dados e conectar as telas de Kanban e Tracking.


