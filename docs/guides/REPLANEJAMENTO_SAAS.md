# 🏗️ REPLANEJAMENTO — De site próprio para produto vendável

**Feito em:** 14/08/2026
**Baseado em:** leitura do código + inspeção do banco Supabase real (não em documentação antiga)

---

## 🎯 AS 3 DECISÕES QUE VOCÊ TOMOU

| Decisão | Escolha |
|---|---|
| **Modelo** | SaaS — um sistema, várias gráficas dentro |
| **Nota fiscal** | A definir (recomendação neste documento) |
| **Ordem** | Marca Viva funcionando 100% primeiro, depois vender |

**Tradução prática:** você constrói a fundação de "várias lojas" **desde agora**, mas a
primeira e única loja por vários meses é a **sua**. Você é o cliente nº 1. Se não servir
pra você, não serve pra ninguém.

---

## 📸 O RETRATO REAL DO SISTEMA HOJE

*Isto foi medido, não suposto.*

### O que existe e tem dado de verdade

| Tabela | Registros | Observação |
|---|---:|---|
| `protocols` | 24 | seus pedidos reais |
| `product_tiers` | 48 | descontos por quantidade |
| `protocol_items` | 30 | |
| `inventory_items` | 23 | |
| `products` | 19 | |
| `order_payments` | 8 | |
| `profiles` | 8 | |
| `categories` | 7 | |
| `kanban_columns` | 6 | |
| `financial_records` | 4 | |
| `site_settings` | 1 | |
| `orders` / `order_items` | **0** | resto do varejo antigo — **morto** |

### 🚨 Tabelas que a documentação promete e NÃO existem

```
coupons          financial_orders     insumos
kanban_items     favorites            reviews
```

Todo trecho de código que tenta ler essas tabelas **falha**. Isso é fonte garantida de
erro vermelho no painel. **Antes de construir qualquer coisa nova, isso precisa ser
resolvido** — ou criando a tabela, ou removendo o código morto.

---

## 🧱 O PROBLEMA CENTRAL: hoje só existe UMA gráfica no mundo

Procurei no projeto inteiro por `loja_id`, `tenant_id`, `store_id`, `company_id`.
**Resultado: zero.**

Hoje o sistema pensa assim:

```
"o produto"      → não "o produto DA gráfica X"
"o pedido"       → não "o pedido DA gráfica X"
"o cliente"      → não "o cliente DA gráfica X"
```

Se outra gráfica entrar hoje, ela vê **seus** clientes, **seus** pedidos, **seu** financeiro.

**Essa é a obra estrutural do projeto.** Tudo o mais é acabamento.

---

## 🚧 O SEGUNDO PROBLEMA: não existe servidor

Hoje **tudo** roda dentro do navegador do cliente, conversando direto com o Supabase.
Isso funciona bem pra uma loja. Mas três coisas que você quer **são impossíveis assim**:

| O que você quer | Por que o navegador não dá conta |
|---|---|
| **Nota fiscal** | Exige certificado digital A1/A3 e assinatura. Certificado no navegador = qualquer um baixa e emite nota no seu CNPJ. Não é "difícil", é **inviável** |
| **Confirmar pagamento** | O Mercado Pago avisa que o cliente pagou mandando um recado (*webhook*) pra um **endereço de servidor**. Navegador não tem endereço fixo |
| **Frete real (Melhor Envio)** | O token dá acesso total à conta. No navegador, está à vista de todos |

### ✅ A boa notícia: metade do caminho já está andada

Existe uma função de servidor **funcionando** no projeto:

```
supabase/functions/send-order-email/   → envia e-mail de pedido (via Resend)
```

O padrão está provado. Não é começar do zero — é **repetir o que já funciona**.

**Decisão técnica:** o "servidor" do projeto serão as **Supabase Edge Functions**.
Nada de contratar outro provedor, outra hospedagem, outra conta. Fica tudo no Supabase
que você já paga (e hoje nem paga).

---

## 🧾 NOTA FISCAL — minha recomendação

### A armadilha específica de gráfica

Material impresso personalizado vive numa **zona cinzenta** entre dois impostos:

- **ICMS** (estadual) → emite **NF-e** — quando é tratado como *produto/mercadoria*
- **ISS** (municipal) → emite **NFS-e** — quando é tratado como *serviço de impressão*

Depende do produto, do município e do entendimento do contador. **Uma gráfica pode
precisar dos dois.** Quem decide é o contador do cliente, não você e nem eu.

👉 **Consequência de projeto:** o sistema **tem que suportar NF-e e NFS-e**, e deixar cada
loja configurar qual usa em qual produto. Se você escolher uma solução que só faz NF-e,
bate no muro no primeiro cliente cujo contador disser "aqui é ISS".

### Por que NÃO integrar com ERP (Bling / Tiny / Omie)

| Problema | Impacto |
|---|---|
| Cada gráfica precisaria assinar o ERP | Custo extra pro **seu** cliente, atrito na venda |
| O Bling também vende loja virtual | Você depende de um **concorrente** |
| Integração é por conta de cada cliente | Cada instalação vira um suporte diferente |

### ✅ Recomendação: API especializada em nota, com o código desacoplado

Serviços que emitem nota **em nome de várias empresas** (multi-CNPJ) — que é exatamente
o caso de um SaaS. Você manda os dados do pedido, eles assinam e emitem.

**Candidatos:** Focus NFe · eNotas · NFe.io

**Minha escolha inicial: Focus NFe** — cobre NF-e **e** NFS-e em muitos municípios,
API direta, preço por documento emitido, documentação boa.

**Mas construa desacoplado.** Uma camada só sua no meio:

```
seu sistema → [camada de nota fiscal] → Focus NFe
                                      ↘ (trocável por eNotas depois)
```

Assim, se o preço subir ou a cobertura do município do cliente falhar, você troca o
fornecedor sem reescrever o sistema.

### 🔐 Regra de ouro do certificado

**O certificado digital de cada gráfica fica guardado NO FORNECEDOR, nunca no seu banco.**

Se você guardar certificado de cliente, você assume responsabilidade jurídica sobre a
identidade fiscal dele. Não vale a pena. Deixe essa batata quente com quem é
especializado e segurado pra isso.

### ⚠️ Confirme antes de fechar

Meu conhecimento tem data de corte. **Antes de contratar, confirme preço por nota,
cobertura de NFS-e no seu município e no dos primeiros clientes, e se há mensalidade
mínima.** Posso pesquisar isso pra você quando chegarmos nessa etapa.

---

## 🗺️ AS ETAPAS

### ETAPA 0 — Limpar a mesa 🔴 *(antes de tudo)*

*Não dá pra construir em cima de coisa quebrada.*

- [ ] Rodar os 4 SQLs pendentes (agora dá — o banco voltou)
- [ ] **Resolver as 6 tabelas fantasma** — criar as que fazem falta, apagar o código das que não
- [ ] Testar o painel inteiro e listar o que quebra *(a "Fase 2" do outro guia)*
- [ ] Revogar o token do Melhor Envio exposto e tirar do `config.js`
- [ ] Decidir o destino de `orders` / `order_items` (vazias, do varejo morto)

**Resultado:** você sabe exatamente o que funciona. Sem isso, todo bug novo se confunde com bug velho.

---

### ETAPA 1 — A fundação multi-loja 🔴 *(a obra pesada)*

*Invisível na tela. Destrava tudo.*

- [ ] Criar a tabela `lojas` (nome, CNPJ, subdomínio, plano, status)
- [ ] Criar `loja_membros` (quem trabalha em qual loja, com qual papel)
- [ ] Adicionar `loja_id` nas **11 tabelas** que têm dado
- [ ] **Marca Viva vira a loja nº 1** — todos os 24 pedidos, 19 produtos e 8 clientes atuais passam a ser dela
- [ ] Ligar **RLS por loja** — o banco passa a recusar, sozinho, ler dado de outra loja
- [ ] Ajustar as consultas do sistema pra filtrar por loja

> 🔒 **Esta é a etapa mais perigosa do projeto inteiro.** Um erro aqui vaza dado de uma
> gráfica pra outra. A proteção tem que estar **no banco (RLS)**, não só no JavaScript —
> porque JavaScript o cliente consegue burlar. Quando chegarmos aqui, vamos com calma
> e com teste de verdade.

---

### ETAPA 2 — Sua loja rodando de verdade 🟠

*Aqui você começa a usar pra valer e para de fazer no caderno.*

- [ ] **Frete configurável** — hoje R$ 20,00 está **escrito no código**. Tem que vir das Configurações
- [ ] **Mercado Pago recebendo** — Edge Function + webhook que confirma pagamento sozinho
- [ ] Corrigir o que a Etapa 0 revelou
- [ ] Cadastrar seus produtos reais, com foto boa
- [ ] **Vender de verdade por 2 a 4 semanas** ← esta linha é a mais importante do documento

> 💡 **Por que vender antes de continuar construindo:** você vai descobrir 10 coisas que
> nenhum planejamento acharia. É a diferença entre um sistema que parece bom e um que
> funciona numa gráfica de verdade.

---

### ETAPA 3 — Nota fiscal 🟠

- [ ] Contratar o fornecedor (confirmar preço e cobertura antes)
- [ ] Edge Function de emissão, com a camada desacoplada
- [ ] Suporte a **NF-e e NFS-e**
- [ ] Cada loja configura: regime, CNAE, ISS ou ICMS, série
- [ ] Emitir suas primeiras notas reais na Marca Viva

---

### ETAPA 4 — Frete real 🟡

- [ ] Melhor Envio via Edge Function — **token no servidor, por loja**
- [ ] Manter os modos simples (fixo / grátis / retirada) como opção
- [ ] Cada gráfica escolhe: cálculo real ou tabela própria

> Muita gráfica pequena **prefere** frete fixo. O cálculo real é diferencial, não obrigação.

---

### ETAPA 5 — Virar produto 🟢

*Só depois que a Marca Viva estiver vendendo com nota e pagamento automático.*

- [ ] Cadastro de nova gráfica (onboarding sozinho, sem você)
- [ ] Subdomínio por loja (`grafica-tal.seusistema.com.br`)
- [ ] Personalização visual: logo, cores, domínio próprio
- [ ] **Seu painel de dono**: quantas lojas, quem paga, quem está usando
- [ ] Cobrança recorrente das mensalidades
- [ ] Primeira gráfica-cliente — de preferência **alguém que você conhece** e tolera problema

---

## ⚠️ A DÍVIDA QUE VAI TE MORDER

### `admin/js/admin.js` — 285 KB num arquivo só

Hoje já é proibido editar à mão (regra do próprio projeto). Num produto que vai receber
funcionalidade toda semana, isso deixa de ser inconveniente e vira **trava**.

**Não precisa mexer agora.** Mas coloque no radar: em algum ponto entre a Etapa 2 e a 5,
esse arquivo precisa ser quebrado em pedaços. Quanto mais tarde, mais caro.

### Arquivos duplicados

Existe `admin/js/produto.js` **e** `scripts/pages/produto.js`. Idem checkout, profile,
orders. Ninguém sabe qual está valendo — e um dia alguém corrige o bug no arquivo errado.

---

## 🎯 O QUE FAZER NA PRÓXIMA SESSÃO

```
1. Rodar os 4 SQLs pendentes            ← 10 min, agora dá
2. Caçar as 6 tabelas fantasma          ← eu faço, você confere
3. Testar o painel e listar os erros    ← você, com F12 aberto
```

Só isso. Depois disso a gente ataca a fundação multi-loja com o terreno limpo.

---

## 💬 SINCERIDADE SOBRE PRAZO

O que você está querendo construir é **um produto de software**, não um site. É um
caminho de **meses**, não de semanas — e a maior parte do trabalho é invisível pra quem
olha a tela.

A ordem que você escolheu é a certa justamente por isso: **sua loja vendendo primeiro**
significa que você tem retorno e aprendizado real enquanto a fundação é construída,
em vez de passar meses construindo pra um cliente que ainda não existe.
